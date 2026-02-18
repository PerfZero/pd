import { useState } from "react";
import { useExcelColumnSets } from "@/hooks/useExcelColumnSets";

export const useExcelColumnsModalSets = ({ columns, onUpdate }) => {
  const {
    columnSets,
    loading: setsLoading,
    createColumnSet,
    updateColumnSet,
    deleteColumnSet,
    setDefaultColumnSet,
  } = useExcelColumnSets();

  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState(null);

  const handleCreateSet = () => {
    setEditingSet(null);
    setIsFormModalVisible(true);
  };

  const handleEditSet = (set) => {
    setEditingSet(set);
    setIsFormModalVisible(true);
  };

  const handleSubmitSet = async (values) => {
    const setData = {
      name: values.name,
      columns,
      isDefault: values.isDefault || false,
    };

    if (editingSet) {
      await updateColumnSet(editingSet.id, setData);
    } else {
      await createColumnSet(setData);
    }

    setIsFormModalVisible(false);
    setEditingSet(null);
  };

  const handleApplySet = (set) => {
    if (set.columns && Array.isArray(set.columns)) {
      onUpdate(set.columns);
    }
  };

  const handleDeleteSet = async (id) => {
    await deleteColumnSet(id);
  };

  const handleSetDefault = async (id) => {
    await setDefaultColumnSet(id);
  };

  const handleUpdateSetColumns = async (set) => {
    await updateColumnSet(set.id, { columns });
  };

  const handleCloseFormModal = () => {
    setIsFormModalVisible(false);
    setEditingSet(null);
  };

  return {
    columnSets,
    setsLoading,
    isFormModalVisible,
    editingSet,
    handleCreateSet,
    handleEditSet,
    handleSubmitSet,
    handleApplySet,
    handleDeleteSet,
    handleSetDefault,
    handleUpdateSetColumns,
    handleCloseFormModal,
  };
};
