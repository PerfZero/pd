import { useCallback, useMemo } from "react";
import { Button, Space, Tooltip, Typography } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import groupDocumentsByCategory from "@/entities/ot/document/model/groupDocumentsByCategory";
import useOtCategoryDocumentsModal from "@/features/ot/category-documents-modal/model/useOtCategoryDocumentsModal";

const { Text } = Typography;

const useOtSettingsTree = ({
  settingsCategories,
  settingsDocuments,
  handleDeleteCategory,
  handleOpenCategoryModal,
  handleOpenDocumentModal,
}) => {
  const settingsDocumentsByCategory = useMemo(() => {
    return groupDocumentsByCategory(settingsDocuments || []);
  }, [settingsDocuments]);

  const {
    categoryDocumentsModalOpen,
    categoryDocumentsTarget,
    categoryDocumentsList,
    handleOpenCategoryDocumentsModal,
    handleCloseCategoryDocumentsModal,
  } = useOtCategoryDocumentsModal({ settingsDocumentsByCategory });

  const settingsCategoryTree = useMemo(() => {
    const stopTreeAction = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const countDocuments = (node) => {
      const ownDocs = (settingsDocumentsByCategory.get(String(node.id)) || [])
        .length;
      const childDocs = (node.children || []).reduce(
        (sum, child) => sum + countDocuments(child),
        0,
      );
      return ownDocs + childDocs;
    };

    const buildTree = (nodes) =>
      (nodes || []).map((node) => {
        const categoryChildren = buildTree(node.children || []);
        const ownDocumentsCount = (
          settingsDocumentsByCategory.get(String(node.id)) || []
        ).length;

        return {
          key: `cat-${node.id}`,
          categoryId: node.id,
          categoryName: node.name,
          title: (
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Space size={6}>
                <FolderOpenOutlined style={{ color: "#2f5fba" }} />
                <Text
                  strong
                  style={{
                    display: "inline-block",
                    maxWidth: "min(42vw, 360px)",
                    verticalAlign: "bottom",
                  }}
                  ellipsis={{ tooltip: node.name }}
                >
                  {node.name}
                </Text>
                {node.description && (
                  <Tooltip title={node.description}>
                    <InfoCircleOutlined />
                  </Tooltip>
                )}
                <Tooltip title="Количество документов в категории и подпунктах">
                  <Text type="secondary" style={{ whiteSpace: "nowrap" }}>
                    документов: {countDocuments(node)}
                  </Text>
                </Tooltip>
              </Space>
              <Space size={4} wrap>
                <Tooltip title="Добавить подкатегорию">
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={(event) => {
                      stopTreeAction(event);
                      handleOpenCategoryModal(null, node.id);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Добавить документ">
                  <Button
                    size="small"
                    icon={<FileAddOutlined />}
                    onClick={(event) => {
                      stopTreeAction(event);
                      handleOpenDocumentModal(null, node.id);
                    }}
                  >
                    Подгрузка документов
                  </Button>
                </Tooltip>
                <Button
                  size="small"
                  type="link"
                  style={{
                    width: 90,
                    justifyContent: "center",
                    paddingInline: 0,
                  }}
                  onClick={(event) => {
                    stopTreeAction(event);
                    handleOpenCategoryDocumentsModal(node);
                  }}
                >
                  Файлы: {ownDocumentsCount}
                </Button>
                <Tooltip title="Редактировать">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(event) => {
                      stopTreeAction(event);
                      handleOpenCategoryModal(node);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Удалить">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(event) => {
                      stopTreeAction(event);
                      handleDeleteCategory(node);
                    }}
                  />
                </Tooltip>
              </Space>
            </Space>
          ),
          children: categoryChildren,
        };
      });

    return buildTree(settingsCategories || []);
  }, [
    settingsCategories,
    settingsDocumentsByCategory,
    handleDeleteCategory,
    handleOpenCategoryDocumentsModal,
    handleOpenCategoryModal,
    handleOpenDocumentModal,
  ]);

  const handleSelectSettingsCategoryNode = useCallback(
    (treeNode) => {
      if (!treeNode?.categoryId) return;
      handleOpenCategoryDocumentsModal({
        id: treeNode.categoryId,
        name: treeNode.categoryName || "",
      });
    },
    [handleOpenCategoryDocumentsModal],
  );

  return {
    settingsCategoryTree,
    categoryDocumentsModalOpen,
    categoryDocumentsTarget,
    categoryDocumentsList,
    handleCloseCategoryDocumentsModal,
    handleSelectSettingsCategoryNode,
  };
};

export default useOtSettingsTree;
