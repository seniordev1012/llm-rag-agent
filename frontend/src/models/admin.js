import { API_BASE } from "../utils/constants";
import { baseHeaders } from "../utils/request";

const Admin = {
  // User Management
  users: async () => {
    return await fetch(`${API_BASE}/admin/users`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.users || [])
      .catch((e) => {
        console.error(e);
        return [];
      });
  },
  newUser: async (data) => {
    return await fetch(`${API_BASE}/admin/users/new`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { user: null, error: e.message };
      });
  },
  updateUser: async (userId, data) => {
    return await fetch(`${API_BASE}/admin/user/${userId}`, {
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
  deleteUser: async (userId) => {
    return await fetch(`${API_BASE}/admin/user/${userId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  // Invitations
  invites: async () => {
    return await fetch(`${API_BASE}/admin/invites`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.invites || [])
      .catch((e) => {
        console.error(e);
        return [];
      });
  },
  newInvite: async () => {
    return await fetch(`${API_BASE}/admin/invite/new`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { invite: null, error: e.message };
      });
  },
  disableInvite: async (inviteId) => {
    return await fetch(`${API_BASE}/admin/invite/${inviteId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  // Workspaces Mgmt
  workspaces: async () => {
    return await fetch(`${API_BASE}/admin/workspaces`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.workspaces || [])
      .catch((e) => {
        console.error(e);
        return [];
      });
  },
  newWorkspace: async (name) => {
    return await fetch(`${API_BASE}/admin/workspaces/new`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ name }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { workspace: null, error: e.message };
      });
  },
  updateUsersInWorkspace: async (workspaceId, userIds = []) => {
    return await fetch(
      `${API_BASE}/admin/workspaces/${workspaceId}/update-users`,
      {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ userIds }),
      }
    )
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
  deleteWorkspace: async (workspaceId) => {
    return await fetch(`${API_BASE}/admin/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  // Workspace Chats Mgmt
  chats: async (offset = 0) => {
    return await fetch(`${API_BASE}/admin/workspace-chats`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ offset }),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return [];
      });
  },
  deleteChat: async (chatId) => {
    return await fetch(`${API_BASE}/admin/workspace-chats/${chatId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },

  // System Preferences
  systemPreferences: async () => {
    return await fetch(`${API_BASE}/admin/system-preferences`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return null;
      });
  },
  updateSystemPreferences: async (updates = {}) => {
    return await fetch(`${API_BASE}/admin/system-preferences`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(updates),
    })
      .then((res) => res.json())
      .catch((e) => {
        console.error(e);
        return { success: false, error: e.message };
      });
  },
};

export default Admin;
