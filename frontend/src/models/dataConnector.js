import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import showToast from "@/utils/toast";

const DataConnector = {
  github: {
    branches: async ({ repo, accessToken }) => {
      return await fetch(`${API_BASE}/ext/github/branches`, {
        method: "POST",
        headers: baseHeaders(),
        cache: "force-cache",
        body: JSON.stringify({ repo, accessToken }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return res.data;
        })
        .then((data) => {
          return { branches: data?.branches || [], error: null };
        })
        .catch((e) => {
          console.error(e);
          showToast(e.message, "error");
          return { branches: [], error: e.message };
        });
    },
    collect: async function ({ repo, accessToken, branch, ignorePaths = [] }) {
      return await fetch(`${API_BASE}/ext/github/repo`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ repo, accessToken, branch, ignorePaths }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },
  youtube: {
    transcribe: async ({ url }) => {
      return await fetch(`${API_BASE}/ext/youtube/transcript`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ url }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (!res.success) throw new Error(res.reason);
          return { data: res.data, error: null };
        })
        .catch((e) => {
          console.error(e);
          return { data: null, error: e.message };
        });
    },
  },
};

export default DataConnector;
