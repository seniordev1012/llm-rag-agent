const { NativeEmbedder } = require("../../EmbeddingEngines/native");
const { chatPrompt } = require("../../chats");
const { v4: uuidv4 } = require("uuid");
const { writeResponseChunk } = require("../../helpers/chat/responses");

function openRouterModels() {
  const { MODELS } = require("./models.js");
  return MODELS || {};
}

class OpenRouterLLM {
  constructor(embedder = null, modelPreference = null) {
    const { Configuration, OpenAIApi } = require("openai");
    if (!process.env.OPENROUTER_API_KEY)
      throw new Error("No OpenRouter API key was set.");

    const config = new Configuration({
      basePath: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseOptions: {
        headers: {
          "HTTP-Referer": "https://useanything.com",
          "X-Title": "AnythingLLM",
        },
      },
    });
    this.openai = new OpenAIApi(config);
    this.model =
      modelPreference || process.env.OPENROUTER_MODEL_PREF || "openrouter/auto";
    this.limits = {
      history: this.promptWindowLimit() * 0.15,
      system: this.promptWindowLimit() * 0.15,
      user: this.promptWindowLimit() * 0.7,
    };

    this.embedder = !embedder ? new NativeEmbedder() : embedder;
    this.defaultTemp = 0.7;
  }

  #appendContext(contextTexts = []) {
    if (!contextTexts || !contextTexts.length) return "";
    return (
      "\nContext:\n" +
      contextTexts
        .map((text, i) => {
          return `[CONTEXT ${i}]:\n${text}\n[END CONTEXT ${i}]\n\n`;
        })
        .join("")
    );
  }

  allModelInformation() {
    return openRouterModels();
  }

  streamingEnabled() {
    return "streamChat" in this && "streamGetChatCompletion" in this;
  }

  promptWindowLimit() {
    const availableModels = this.allModelInformation();
    return availableModels[this.model]?.maxLength || 4096;
  }

  async isValidChatCompletionModel(model = "") {
    const availableModels = this.allModelInformation();
    return availableModels.hasOwnProperty(model);
  }

  constructPrompt({
    systemPrompt = "",
    contextTexts = [],
    chatHistory = [],
    userPrompt = "",
  }) {
    const prompt = {
      role: "system",
      content: `${systemPrompt}${this.#appendContext(contextTexts)}`,
    };
    return [prompt, ...chatHistory, { role: "user", content: userPrompt }];
  }

  async isSafe(_input = "") {
    // Not implemented so must be stubbed
    return { safe: true, reasons: [] };
  }

  async sendChat(chatHistory = [], prompt, workspace = {}, rawHistory = []) {
    if (!(await this.isValidChatCompletionModel(this.model)))
      throw new Error(
        `OpenRouter chat: ${this.model} is not valid for chat completion!`
      );

    const textResponse = await this.openai
      .createChatCompletion({
        model: this.model,
        temperature: Number(workspace?.openAiTemp ?? this.defaultTemp),
        n: 1,
        messages: await this.compressMessages(
          {
            systemPrompt: chatPrompt(workspace),
            userPrompt: prompt,
            chatHistory,
          },
          rawHistory
        ),
      })
      .then((json) => {
        const res = json.data;
        if (!res.hasOwnProperty("choices"))
          throw new Error("OpenRouter chat: No results!");
        if (res.choices.length === 0)
          throw new Error("OpenRouter chat: No results length!");
        return res.choices[0].message.content;
      })
      .catch((error) => {
        throw new Error(
          `OpenRouter::createChatCompletion failed with: ${error.message}`
        );
      });

    return textResponse;
  }

  async streamChat(chatHistory = [], prompt, workspace = {}, rawHistory = []) {
    if (!(await this.isValidChatCompletionModel(this.model)))
      throw new Error(
        `OpenRouter chat: ${this.model} is not valid for chat completion!`
      );

    const streamRequest = await this.openai.createChatCompletion(
      {
        model: this.model,
        stream: true,
        temperature: Number(workspace?.openAiTemp ?? this.defaultTemp),
        n: 1,
        messages: await this.compressMessages(
          {
            systemPrompt: chatPrompt(workspace),
            userPrompt: prompt,
            chatHistory,
          },
          rawHistory
        ),
      },
      { responseType: "stream" }
    );
    return streamRequest;
  }

  async getChatCompletion(messages = null, { temperature = 0.7 }) {
    if (!(await this.isValidChatCompletionModel(this.model)))
      throw new Error(
        `OpenRouter chat: ${this.model} is not valid for chat completion!`
      );

    const { data } = await this.openai
      .createChatCompletion({
        model: this.model,
        messages,
        temperature,
      })
      .catch((e) => {
        throw new Error(e.response.data.error.message);
      });

    if (!data.hasOwnProperty("choices")) return null;
    return data.choices[0].message.content;
  }

  async streamGetChatCompletion(messages = null, { temperature = 0.7 }) {
    if (!(await this.isValidChatCompletionModel(this.model)))
      throw new Error(
        `OpenRouter chat: ${this.model} is not valid for chat completion!`
      );

    const streamRequest = await this.openai.createChatCompletion(
      {
        model: this.model,
        stream: true,
        messages,
        temperature,
      },
      { responseType: "stream" }
    );
    return streamRequest;
  }

  handleStream(response, stream, responseProps) {
    const timeoutThresholdMs = 500;
    const { uuid = uuidv4(), sources = [] } = responseProps;

    return new Promise((resolve) => {
      let fullText = "";
      let chunk = "";
      let lastChunkTime = null; // null when first token is still not received.

      // NOTICE: Not all OpenRouter models will return a stop reason
      // which keeps the connection open and so the model never finalizes the stream
      // like the traditional OpenAI response schema does. So in the case the response stream
      // never reaches a formal close state we maintain an interval timer that if we go >=timeoutThresholdMs with
      // no new chunks then we kill the stream and assume it to be complete. OpenRouter is quite fast
      // so this threshold should permit most responses, but we can adjust `timeoutThresholdMs` if
      // we find it is too aggressive.
      const timeoutCheck = setInterval(() => {
        if (lastChunkTime === null) return;

        const now = Number(new Date());
        const diffMs = now - lastChunkTime;
        if (diffMs >= timeoutThresholdMs) {
          console.log(
            `OpenRouter stream did not self-close and has been stale for >${timeoutThresholdMs}ms. Closing response stream.`
          );
          writeResponseChunk(response, {
            uuid,
            sources,
            type: "textResponseChunk",
            textResponse: "",
            close: true,
            error: false,
          });
          clearInterval(timeoutCheck);
          resolve(fullText);
        }
      }, 500);

      stream.data.on("data", (data) => {
        const lines = data
          ?.toString()
          ?.split("\n")
          .filter((line) => line.trim() !== "");

        for (const line of lines) {
          let validJSON = false;
          const message = chunk + line.replace(/^data: /, "");

          // JSON chunk is incomplete and has not ended yet
          // so we need to stitch it together. You would think JSON
          // chunks would only come complete - but they don't!
          try {
            JSON.parse(message);
            validJSON = true;
          } catch {}

          if (!validJSON) {
            // It can be possible that the chunk decoding is running away
            // and the message chunk fails to append due to string length.
            // In this case abort the chunk and reset so we can continue.
            // ref: https://github.com/Mintplex-Labs/anything-llm/issues/416
            try {
              chunk += message;
            } catch (e) {
              console.error(`Chunk appending error`, e);
              chunk = "";
            }
            continue;
          } else {
            chunk = "";
          }

          if (message == "[DONE]") {
            lastChunkTime = Number(new Date());
            writeResponseChunk(response, {
              uuid,
              sources,
              type: "textResponseChunk",
              textResponse: "",
              close: true,
              error: false,
            });
            clearInterval(timeoutCheck);
            resolve(fullText);
          } else {
            let finishReason = null;
            let token = "";
            try {
              const json = JSON.parse(message);
              token = json?.choices?.[0]?.delta?.content;
              finishReason = json?.choices?.[0]?.finish_reason || null;
            } catch {
              continue;
            }

            if (token) {
              fullText += token;
              lastChunkTime = Number(new Date());
              writeResponseChunk(response, {
                uuid,
                sources: [],
                type: "textResponseChunk",
                textResponse: token,
                close: false,
                error: false,
              });
            }

            if (finishReason !== null) {
              lastChunkTime = Number(new Date());
              writeResponseChunk(response, {
                uuid,
                sources,
                type: "textResponseChunk",
                textResponse: "",
                close: true,
                error: false,
              });
              clearInterval(timeoutCheck);
              resolve(fullText);
            }
          }
        }
      });
    });
  }

  // Simple wrapper for dynamic embedder & normalize interface for all LLM implementations
  async embedTextInput(textInput) {
    return await this.embedder.embedTextInput(textInput);
  }
  async embedChunks(textChunks = []) {
    return await this.embedder.embedChunks(textChunks);
  }

  async compressMessages(promptArgs = {}, rawHistory = []) {
    const { messageArrayCompressor } = require("../../helpers/chat");
    const messageArray = this.constructPrompt(promptArgs);
    return await messageArrayCompressor(this, messageArray, rawHistory);
  }
}

module.exports = {
  OpenRouterLLM,
  openRouterModels,
};
