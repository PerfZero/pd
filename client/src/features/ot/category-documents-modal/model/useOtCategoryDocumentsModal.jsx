import { useCallback, useMemo, useState } from "react";

const useOtCategoryDocumentsModal = ({ settingsDocumentsByCategory }) => {
  const [categoryDocumentsModalOpen, setCategoryDocumentsModalOpen] =
    useState(false);
  const [categoryDocumentsTarget, setCategoryDocumentsTarget] = useState(null);

  const categoryDocumentsList = useMemo(() => {
    if (!categoryDocumentsTarget?.id) return [];
    return (
      settingsDocumentsByCategory.get(String(categoryDocumentsTarget.id)) || []
    );
  }, [categoryDocumentsTarget, settingsDocumentsByCategory]);

  const handleOpenCategoryDocumentsModal = useCallback((category) => {
    setCategoryDocumentsTarget(category || null);
    setCategoryDocumentsModalOpen(true);
  }, []);

  const handleCloseCategoryDocumentsModal = useCallback(() => {
    setCategoryDocumentsModalOpen(false);
    setCategoryDocumentsTarget(null);
  }, []);

  return {
    categoryDocumentsModalOpen,
    categoryDocumentsTarget,
    categoryDocumentsList,
    handleOpenCategoryDocumentsModal,
    handleCloseCategoryDocumentsModal,
  };
};

export default useOtCategoryDocumentsModal;
