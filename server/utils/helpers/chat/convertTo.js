// Helpers that convert workspace chats to some supported format
// for external use by the user.

const { Workspace } = require("../../../models/workspace");
const { WorkspaceChats } = require("../../../models/workspaceChats");

async function convertToCSV(preparedData) {
  const rows = ["id,username,workspace,prompt,response,sent_at,rating"];
  for (const item of preparedData) {
    const record = [
      item.id,
      escapeCsv(item.username),
      escapeCsv(item.workspace),
      escapeCsv(item.prompt),
      escapeCsv(item.response),
      item.sent_at,
      item.feedback,
    ].join(",");
    rows.push(record);
  }
  return rows.join("\n");
}

async function convertToJSON(preparedData) {
  return JSON.stringify(preparedData, null, 4);
}

// ref: https://raw.githubusercontent.com/gururise/AlpacaDataCleaned/main/alpaca_data.json
async function convertToJSONAlpaca(preparedData) {
  return JSON.stringify(preparedData, null, 4);
}

async function convertToJSONL(workspaceChatsMap) {
  return Object.values(workspaceChatsMap)
    .map((workspaceChats) => JSON.stringify(workspaceChats))
    .join("\n");
}

async function prepareWorkspaceChatsForExport(format = "jsonl") {
  if (!exportMap.hasOwnProperty(format))
    throw new Error("Invalid export type.");

  const chats = await WorkspaceChats.whereWithData({}, null, null, {
    id: "asc",
  });

  if (format === "csv" || format === "json") {
    const preparedData = chats.map((chat) => {
      const responseJson = JSON.parse(chat.response);
      return {
        id: chat.id,
        username: chat.user ? chat.user.username : "unknown user",
        workspace: chat.workspace ? chat.workspace.name : "unknown workspace",
        prompt: chat.prompt,
        response: responseJson.text,
        sent_at: chat.createdAt,
        feedback:
          chat.feedbackScore === null
            ? "--"
            : chat.feedbackScore
              ? "GOOD"
              : "BAD",
      };
    });

    return preparedData;
  }

  if (format === "jsonAlpaca") {
    const preparedData = chats.map((chat) => {
      const responseJson = JSON.parse(chat.response);
      return {
        instruction: chat.prompt,
        input: "",
        output: responseJson.text,
      };
    });

    return preparedData;
  }

  const workspaceIds = [...new Set(chats.map((chat) => chat.workspaceId))];

  const workspacesWithPrompts = await Promise.all(
    workspaceIds.map((id) => Workspace.get({ id: Number(id) }))
  );

  const workspacePromptsMap = workspacesWithPrompts.reduce((acc, workspace) => {
    acc[workspace.id] = workspace.openAiPrompt;
    return acc;
  }, {});

  const workspaceChatsMap = chats.reduce((acc, chat) => {
    const { prompt, response, workspaceId } = chat;
    const responseJson = JSON.parse(response);

    if (!acc[workspaceId]) {
      acc[workspaceId] = {
        messages: [
          {
            role: "system",
            content:
              workspacePromptsMap[workspaceId] ||
              "Given the following conversation, relevant context, and a follow up question, reply with an answer to the current question the user is asking. Return only your response to the question given the above information following the users instructions as needed.",
          },
        ],
      };
    }

    acc[workspaceId].messages.push(
      {
        role: "user",
        content: prompt,
      },
      {
        role: "assistant",
        content: responseJson.text,
      }
    );

    return acc;
  }, {});

  return workspaceChatsMap;
}

const exportMap = {
  json: {
    contentType: "application/json",
    func: convertToJSON,
  },
  csv: {
    contentType: "text/csv",
    func: convertToCSV,
  },
  jsonl: {
    contentType: "application/jsonl",
    func: convertToJSONL,
  },
  jsonAlpaca: {
    contentType: "application/json",
    func: convertToJSONAlpaca,
  },
};

function escapeCsv(str) {
  return `"${str.replace(/"/g, '""').replace(/\n/g, " ")}"`;
}

async function exportChatsAsType(workspaceChatsMap, format = "jsonl") {
  const { contentType, func } = exportMap.hasOwnProperty(format)
    ? exportMap[format]
    : exportMap.jsonl;
  return {
    contentType,
    data: await func(workspaceChatsMap),
  };
}

module.exports = {
  prepareWorkspaceChatsForExport,
  exportChatsAsType,
};
