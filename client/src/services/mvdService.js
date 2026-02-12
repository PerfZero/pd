import api from "./api";

export const mvdService = {
  getMeta: async () => {
    const response = await api.get("/mvd/meta");
    return response.data;
  },

  check: async ({ type, params }) => {
    const response = await api.post("/mvd/check", {
      type,
      params,
    });
    return response.data;
  },
};

export default mvdService;
