const { v4: uuidv4 } = require("uuid");
const { reqBody, userFromSession, multiUserMode } = require("../utils/http");
const { Workspace } = require("../models/workspace");
const { chatWithWorkspace } = require("../utils/chats");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { WorkspaceChats } = require("../models/workspaceChats");
const { SystemSettings } = require("../models/systemSettings");
const { Telemetry } = require("../models/telemetry");
const {
  streamChatWithWorkspace,
  writeResponseChunk,
} = require("../utils/chats/stream");

function chatEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/stream-chat",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug } = request.params;
        const { message, mode = "query" } = reqBody(request);

        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();

        if (multiUserMode(response) && user.role !== "admin") {
          const limitMessagesSetting = await SystemSettings.get({
            label: "limit_user_messages",
          });
          const limitMessages = limitMessagesSetting?.value === "true";

          if (limitMessages) {
            const messageLimitSetting = await SystemSettings.get({
              label: "message_limit",
            });
            const systemLimit = Number(messageLimitSetting?.value);

            if (!!systemLimit) {
              const currentChatCount = await WorkspaceChats.count({
                user_id: user.id,
                createdAt: {
                  gte: new Date(new Date() - 24 * 60 * 60 * 1000),
                },
              });

              if (currentChatCount >= systemLimit) {
                writeResponseChunk(response, {
                  id: uuidv4(),
                  type: "abort",
                  textResponse: null,
                  sources: [],
                  close: true,
                  error: `You have met your maximum 24 hour chat quota of ${systemLimit} chats set by the instance administrators. Try again later.`,
                });
                return;
              }
            }
          }
        }

        await streamChatWithWorkspace(response, workspace, message, mode, user);
        await Telemetry.sendTelemetry("sent_chat", {
          multiUserMode: multiUserMode(response),
          LLMSelection: process.env.LLM_PROVIDER || "openai",
          VectorDbSelection: process.env.VECTOR_DB || "pinecone",
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

  app.post(
    "/workspace/:slug/chat",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug } = request.params;
        const { message, mode = "query" } = reqBody(request);

        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        if (multiUserMode(response) && user.role !== "admin") {
          const limitMessagesSetting = await SystemSettings.get({
            label: "limit_user_messages",
          });
          const limitMessages = limitMessagesSetting?.value === "true";

          if (limitMessages) {
            const messageLimitSetting = await SystemSettings.get({
              label: "message_limit",
            });
            const systemLimit = Number(messageLimitSetting?.value);

            if (!!systemLimit) {
              const currentChatCount = await WorkspaceChats.count({
                user_id: user.id,
                createdAt: {
                  gte: new Date(new Date() - 24 * 60 * 60 * 1000),
                },
              });

              if (currentChatCount >= systemLimit) {
                response.status(500).json({
                  id: uuidv4(),
                  type: "abort",
                  textResponse: null,
                  sources: [],
                  close: true,
                  error: `You have met your maximum 24 hour chat quota of ${systemLimit} chats set by the instance administrators. Try again later.`,
                });
                return;
              }
            }
          }
        }

        const result = await chatWithWorkspace(workspace, message, mode, user);
        await Telemetry.sendTelemetry(
          "sent_chat",
          {
            multiUserMode: multiUserMode(response),
            LLMSelection: process.env.LLM_PROVIDER || "openai",
            VectorDbSelection: process.env.VECTOR_DB || "pinecone",
          },
          user?.id
        );
        response.status(200).json({ ...result });
      } catch (e) {
        console.error(e);
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
}

module.exports = { chatEndpoints };
