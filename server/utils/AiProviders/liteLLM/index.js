const { NativeEmbedder } = require("../../EmbeddingEngines/native");
const {
  writeResponseChunk,
  clientAbortedHandler,
} = require("../../helpers/chat/responses");

class LiteLLM {
  constructor(embedder = null, modelPreference = null) {
    const { OpenAI: OpenAIApi } = require("openai");
    if (!process.env.LITE_LLM_BASE_PATH)
      throw new Error(
        "LiteLLM must have a valid base path to use for the api."
      );

    this.basePath = process.env.LITE_LLM_BASE_PATH;
    this.openai = new OpenAIApi({
      baseURL: this.basePath,
      apiKey: process.env.LITE_LLM_API_KEY ?? null,
    });
    this.model = modelPreference ?? process.env.LITE_LLM_MODEL_PREF ?? null;
    this.maxTokens = process.env.LITE_LLM_MODEL_TOKEN_LIMIT ?? 1024;
    if (!this.model) throw new Error("LiteLLM must have a valid model set.");
    this.limits = {
      history: this.promptWindowLimit() * 0.15,
      system: this.promptWindowLimit() * 0.15,
      user: this.promptWindowLimit() * 0.7,
    };

    this.embedder = embedder ?? new NativeEmbedder();
    this.defaultTemp = 0.7;
    this.log(`Inference API: ${this.basePath} Model: ${this.model}`);
  }

  log(text, ...args) {
    console.log(`\x1b[36m[${this.constructor.name}]\x1b[0m ${text}`, ...args);
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

  streamingEnabled() {
    return "streamGetChatCompletion" in this;
  }

  // Ensure the user set a value for the token limit
  // and if undefined - assume 4096 window.
  promptWindowLimit() {
    const limit = process.env.LITE_LLM_MODEL_TOKEN_LIMIT || 4096;
    if (!limit || isNaN(Number(limit)))
      throw new Error("No token context limit was set.");
    return Number(limit);
  }

  // Short circuit since we have no idea if the model is valid or not
  // in pre-flight for generic endpoints
  isValidChatCompletionModel(_modelName = "") {
    return true;
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

  async getChatCompletion(messages = null, { temperature = 0.7 }) {
    const result = await this.openai.chat.completions
      .create({
        model: this.model,
        messages,
        temperature,
        max_tokens: parseInt(this.maxTokens), // LiteLLM requires int
      })
      .catch((e) => {
        throw new Error(e.response.data.error.message);
      });

    if (!result.hasOwnProperty("choices") || result.choices.length === 0)
      return null;
    return result.choices[0].message.content;
  }

  async streamGetChatCompletion(messages = null, { temperature = 0.7 }) {
    const streamRequest = await this.openai.chat.completions.create({
      model: this.model,
      stream: true,
      messages,
      temperature,
      max_tokens: parseInt(this.maxTokens), // LiteLLM requires int
    });
    return streamRequest;
  }

  handleStream(response, stream, responseProps) {
    const { uuid = uuidv4(), sources = [] } = responseProps;

    return new Promise(async (resolve) => {
      let fullText = "";

      const handleAbort = () => clientAbortedHandler(resolve, fullText);
      response.on("close", handleAbort);

      for await (const chunk of stream) {
        const message = chunk?.choices?.[0];
        const token = message?.delta?.content;

        if (token) {
          fullText += token;
          writeResponseChunk(response, {
            uuid,
            sources: [],
            type: "textResponseChunk",
            textResponse: token,
            close: false,
            error: false,
          });
        }

        // LiteLLM does not give a finish reason in stream until the final chunk
        if (message.finish_reason || message.finish_reason === "stop") {
          writeResponseChunk(response, {
            uuid,
            sources,
            type: "textResponseChunk",
            textResponse: "",
            close: true,
            error: false,
          });
          response.removeListener("close", handleAbort);
          resolve(fullText);
        }
      }
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
  LiteLLM,
};
