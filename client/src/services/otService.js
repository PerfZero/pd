import api from "./api";

const buildFormData = (file, extra = {}) => {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};

const otService = {
  getCategories: (params) => api.get("/ot/categories", { params }),
  createCategory: (data) => api.post("/ot/categories", data),
  updateCategory: (id, data) => api.patch(`/ot/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/ot/categories/${id}`),
  reorderCategory: (id, data) => api.patch(`/ot/categories/${id}/order`, data),

  getDocuments: (params) => api.get("/ot/documents", { params }),
  createDocument: (data) => api.post("/ot/documents", data),
  updateDocument: (id, data) => api.patch(`/ot/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/ot/documents/${id}`),
  uploadDocumentTemplate: (id, file) =>
    api.post(`/ot/documents/${id}/template`, buildFormData(file), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  downloadDocumentTemplate: (id) => api.get(`/ot/documents/${id}/template`),

  getTemplates: (params) => api.get("/ot/templates", { params }),
  createTemplate: (file, data = {}) =>
    api.post("/ot/templates", buildFormData(file, data), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteTemplate: (id) => api.delete(`/ot/templates/${id}`),
  downloadTemplateFile: (id) => api.get(`/ot/templates/${id}/file`),

  getInstructions: () => api.get("/ot/instructions"),
  createInstruction: (file, data = {}) =>
    api.post("/ot/instructions", buildFormData(file, data), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateInstruction: (id, file = null, data = {}) =>
    api.patch(`/ot/instructions/${id}`, buildFormData(file, data), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteInstruction: (id) => api.delete(`/ot/instructions/${id}`),
  downloadInstructionFile: (id) => api.get(`/ot/instructions/${id}/file`),

  getContractorDocs: (params) => api.get("/ot/contractor-docs", { params }),
  uploadContractorDoc: (file, data = {}) =>
    api.post("/ot/contractor-docs", buildFormData(file, data), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  approveContractorDoc: (id) => api.post(`/ot/contractor-docs/${id}/approve`),
  rejectContractorDoc: (id, comment) =>
    api.post(`/ot/contractor-docs/${id}/reject`, { comment }),
  downloadContractorDocFile: (id, fileId = null) =>
    api.get(`/ot/contractor-docs/${id}/file`, {
      params: fileId ? { fileId } : {},
    }),
  getContractorDocFileView: (id, fileId) =>
    api.get(`/ot/contractor-docs/${id}/files/${fileId}/view`),
  deleteContractorDocFile: (id, fileId) =>
    api.delete(`/ot/contractor-docs/${id}/files/${fileId}`),

  getContractorStatuses: (params) =>
    api.get("/ot/contractor-status", { params }),
  getContractorStatusSummary: (params) =>
    api.get("/ot/contractor-status/summary", { params }),
  overrideContractorStatus: (counterpartyId, siteId, status) =>
    api.post(`/ot/contractor-status/${counterpartyId}/${siteId}/override`, {
      status,
    }),
  recalculateContractorStatus: (counterpartyId, siteId) =>
    api.post(`/ot/contractor-status/${counterpartyId}/${siteId}/recalculate`),

  getComments: (params) => api.get("/ot/comments", { params }),
  createComment: (data) => api.post("/ot/comments", data),
  updateComment: (id, data) => api.patch(`/ot/comments/${id}`, data),
  deleteComment: (id) => api.delete(`/ot/comments/${id}`),
};

export default otService;
