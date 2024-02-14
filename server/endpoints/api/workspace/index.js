const { v4: uuidv4 } = require("uuid");
const { Document } = require("../../../models/documents");
const { Telemetry } = require("../../../models/telemetry");
const { DocumentVectors } = require("../../../models/vectors");
const { Workspace } = require("../../../models/workspace");
const { WorkspaceChats } = require("../../../models/workspaceChats");
const { chatWithWorkspace } = require("../../../utils/chats");
const { getVectorDbClass } = require("../../../utils/helpers");
const { multiUserMode, reqBody } = require("../../../utils/http");
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const {
  streamChatWithWorkspace,
  VALID_CHAT_MODE,
} = require("../../../utils/chats/stream");
const { EventLogs } = require("../../../models/eventLogs");
const {
  convertToChatHistory,
  writeResponseChunk,
} = require("../../../utils/helpers/chat/responses");

function apiWorkspaceEndpoints(app) {
  if (!app) return;

  app.post("/v1/workspace/new", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Workspaces']
    #swagger.description = 'Create a new workspace'
    #swagger.requestBody = {
      description: 'JSON object containing new display name of workspace.',
      required: true,
      type: 'object',
      content: {
        "application/json": {
          example: {
            name: "My New Workspace",
          }
        }
      }
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              workspace: {
                "id": 79,
                "name": "Sample workspace",
                "slug": "sample-workspace",
                "createdAt": "2023-08-17 00:45:03",
                "openAiTemp": null,
                "lastUpdatedAt": "2023-08-17 00:45:03",
                "openAiHistory": 20,
                "openAiPrompt": null
              },
              message: 'Workspace created'
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
    try {
      const { name = null } = reqBody(request);
      const { workspace, message } = await Workspace.new(name);
      await Telemetry.sendTelemetry("workspace_created", {
        multiUserMode: multiUserMode(response),
        LLMSelection: process.env.LLM_PROVIDER || "openai",
        Embedder: process.env.EMBEDDING_ENGINE || "inherit",
        VectorDbSelection: process.env.VECTOR_DB || "pinecone",
      });
      await EventLogs.logEvent("api_workspace_created", {
        workspaceName: workspace?.name || "Unknown Workspace",
      });
      response.status(200).json({ workspace, message });
    } catch (e) {
      console.log(e.message, e);
      response.sendStatus(500).end();
    }
  });

  app.get("/v1/workspaces", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Workspaces']
    #swagger.description = 'List all current workspaces'
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              workspaces: [
                {
                  "id": 79,
                  "name": "Sample workspace",
                  "slug": "sample-workspace",
                  "createdAt": "2023-08-17 00:45:03",
                  "openAiTemp": null,
                  "lastUpdatedAt": "2023-08-17 00:45:03",
                  "openAiHistory": 20,
                  "openAiPrompt": null
                }
              ],
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
    try {
      const workspaces = await Workspace.where();
      response.status(200).json({ workspaces });
    } catch (e) {
      console.log(e.message, e);
      response.sendStatus(500).end();
    }
  });

  app.get("/v1/workspace/:slug", [validApiKey], async (request, response) => {
    /*
    #swagger.tags = ['Workspaces']
    #swagger.description = 'Get a workspace by its unique slug.'
    #swagger.path = '/v1/workspace/{slug}'
    #swagger.parameters['slug'] = {
        in: 'path',
        description: 'Unique slug of workspace to find',
        required: true,
        type: 'string'
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              workspace: {
                "id": 79,
                "name": "My workspace",
                "slug": "my-workspace-123",
                "createdAt": "2023-08-17 00:45:03",
                "openAiTemp": null,
                "lastUpdatedAt": "2023-08-17 00:45:03",
                "openAiHistory": 20,
                "openAiPrompt": null,
                "documents": []
              }
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
    try {
      const { slug } = request.params;
      const workspace = await Workspace.get({ slug });
      response.status(200).json({ workspace });
    } catch (e) {
      console.log(e.message, e);
      response.sendStatus(500).end();
    }
  });

  app.delete(
    "/v1/workspace/:slug",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Workspaces']
    #swagger.description = 'Deletes a workspace by its slug.'
    #swagger.path = '/v1/workspace/{slug}'
    #swagger.parameters['slug'] = {
        in: 'path',
        description: 'Unique slug of workspace to delete',
        required: true,
        type: 'string'
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const { slug = "" } = request.params;
        const VectorDb = getVectorDbClass();
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        const workspaceId = Number(workspace.id);
        await WorkspaceChats.delete({ workspaceId: workspaceId });
        await DocumentVectors.deleteForWorkspace(workspaceId);
        await Document.delete({ workspaceId: workspaceId });
        await Workspace.delete({ id: workspaceId });

        await EventLogs.logEvent("api_workspace_deleted", {
          workspaceName: workspace?.name || "Unknown Workspace",
        });
        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          console.error(e.message);
        }
        response.sendStatus(200).end();
      } catch (e) {
        console.log(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/v1/workspace/:slug/update",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Workspaces']
    #swagger.description = 'Update workspace settings by its unique slug.'
    #swagger.path = '/v1/workspace/{slug}/update'
    #swagger.parameters['slug'] = {
        in: 'path',
        description: 'Unique slug of workspace to find',
        required: true,
        type: 'string'
    }
    #swagger.requestBody = {
      description: 'JSON object containing new settings to update a workspace. All keys are optional and will not update unless provided',
      required: true,
      type: 'object',
      content: {
        "application/json": {
          example: {
            "name": 'Updated Workspace Name',
            "openAiTemp": 0.2,
            "openAiHistory": 20,
            "openAiPrompt": "Respond to all inquires and questions in binary - do not respond in any other format."
          }
        }
      }
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              workspace: {
                "id": 79,
                "name": "My workspace",
                "slug": "my-workspace-123",
                "createdAt": "2023-08-17 00:45:03",
                "openAiTemp": null,
                "lastUpdatedAt": "2023-08-17 00:45:03",
                "openAiHistory": 20,
                "openAiPrompt": null,
                "documents": []
              },
              message: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const { slug = null } = request.params;
        const data = reqBody(request);
        const currWorkspace = await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        const { workspace, message } = await Workspace.update(
          currWorkspace.id,
          data
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        console.log(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/v1/workspace/:slug/chats",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Workspaces']
    #swagger.description = 'Get a workspaces chats regardless of user by its unique slug.'
    #swagger.path = '/v1/workspace/{slug}/chats'
    #swagger.parameters['slug'] = {
        in: 'path',
        description: 'Unique slug of workspace to find',
        required: true,
        type: 'string'
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              history: [
                {
                  "role": "user",
                  "content": "What is AnythingLLM?",
                  "sentAt": 1692851630
                },
                {
                  "role": "assistant",
                  "content": "AnythingLLM is a platform that allows you to convert notes, PDFs, and other source materials into a chatbot. It ensures privacy, cites its answers, and allows multiple people to interact with the same documents simultaneously. It is particularly useful for businesses to enhance the visibility and readability of various written communications such as SOPs, contracts, and sales calls. You can try it out with a free trial to see if it meets your business needs.",
                  "sources": [{"source": "object about source document and snippets used"}]
                }
              ]
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const { slug } = request.params;
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        const history = await WorkspaceChats.forWorkspace(workspace.id);
        response.status(200).json({ history: convertToChatHistory(history) });
      } catch (e) {
        console.log(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/v1/workspace/:slug/update-embeddings",
    [validApiKey],
    async (request, response) => {
      /*
    #swagger.tags = ['Workspaces']
    #swagger.description = 'Add or remove documents from a workspace by its unique slug.'
    #swagger.path = '/v1/workspace/{slug}/update-embeddings'
    #swagger.parameters['slug'] = {
        in: 'path',
        description: 'Unique slug of workspace to find',
        required: true,
        type: 'string'
    }
    #swagger.requestBody = {
      description: 'JSON object of additions and removals of documents to add to update a workspace. The value should be the folder + filename with the exclusions of the top-level documents path.',
      required: true,
      type: 'object',
      content: {
        "application/json": {
          example: {
            adds: ["custom-documents/my-pdf.pdf-hash.json"],
            deletes: ["custom-documents/anythingllm.txt-hash.json"]
          }
        }
      }
    }
    #swagger.responses[200] = {
      content: {
        "application/json": {
          schema: {
            type: 'object',
            example: {
              workspace: {
                "id": 79,
                "name": "My workspace",
                "slug": "my-workspace-123",
                "createdAt": "2023-08-17 00:45:03",
                "openAiTemp": null,
                "lastUpdatedAt": "2023-08-17 00:45:03",
                "openAiHistory": 20,
                "openAiPrompt": null,
                "documents": []
              },
              message: null,
            }
          }
        }
      }
    }
    #swagger.responses[403] = {
      schema: {
        "$ref": "#/definitions/InvalidAPIKey"
      }
    }
    */
      try {
        const { slug = null } = request.params;
        const { adds = [], deletes = [] } = reqBody(request);
        const currWorkspace = await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        await Document.removeDocuments(currWorkspace, deletes);
        await Document.addDocuments(currWorkspace, adds);
        const updatedWorkspace = await Workspace.get(
          `id = ${Number(currWorkspace.id)}`
        );
        response.status(200).json({ workspace: updatedWorkspace });
      } catch (e) {
        console.log(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/v1/workspace/:slug/chat",
    [validApiKey],
    async (request, response) => {
      /*
   #swagger.tags = ['Workspaces']
   #swagger.description = 'Execute a chat with a workspace'
   #swagger.requestBody = {
       description: 'Send a prompt to the workspace and the type of conversation (query or chat).<br/><b>Query:</b> Will not use LLM unless there are relevant sources from vectorDB & does not recall chat history.<br/><b>Chat:</b> Uses LLM general knowledge w/custom embeddings to produce output, uses rolling chat history.',
       required: true,
       type: 'object',
       content: {
         "application/json": {
           example: {
             message: "What is AnythingLLM?",
             mode: "query | chat"
           }
         }
       }
     }
   #swagger.responses[200] = {
     content: {
       "application/json": {
         schema: {
           type: 'object',
           example: {
              id: 'chat-uuid',
              type: "abort | textResponse",
              textResponse: "Response to your query",
              sources: [{title: "anythingllm.txt", chunk: "This is a context chunk used in the answer of the prompt by the LLM,"}],
              close: true,
              error: "null | text string of the failure mode."
           }
         }
       }
     }
   }
   #swagger.responses[403] = {
     schema: {
       "$ref": "#/definitions/InvalidAPIKey"
     }
   }
   */
      try {
        const { slug } = request.params;
        const { message, mode = "query" } = reqBody(request);
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: `Workspace ${slug} is not a valid workspace.`,
          });
          return;
        }

        if (!message?.length || !VALID_CHAT_MODE.includes(mode)) {
          response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: !message?.length
              ? "message parameter cannot be empty."
              : `${mode} is not a valid mode.`,
          });
          return;
        }

        const result = await chatWithWorkspace(workspace, message, mode);
        await Telemetry.sendTelemetry("sent_chat", {
          LLMSelection: process.env.LLM_PROVIDER || "openai",
          Embedder: process.env.EMBEDDING_ENGINE || "inherit",
          VectorDbSelection: process.env.VECTOR_DB || "pinecone",
        });
        await EventLogs.logEvent("api_sent_chat", {
          workspaceName: workspace?.name,
          chatModel: workspace?.chatModel || "System Default",
        });
        response.status(200).json({ ...result });
      } catch (e) {
        response.status(500).json({
          id: uuidv4(),
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: e.message,
        });
      }
    }
  );

  app.post(
    "/v1/workspace/:slug/stream-chat",
    [validApiKey],
    async (request, response) => {
      /*
   #swagger.tags = ['Workspaces']
   #swagger.description = 'Execute a streamable chat with a workspace'
   #swagger.requestBody = {
       description: 'Send a prompt to the workspace and the type of conversation (query or chat).<br/><b>Query:</b> Will not use LLM unless there are relevant sources from vectorDB & does not recall chat history.<br/><b>Chat:</b> Uses LLM general knowledge w/custom embeddings to produce output, uses rolling chat history.',
       required: true,
       type: 'object',
       content: {
         "application/json": {
           example: {
             message: "What is AnythingLLM?",
             mode: "query | chat"
           }
         }
       }
     }
   #swagger.responses[200] = {
     content: {
       "text/event-stream": {
         schema: {
           type: 'array',
           example: [
            {
              id: 'uuid-123',
              type: "abort | textResponseChunk",
              textResponse: "First chunk",
              sources: [],
              close: false,
              error: "null | text string of the failure mode."
            },
            {
              id: 'uuid-123',
              type: "abort | textResponseChunk",
              textResponse: "chunk two",
              sources: [],
              close: false,
              error: "null | text string of the failure mode."
            },
             {
              id: 'uuid-123',
              type: "abort | textResponseChunk",
              textResponse: "final chunk of LLM output!",
              sources: [{title: "anythingllm.txt", chunk: "This is a context chunk used in the answer of the prompt by the LLM. This will only return in the final chunk."}],
              close: true,
              error: "null | text string of the failure mode."
            }
          ]
         }
       }
     }
   }
   #swagger.responses[403] = {
     schema: {
       "$ref": "#/definitions/InvalidAPIKey"
     }
   }
   */
      try {
        const { slug } = request.params;
        const { message, mode = "query" } = reqBody(request);
        const workspace = await Workspace.get({ slug });

        if (!workspace) {
          response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: `Workspace ${slug} is not a valid workspace.`,
          });
          return;
        }

        if (!message?.length || !VALID_CHAT_MODE.includes(mode)) {
          response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: !message?.length
              ? "Message is empty"
              : `${mode} is not a valid mode.`,
          });
          return;
        }

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();

        await streamChatWithWorkspace(response, workspace, message, mode);
        await Telemetry.sendTelemetry("sent_chat", {
          LLMSelection: process.env.LLM_PROVIDER || "openai",
          Embedder: process.env.EMBEDDING_ENGINE || "inherit",
          VectorDbSelection: process.env.VECTOR_DB || "pinecone",
        });
        await EventLogs.logEvent("api_sent_chat", {
          workspaceName: workspace?.name,
          chatModel: workspace?.chatModel || "System Default",
        });
        response.end();
      } catch (e) {
        console.error(e);
        writeResponseChunk(response, {
          id: uuidv4(),
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: e.message,
        });
        response.end();
      }
    }
  );
}

module.exports = { apiWorkspaceEndpoints };
