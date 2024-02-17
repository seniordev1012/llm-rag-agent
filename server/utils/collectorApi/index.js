// When running locally will occupy the 0.0.0.0 hostname space but when deployed inside
// of docker this endpoint is not exposed so it is only on the Docker instances internal network
// so no additional security is needed on the endpoint directly. Auth is done however by the express
// middleware prior to leaving the node-side of the application so that is good enough >:)

class CollectorApi {
  constructor() {
    this.endpoint = "http://0.0.0.0:8888";
  }

  log(text, ...args) {
    console.log(`\x1b[36m[CollectorApi]\x1b[0m ${text}`, ...args);
  }

  async online() {
    return await fetch(this.endpoint)
      .then((res) => res.ok)
      .catch(() => false);
  }

  async acceptedFileTypes() {
    return await fetch(`${this.endpoint}/accepts`)
      .then((res) => {
        if (!res.ok) throw new Error("failed to GET /accepts");
        return res.json();
      })
      .then((res) => res)
      .catch((e) => {
        this.log(e.message);
        return null;
      });
  }

  async processDocument(filename = "") {
    if (!filename) return false;
    return await fetch(`${this.endpoint}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Response could not be completed");
        return res.json();
      })
      .then((res) => res)
      .catch((e) => {
        this.log(e.message);
        return { success: false, reason: e.message, documents: [] };
      });
  }

  async processLink(link = "") {
    if (!link) return false;

    return await fetch(`${this.endpoint}/process-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ link }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Response could not be completed");
        return res.json();
      })
      .then((res) => res)
      .catch((e) => {
        this.log(e.message);
        return { success: false, reason: e.message, documents: [] };
      });
  }

  async processRawText(textContent = "", metadata = {}) {
    return await fetch(`${this.endpoint}/process-raw-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ textContent, metadata }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Response could not be completed");
        return res.json();
      })
      .then((res) => res)
      .catch((e) => {
        this.log(e.message);
        return { success: false, reason: e.message, documents: [] };
      });
  }

  // We will not ever expose the document processor to the frontend API so instead we relay
  // all requests through the server. You can use this function to directly expose a specific endpoint
  // on the document processor.
  async forwardExtensionRequest({ endpoint, method, body }) {
    return await fetch(`${this.endpoint}${endpoint}`, {
      method,
      body, // Stringified JSON!
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Response could not be completed");
        return res.json();
      })
      .then((res) => res)
      .catch((e) => {
        this.log(e.message);
        return { success: false, data: {}, reason: e.message };
      });
  }
}

module.exports.CollectorApi = CollectorApi;
