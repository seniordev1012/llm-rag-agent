const { validURL } = require("../utils/url");
const { scrapeGenericUrl } = require("./convert/generic");

async function processLink(link) {
  if (!validURL(link)) return { success: false, reason: "Not a valid URL." };
  return await scrapeGenericUrl(link);
}

module.exports = {
  processLink,
};
