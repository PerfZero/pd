const mapContractorFile = (file) => ({
  id: file.id,
  name: file.name || "Файл без названия",
  uploadedAt: file.uploadedAt || null,
  uploadedBy: file.uploadedBy || null,
});

const mapContractorDocument = (doc) => {
  const files = (doc.files || []).map(mapContractorFile);

  return {
    key: `doc-${doc.id}`,
    type: "document",
    id: doc.id,
    name: doc.name,
    description: doc.description,
    status: doc.status || "not_uploaded",
    isRequired: doc.isRequired,
    templateFileId: doc.templateFileId,
    contractorDocumentId: doc.contractorDocumentId,
    fileId: doc.fileId,
    files,
    fileCount: files.length,
    comment: doc.comment,
    uploadedBy: doc.uploadedBy,
    checkedBy: doc.checkedBy,
    checkedAt: doc.checkedAt,
  };
};

const mapContractorCategory = (category) => {
  const childCategories = category.children || [];
  const documents = (category.documents || []).map(mapContractorDocument);

  return {
    key: `cat-${category.id}`,
    type: "category",
    id: category.id,
    name: category.name,
    description: category.description,
    children: [...documents, ...childCategories.map(mapContractorCategory)],
  };
};

const buildContractorTree = (contractorCategories = []) =>
  contractorCategories.map(mapContractorCategory);

export default buildContractorTree;
