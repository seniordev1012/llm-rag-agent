const fs = require("fs");
const path = require("path");
const { default: slugify } = require("slugify");
const { v4 } = require("uuid");
const UrlPattern = require("url-pattern");
const { writeToServerDocuments } = require("../../files");
const { tokenizeString } = require("../../tokenizer");
const {
  ConfluencePagesLoader,
} = require("langchain/document_loaders/web/confluence");

async function loadConfluence({ pageUrl, username, accessToken }) {
  if (!pageUrl || !username || !accessToken) {
    return {
      success: false,
      reason:
        "You need either a username and access token, or a personal access token (PAT), to use the Confluence connector.",
    };
  }

  const { valid, result } = validSpaceUrl(pageUrl);
  if (!valid) {
    return {
      success: false,
      reason:
        "Confluence space URL is not in the expected format of one of https://domain.atlassian.net/wiki/space/~SPACEID/* or https://customDomain/wiki/space/~SPACEID/* or https://customDomain/display/~SPACEID/*",
    };
  }

  const { apiBase: baseUrl, spaceKey, subdomain } = result;
  console.log(`-- Working Confluence ${baseUrl} --`);
  const loader = new ConfluencePagesLoader({
    baseUrl,
    spaceKey,
    username,
    accessToken,
  });

  const { docs, error } = await loader
    .load()
    .then((docs) => {
      return { docs, error: null };
    })
    .catch((e) => {
      return {
        docs: [],
        error: e.message?.split("Error:")?.[1] || e.message,
      };
    });

  if (!docs.length || !!error) {
    return {
      success: false,
      reason: error ?? "No pages found for that Confluence space.",
    };
  }
  const outFolder = slugify(
    `${subdomain}-confluence-${v4().slice(0, 4)}`
  ).toLowerCase();

  const outFolderPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(
          __dirname,
          `../../../../server/storage/documents/${outFolder}`
        )
      : path.resolve(process.env.STORAGE_DIR, `documents/${outFolder}`);

  if (!fs.existsSync(outFolderPath))
    fs.mkdirSync(outFolderPath, { recursive: true });

  docs.forEach((doc) => {
    if (!doc.pageContent) return;

    const data = {
      id: v4(),
      url: doc.metadata.url + ".page",
      title: doc.metadata.title || doc.metadata.source,
      docAuthor: subdomain,
      description: doc.metadata.title,
      docSource: `${subdomain} Confluence`,
      chunkSource: `confluence://${doc.metadata.url}`,
      published: new Date().toLocaleString(),
      wordCount: doc.pageContent.split(" ").length,
      pageContent: doc.pageContent,
      token_count_estimate: tokenizeString(doc.pageContent).length,
    };

    console.log(
      `[Confluence Loader]: Saving ${doc.metadata.title} to ${outFolder}`
    );
    writeToServerDocuments(
      data,
      `${slugify(doc.metadata.title)}-${data.id}`,
      outFolderPath
    );
  });

  return {
    success: true,
    reason: null,
    data: {
      spaceKey,
      destination: outFolder,
    },
  };
}

/**
 * A match result for a url-pattern of a Confluence URL
 * @typedef {Object} ConfluenceMatchResult
 * @property {string} subdomain - the subdomain of an organization's Confluence space
 * @property {string} spaceKey - the spaceKey of an organization that determines the documents to collect.
 * @property {string} apiBase - the correct REST API url to use for loader.
 */

/**
 * Generates the correct API base URL for interfacing with the Confluence REST API
 * depending on the URL pattern being used since there are various ways to host/access a
 * Confluence space.
 * @param {ConfluenceMatchResult} matchResult - result from `url-pattern`.match
 * @param {boolean} isCustomDomain - determines if we need to coerce the subpath of the provided URL
 * @returns {string} - the resulting REST API URL
 */
function generateAPIBaseUrl(matchResult = {}, isCustomDomain = false) {
  const { subdomain } = matchResult;
  let subpath = isCustomDomain ? `` : `/wiki`;
  if (isCustomDomain) return `https://${customDomain}${subpath}`;
  return `https://${subdomain}.atlassian.net${subpath}`;
}

/**
 * Validates and parses the correct information from a given Confluence URL
 * @param {string} spaceUrl - The organization's Confluence URL to parse
 * @returns {{
 *  valid: boolean,
 *  result: (ConfluenceMatchResult|null),
 * }}
 */
function validSpaceUrl(spaceUrl = "") {
  let matchResult;
  const patterns = {
    default: new UrlPattern(
      "https\\://(:subdomain).atlassian.net/wiki/spaces/(:spaceKey)*"
    ),
    subdomain: new UrlPattern(
      "https\\://(:subdomain.):domain.:tld/wiki/spaces/(:spaceKey)*"
    ),
    custom: new UrlPattern(
      "https\\://(:subdomain.):domain.:tld/display/(:spaceKey)*"
    ),
  };

  // If using the default Atlassian Confluence URL pattern.
  // We can proceed because the Library/API can use this base url scheme.
  matchResult = patterns.default.match(spaceUrl);
  if (matchResult)
    return {
      valid: matchResult.hasOwnProperty("spaceKey"),
      result: {
        ...matchResult,
        apiBase: generateAPIBaseUrl(matchResult),
      },
    };

  // If using a custom subdomain Confluence URL pattern.
  // We need to attach the customDomain as a property to the match result
  // so we can form the correct REST API base from the subdomain.
  matchResult = patterns.subdomain.match(spaceUrl);
  if (matchResult) {
    return {
      valid: matchResult.hasOwnProperty("spaceKey"),
      result: {
        ...matchResult,
        apiBase: generateAPIBaseUrl(matchResult),
      },
    };
  }

  // If using a base FQDN Confluence URL pattern.
  // We need to attach the customDomain as a property to the match result
  // so we can form the correct REST API base from the root domain since /display/ is basically a URL mask.
  matchResult = patterns.custom.match(spaceUrl);
  if (matchResult) {
    return {
      valid: matchResult.hasOwnProperty("spaceKey"),
      result: {
        ...matchResult,
        apiBase: generateAPIBaseUrl(matchResult, true),
      },
    };
  }

  // No match
  return { valid: false, result: null };
}

module.exports = loadConfluence;
