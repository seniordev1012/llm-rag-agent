const { verifyPayloadIntegrity } = require("../middleware/verifyIntegrity");
const { reqBody } = require("../utils/http");

function extensions(app) {
  if (!app) return;

  app.post(
    "/ext/github-repo",
    [verifyPayloadIntegrity],
    async function (request, response) {
      try {
        const loadGithubRepo = require("../utils/extensions/GithubRepo");
        const { success, reason, data } = await loadGithubRepo(
          reqBody(request)
        );
        response.status(200).json({
          success,
          reason,
          data,
        });
      } catch (e) {
        console.error(e);
        response.status(200).json({
          success: false,
          reason: e.message || "A processing error occurred.",
          data: {},
        });
      }
      return;
    }
  );

  // gets all branches for a specific repo
  app.post(
    "/ext/github-repo/branches",
    [verifyPayloadIntegrity],
    async function (request, response) {
      try {
        const GithubRepoLoader = require("../utils/extensions/GithubRepo/RepoLoader");
        const allBranches = await new GithubRepoLoader(
          reqBody(request)
        ).getRepoBranches();
        response.status(200).json({
          success: true,
          reason: null,
          data: {
            branches: allBranches,
          },
        });
      } catch (e) {
        console.error(e);
        response.status(400).json({
          success: false,
          reason: e.message,
          data: {
            branches: [],
          },
        });
      }
      return;
    }
  );

  app.post(
    "/ext/youtube-transcript",
    [verifyPayloadIntegrity],
    async function (request, response) {
      try {
        const loadYouTubeTranscript = require("../utils/extensions/YoutubeTranscript");
        const { success, reason, data } = await loadYouTubeTranscript(
          reqBody(request)
        );
        response.status(200).json({ success, reason, data });
      } catch (e) {
        console.error(e);
        response.status(400).json({
          success: false,
          reason: e.message,
          data: {
            title: null,
            author: null,
          },
        });
      }
      return;
    }
  );

  app.post(
    "/ext/confluence",
    [verifyPayloadIntegrity],
    async function (request, response) {
      try {
        const loadConfluence = require("../utils/extensions/Confluence");
        const { success, reason, data } = await loadConfluence(
          reqBody(request)
        );
        response.status(200).json({ success, reason, data });
      } catch (e) {
        console.error(e);
        response.status(400).json({
          success: false,
          reason: e.message,
          data: {
            title: null,
            author: null,
          },
        });
      }
      return;
    }
  );
}

module.exports = extensions;
