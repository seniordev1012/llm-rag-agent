import { API_BASE } from "../utils/constants";
import { baseHeaders } from "../utils/request";

const System = {
  ping: async function () {
    return await fetch(`${API_BASE}/ping`)
      .then((res) => res.json())
      .then((res) => res?.online || false)
      .catch(() => false);
  },
  totalIndexes: async function () {
    return await fetch(`${API_BASE}/system/system-vectors`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not find indexes.");
        return res.json();
      })
      .then((res) => res.vectorCount)
      .catch(() => 0);
  },
  keys: async function () {
    return await fetch(`${API_BASE}/setup-complete`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not find setup information.");
        return res.json();
      })
      .then((res) => res.results)
      .catch(() => null);
  },
  localFiles: async function () {
    return await fetch(`${API_BASE}/system/local-files`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not find setup information.");
        return res.json();
      })
      .then((res) => res.localFiles)
      .catch(() => null);
  },
  checkAuth: async function (currentToken = null) {
    return await fetch(`${API_BASE}/system/check-token`, {
      headers: baseHeaders(currentToken),
    })
      .then((res) => res.ok)
      .catch(() => false);
  },
  requestToken: async function (body) {
    return await fetch(`${API_BASE}/request-token`, {
      method: "POST",
      body: JSON.stringify({ ...body }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not validate login.");
        return res.json();
      })
      .then((res) => res)
      .catch((e) => {
        return { valid: false, message: e.message };
      });
  },
  checkDocumentProcessorOnline: async () => {
    return await fetch(`${API_BASE}/system/document-processing-status`, {
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch(() => false);
  },
  acceptedDocumentTypes: async () => {
    return await fetch(`${API_BASE}/system/accepted-document-types`, {
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.types)
      .catch(() => null);
  },
  updateSystem: async (data) => {
    return await fetch(`${API_BASE}/system/update-env`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { newValues: null, error: e.message };
      });
  },
  updateSystemPassword: async (data) => {
    return await fetch(`${API_BASE}/system/update-password`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  setupMultiUser: async (data) => {
    return await fetch(`${API_BASE}/system/enable-multi-user`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  deleteDocument: async (name, meta) => {
    return await fetch(`${API_BASE}/system/remove-document`, {
      method: "DELETE",
      headers: baseHeaders(),
      body: JSON.stringify({ name, meta }),
    })
      .then((res) => res.ok)
      .catch((e) => {
        console.error(e);
        return false;
      });
  },
  dataExport: async () => {
    return await fetch(`${API_BASE}/system/data-export`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res)
      .catch((e) => {
        console.error(e);
        return { filename: null, error: e.message };
      });
  },
  importData: async (formData) => {
    return await fetch(`${API_BASE}/system/data-import`, {
      method: "POST",
      body: formData,
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res)
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  uploadLogo: async function (formData) {
    return await fetch(`${API_BASE}/system/upload-logo`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error uploading logo.");
        return { success: true, error: null };
      })
      .catch((e) => {
        console.log(e);
        return { success: false, error: e.message };
      });
  },
  fetchLogo: async function (light = false) {
    return await fetch(`${API_BASE}/system/logo${light ? "/light" : ""}`, {
      method: "GET",
      cache: "no-cache",
    })
      .then((res) => {
        if (res.ok) return res.blob();
        throw new Error("Failed to fetch logo!");
      })
      .then((blob) => URL.createObjectURL(blob))
      .catch((e) => {
        console.log(e);
        return null;
      });
  },
  removeCustomLogo: async function () {
    return await fetch(`${API_BASE}/system/remove-logo`)
      .then((res) => {
        if (res.ok) return { success: true, error: null };
        throw new Error("Error removing logo!");
      })
      .catch((e) => {
        console.log(e);
        return { success: false, error: e.message };
      });
  },
  getWelcomeMessages: async function () {
    return await fetch(`${API_BASE}/system/welcome-messages`, {
      method: "GET",
      cache: "no-cache",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch welcome messages.");
        return res.json();
      })
      .then((res) => res.welcomeMessages)
      .catch((e) => {
        console.error(e);
        return null;
      });
  },
  setWelcomeMessages: async function (messages) {
    return fetch(`${API_BASE}/system/set-welcome-messages`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ messages }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.statusText || "Error setting welcome messages.");
        }
        return { success: true, ...res.json() };
      })
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  getApiKey: async function () {
    return fetch(`${API_BASE}/system/api-key`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.statusText || "Error fetching api key.");
        }
        return res.json();
      })
      .catch((e) => {
        console.error(e);
        return { apiKey: null, error: e.message };
      });
  },
  generateApiKey: async function () {
    return fetch(`${API_BASE}/system/generate-api-key`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.statusText || "Error generating api key.");
        }
        return res.json();
      })
      .catch((e) => {
        console.error(e);
        return { apiKey: null, error: e.message };
      });
  },
  deleteApiKey: async function () {
    return fetch(`${API_BASE}/system/api-key`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch((e) => {
        console.error(e);
        return false;
      });
  },
};

export default System;
