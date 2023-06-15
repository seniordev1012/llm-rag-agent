const lancedb = require("vectordb");
const { toChunks } = require("../../helpers");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { storeVectorResult, cachedVectorInformation } = require("../../files");
const { Configuration, OpenAIApi } = require("openai");
const { v4: uuidv4 } = require("uuid");

// Since we roll our own results for prompting we
// have to manually curate sources as well.
function curateLanceSources(sources = []) {
  const knownDocs = [];
  const documents = [];
  for (const source of sources) {
    const { text: _t, vector: _v, score: _s, ...metadata } = source;
    if (
      Object.keys(metadata).length > 0 &&
      !knownDocs.includes(metadata.title)
    ) {
      documents.push({ ...metadata });
      knownDocs.push(metadata.title);
    }
  }

  return documents;
}

const LanceDb = {
  uri: `${
    !!process.env.STORAGE_DIR ? `${process.env.STORAGE_DIR}/` : "./storage/"
  }lancedb`,
  name: "LanceDb",
  connect: async function () {
    if (process.env.VECTOR_DB !== "lancedb")
      throw new Error("LanceDB::Invalid ENV settings");

    const client = await lancedb.connect(this.uri);
    return { client };
  },
  heartbeat: async function () {
    await this.connect();
    return { heartbeat: Number(new Date()) };
  },
  totalIndicies: async function () {
    return 0; // Unsupported for LanceDB - so always zero
  },
  embeddingFunc: function () {
    return new lancedb.OpenAIEmbeddingFunction(
      "context",
      process.env.OPEN_AI_KEY
    );
  },
  embedder: function () {
    return new OpenAIEmbeddings({ openAIApiKey: process.env.OPEN_AI_KEY });
  },
  openai: function () {
    const config = new Configuration({ apiKey: process.env.OPEN_AI_KEY });
    const openai = new OpenAIApi(config);
    return openai;
  },
  embedChunk: async function (openai, textChunk) {
    const {
      data: { data },
    } = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: textChunk,
    });
    return data.length > 0 && data[0].hasOwnProperty("embedding")
      ? data[0].embedding
      : null;
  },
  getChatCompletion: async function (
    openai,
    messages = [],
    { temperature = 0.7 }
  ) {
    const model = process.env.OPEN_MODEL_PREF || "gpt-3.5-turbo";
    const { data } = await openai.createChatCompletion({
      model,
      messages,
      temperature,
    });

    if (!data.hasOwnProperty("choices")) return null;
    return data.choices[0].message.content;
  },
  namespace: async function (client, namespace = null) {
    if (!namespace) throw new Error("No namespace value provided.");
    const collection = await client.openTable(namespace).catch(() => false);
    if (!collection) return null;

    return {
      ...collection,
    };
  },
  updateOrCreateCollection: async function (client, data = [], namespace) {
    if (await this.hasNamespace(namespace)) {
      const collection = await client.openTable(namespace);
      await collection.add(data);
      return true;
    }

    await client.createTable(namespace, data);
    return true;
  },
  hasNamespace: async function (namespace = null) {
    if (!namespace) return false;
    const { client } = await this.connect();
    const exists = await this.namespaceExists(client, namespace);
    return exists;
  },
  namespaceExists: async function (client, namespace = null) {
    if (!namespace) throw new Error("No namespace value provided.");
    const collections = await client.tableNames();
    return collections.includes(namespace);
  },
  deleteVectorsInNamespace: async function (client, namespace = null) {
    const fs = require("fs");
    fs.rm(`${client.uri}/${namespace}.lance`, { recursive: true }, () => null);
    return true;
  },
  deleteDocumentFromNamespace: async function (_namespace, _docId) {
    console.error(
      `LanceDB:deleteDocumentFromNamespace - unsupported operation. No changes made to vector db.`
    );
    return false;
  },
  addDocumentToNamespace: async function (
    namespace,
    documentData = {},
    fullFilePath = null
  ) {
    const { DocumentVectors } = require("../../../models/vectors");
    try {
      const { pageContent, docId, ...metadata } = documentData;
      if (!pageContent || pageContent.length == 0) return false;

      console.log("Adding new vectorized document into namespace", namespace);
      const cacheResult = await cachedVectorInformation(fullFilePath);
      if (cacheResult.exists) {
        const { client } = await this.connect();
        const { chunks } = cacheResult;
        const documentVectors = [];
        const submissions = [];

        for (const chunk of chunks) {
          chunk.forEach((chunk) => {
            const id = uuidv4();
            const { id: _id, ...metadata } = chunk.metadata;
            documentVectors.push({ docId, vectorId: id });
            submissions.push({ id: id, vector: chunk.values, ...metadata });
          });
        }

        await this.updateOrCreateCollection(client, submissions, namespace);
        await DocumentVectors.bulkInsert(documentVectors);
        return true;
      }

      // If we are here then we are going to embed and store a novel document.
      // We have to do this manually as opposed to using LangChains `xyz.fromDocuments`
      // because we then cannot atomically control our namespace to granularly find/remove documents
      // from vectordb.
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 20,
      });
      const textChunks = await textSplitter.splitText(pageContent);

      console.log("Chunks created from document:", textChunks.length);
      const documentVectors = [];
      const vectors = [];
      const submissions = [];
      const openai = this.openai();

      for (const textChunk of textChunks) {
        const vectorValues = await this.embedChunk(openai, textChunk);

        if (!!vectorValues) {
          const vectorRecord = {
            id: uuidv4(),
            values: vectorValues,
            // [DO NOT REMOVE]
            // LangChain will be unable to find your text if you embed manually and dont include the `text` key.
            // https://github.com/hwchase17/langchainjs/blob/2def486af734c0ca87285a48f1a04c057ab74bdf/langchain/src/vectorstores/pinecone.ts#L64
            metadata: { ...metadata, text: textChunk },
          };

          vectors.push(vectorRecord);
          submissions.push({
            id: vectorRecord.id,
            vector: vectorRecord.values,
            ...vectorRecord.metadata,
          });
          documentVectors.push({ docId, vectorId: vectorRecord.id });
        } else {
          console.error(
            "Could not use OpenAI to embed document chunk! This document will not be recorded."
          );
        }
      }

      if (vectors.length > 0) {
        const chunks = [];
        for (const chunk of toChunks(vectors, 500)) chunks.push(chunk);

        console.log("Inserting vectorized chunks into LanceDB collection.");
        const { client } = await this.connect();
        await this.updateOrCreateCollection(client, submissions, namespace);
        await storeVectorResult(chunks, fullFilePath);
      }

      await DocumentVectors.bulkInsert(documentVectors);
      return true;
    } catch (e) {
      console.error("addDocumentToNamespace", e.message);
      return false;
    }
  },
  query: async function (reqBody = {}) {
    const { namespace = null, input, workspace = {} } = reqBody;
    if (!namespace || !input) throw new Error("Invalid request body");

    const { client } = await this.connect();
    if (!(await this.namespaceExists(client, namespace))) {
      return {
        response: null,
        sources: [],
        message: "Invalid query - no documents found for workspace!",
      };
    }

    // LanceDB does not have langchainJS support so we roll our own here.
    const queryVector = await this.embedChunk(this.openai(), input);
    const collection = await client.openTable(namespace);
    const relevantResults = await collection
      .search(queryVector)
      .metricType("cosine")
      .limit(2)
      .execute();
    const messages = [
      {
        role: "system",
        content: `The following is a friendly conversation between a human and an AI. The AI is very casual and talkative and responds with a friendly tone. If the AI does not know the answer to a question, it truthfully says it does not know.
      Relevant pieces of information for context of the current query:
      ${relevantResults.map((result) => result.text).join("\n\n")}`,
      },
      { role: "user", content: input },
    ];
    const responseText = await this.getChatCompletion(this.openai(), messages, {
      temperature: workspace?.openAiTemp,
    });

    return {
      response: responseText,
      sources: curateLanceSources(relevantResults),
      message: false,
    };
  },
  "namespace-stats": async function (reqBody = {}) {
    const { namespace = null } = reqBody;
    if (!namespace) throw new Error("namespace required");
    const { client } = await this.connect();
    if (!(await this.namespaceExists(client, namespace)))
      throw new Error("Namespace by that name does not exist.");
    const stats = await this.namespace(client, namespace);
    return stats
      ? stats
      : { message: "No stats were able to be fetched from DB for namespace" };
  },
  "delete-namespace": async function (reqBody = {}) {
    const { namespace = null } = reqBody;
    const { client } = await this.connect();
    if (!(await this.namespaceExists(client, namespace)))
      throw new Error("Namespace by that name does not exist.");

    await this.deleteVectorsInNamespace(client, namespace);
    return {
      message: `Namespace ${namespace} was deleted.`,
    };
  },
  reset: async function () {
    const { client } = await this.connect();
    const fs = require("fs");
    fs.rm(`${client.uri}`, { recursive: true }, () => null);
    return { reset: true };
  },
};

module.exports.LanceDb = LanceDb;
