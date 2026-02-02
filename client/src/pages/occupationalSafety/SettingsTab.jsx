import { Space } from "antd";
import SettingsCategoriesCard from "@/pages/occupationalSafety/SettingsCategoriesCard";
import CategoryDocumentsCard from "@/pages/occupationalSafety/CategoryDocumentsCard";
import InstructionsCard from "@/pages/occupationalSafety/InstructionsCard";

const SettingsTab = ({
  settingsLoading,
  settingsCategoryTree,
  onOpenCategoryModal,
  categoryOptions,
  selectedCategoryId,
  onSelectCategory,
  selectCollapsedStyle,
  selectDropdownStyle,
  filteredDocuments,
  onDownloadTemplate,
  templateUploadingId,
  onTemplateUploadClick,
  onOpenDocumentModal,
  onDeleteDocument,
  latestInstruction,
  settingsInstructions,
  onOpenInstructionModal,
  onDownloadInstructionFile,
}) => (
  <Space direction="vertical" size={12} style={{ width: "100%" }}>
    <SettingsCategoriesCard
      loading={settingsLoading}
      treeData={settingsCategoryTree}
      onAddCategory={onOpenCategoryModal}
    />
    <CategoryDocumentsCard
      categoryOptions={categoryOptions}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={onSelectCategory}
      selectCollapsedStyle={selectCollapsedStyle}
      selectDropdownStyle={selectDropdownStyle}
      filteredDocuments={filteredDocuments}
      onDownloadTemplate={onDownloadTemplate}
      templateUploadingId={templateUploadingId}
      onTemplateUploadClick={onTemplateUploadClick}
      onOpenDocumentModal={onOpenDocumentModal}
      onDeleteDocument={onDeleteDocument}
    />
    <InstructionsCard
      latestInstruction={latestInstruction}
      settingsInstructions={settingsInstructions}
      onOpenInstructionModal={onOpenInstructionModal}
      onDownloadInstructionFile={onDownloadInstructionFile}
    />
  </Space>
);

export default SettingsTab;
