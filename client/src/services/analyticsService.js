import api from "./api";

const analyticsService = {
  getDashboard: async (params = {}) => {
    const response = await api.get("/analytics/dashboard", { params });
    return response.data;
  },

  getBySiteReport: async (params = {}) => {
    const response = await api.get("/analytics/reports/by-site", { params });
    return response.data;
  },

  exportBySiteExcel: async (params = {}) => {
    const response = await api.get("/analytics/reports/by-site/export/excel", {
      params,
      responseType: "blob",
    });
    return response;
  },

  getByContractorReport: async (params = {}) => {
    const response = await api.get("/analytics/reports/by-contractor", {
      params,
    });
    return response.data;
  },

  exportByContractorExcel: async (params = {}) => {
    const response = await api.get(
      "/analytics/reports/by-contractor/export/excel",
      {
        params,
        responseType: "blob",
      },
    );
    return response;
  },

  exportByContractorPdf: async (params = {}) => {
    const response = await api.get(
      "/analytics/reports/by-contractor/export/pdf",
      {
        params,
        responseType: "blob",
      },
    );
    return response;
  },

  getEmployeeReport: async (params = {}) => {
    const response = await api.get("/analytics/reports/employee", { params });
    return response.data;
  },

  exportEmployeeExcel: async (params = {}) => {
    const response = await api.get("/analytics/reports/employee/export/excel", {
      params,
      responseType: "blob",
    });
    return response;
  },

  getViolationsReport: async (params = {}) => {
    const response = await api.get("/analytics/reports/violations", { params });
    return response.data;
  },

  exportViolationsExcel: async (params = {}) => {
    const response = await api.get(
      "/analytics/reports/violations/export/excel",
      {
        params,
        responseType: "blob",
      },
    );
    return response;
  },
};

export default analyticsService;
