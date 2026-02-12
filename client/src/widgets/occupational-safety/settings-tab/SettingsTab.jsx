import { Space } from "antd";
import SettingsCategoriesCard from "@/widgets/occupational-safety/settings-tree/SettingsCategoriesCard";
import InstructionsCard from "@/widgets/occupational-safety/instructions-card/InstructionsCard";

const SettingsTab = ({
  templateInputRef,
  onTemplateFileChange,
  settingsLoading,
  settingsCategoryTree,
  onSelectCategoryNode,
  onOpenCategoryModal,
  onOpenDocumentModal,
  latestInstruction,
  settingsInstructions,
  onOpenInstructionModal,
  onDownloadInstructionFile,
}) => (
  <Space direction="vertical" size={12} style={{ width: "100%" }}>
    <input
      ref={templateInputRef}
      type="file"
      style={{ display: "none" }}
      onChange={onTemplateFileChange}
    />
    <SettingsCategoriesCard
      loading={settingsLoading}
      treeData={settingsCategoryTree}
      onSelectCategoryNode={onSelectCategoryNode}
      onAddCategory={onOpenCategoryModal}
      onAddDocument={onOpenDocumentModal}
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
