import { useCallback, useState } from "react";
import { Form, Modal, message } from "antd";
import otService from "@/services/otService";

const useOtSettingsCategoryActions = ({ loadSettingsData }) => {
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm] = Form.useForm();

  const handleOpenCategoryModal = useCallback(
    (category = null, defaultParentId = null) => {
      setEditingCategory(category);
      categoryForm.resetFields();
      if (category) {
        categoryForm.setFieldsValue({
          name: category.name,
          description: category.description,
          parentId: category.parentId || null,
          sortOrder: category.sortOrder ?? 0,
        });
      } else {
        categoryForm.setFieldsValue({
          parentId: defaultParentId,
          sortOrder: 0,
        });
      }
      setCategoryModalOpen(true);
    },
    [categoryForm],
  );

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editingCategory) {
        await otService.updateCategory(editingCategory.id, values);
        message.success("Категория обновлена");
      } else {
        await otService.createCategory(values);
        message.success("Категория создана");
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      await loadSettingsData();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Error saving OT category:", error);
      message.error("Ошибка при сохранении категории");
    }
  };

  const handleDeleteCategory = useCallback(
    (category) => {
      Modal.confirm({
        title: "Удалить категорию?",
        content:
          "Категория будет скрыта, документы и подкатегории останутся в базе.",
        okText: "Удалить",
        okType: "danger",
        cancelText: "Отмена",
        onOk: async () => {
          try {
            await otService.deleteCategory(category.id);
            message.success("Категория удалена");
            await loadSettingsData();
          } catch (error) {
            console.error("Error deleting OT category:", error);
            message.error("Ошибка при удалении категории");
          }
        },
      });
    },
    [loadSettingsData],
  );

  return {
    categoryModalOpen,
    editingCategory,
    setCategoryModalOpen,
    categoryForm,
    handleOpenCategoryModal,
    handleCategorySubmit,
    handleDeleteCategory,
  };
};

export default useOtSettingsCategoryActions;
