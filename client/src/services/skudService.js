import api from "./api";

export const skudService = {
  getAccessStates: async (params = {}) => {
    const response = await api.get("/skud/access", { params });
    return response.data;
  },

  grantAccess: async (payload) => {
    const response = await api.post("/skud/access/grant", payload);
    return response.data;
  },

  blockAccess: async (payload) => {
    const response = await api.post("/skud/access/block", payload);
    return response.data;
  },

  revokeAccess: async (payload) => {
    const response = await api.post("/skud/access/revoke", payload);
    return response.data;
  },

  deleteAccess: async (employeeId, payload = {}) => {
    const response = await api.delete(`/skud/access/${employeeId}`, {
      data: payload,
    });
    return response.data;
  },

  batchMutateAccess: async (payload) => {
    const response = await api.post("/skud/access/batch", payload);
    return response.data;
  },

  getEvents: async (params = {}) => {
    const response = await api.get("/skud/events", { params });
    return response.data;
  },

  getStats: async (params = {}) => {
    const response = await api.get("/skud/stats", { params });
    return response.data;
  },

  getCards: async (params = {}) => {
    const response = await api.get("/skud/cards", { params });
    return response.data;
  },

  registerCard: async (payload) => {
    const response = await api.post("/skud/cards/register", payload);
    return response.data;
  },

  bindCard: async (payload) => {
    const response = await api.post("/skud/cards/bind", payload);
    return response.data;
  },

  unbindCard: async (payload) => {
    const response = await api.post("/skud/cards/unbind", payload);
    return response.data;
  },

  blockCard: async (payload) => {
    const response = await api.post("/skud/cards/block", payload);
    return response.data;
  },

  allowCard: async (payload) => {
    const response = await api.post("/skud/cards/allow", payload);
    return response.data;
  },

  getQrTokens: async (params = {}) => {
    const response = await api.get("/skud/qr/tokens", { params });
    return response.data;
  },

  getQrDenies: async (params = {}) => {
    const response = await api.get("/skud/qr/denies", { params });
    return response.data;
  },

  generateQr: async (payload) => {
    const response = await api.post("/skud/qr/generate", payload);
    return response.data;
  },

  validateQr: async (payload) => {
    const response = await api.post("/skud/qr/validate", payload);
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get("/skud/settings");
    return response.data;
  },

  updateSettings: async (payload) => {
    const response = await api.put("/skud/settings", payload);
    return response.data;
  },

  checkSettings: async (payload = {}) => {
    const response = await api.post("/skud/settings/check", payload);
    return response.data;
  },

  getSyncJobs: async (params = {}) => {
    const response = await api.get("/skud/sync-jobs", { params });
    return response.data;
  },

  resyncEmployee: async (payload) => {
    const response = await api.post("/skud/resync", payload);
    return response.data;
  },
};
