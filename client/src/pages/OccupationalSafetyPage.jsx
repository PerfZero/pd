import { Tabs, Typography, Space, Result } from "antd";
import AllSitesTab from "@/pages/occupationalSafety/AllSitesTab";
import ObjectTab from "@/pages/occupationalSafety/ObjectTab";
import ContractorTab from "@/widgets/occupational-safety/contractor-tab/ContractorTab";
import SettingsTab from "@/widgets/occupational-safety/settings-tab/SettingsTab";
import OtModals from "@/pages/occupationalSafety/OtModals";
import useOccupationalSafety from "@/pages/occupationalSafety/useOccupationalSafety.jsx";

const { Title } = Typography;

const OccupationalSafetyPage = () => {
  const {
    t,
    isAllowed,
    activeTab,
    setActiveTab,
    isStaff,
    isContractorUser,
    canManageSettings,
    allSiteSummaries,
    allSiteLoading,
    handleOpenObject,
    constructionSiteOptions,
    selectedConstructionSiteId,
    setSelectedConstructionSiteId,
    selectCollapsedStyle,
    contractorSelectStyle,
    selectDropdownStyle,
    objectStatusSummary,
    objectStatusLoading,
    objectStatuses,
    contractorStatusMeta,
    handleTempAdmit,
    handleManualAdmit,
    handleBlockContractor,
    handleOpenContractor,
    uploadInputRef,
    templateInputRef,
    handleFileChange,
    handleTemplateFileChange,
    counterpartyOptions,
    selectedCounterpartyId,
    setSelectedCounterpartyId,
    hasContractorSelection,
    contractorLoading,
    normalizedStats,
    contractorCommentsLoading,
    contractorComments,
    contractorCommentText,
    setContractorCommentText,
    contractorCommentEnabled,
    handleAddContractorComment,
    contractorCommentEditOpen,
    contractorCommentForm,
    handleCloseContractorCommentEdit,
    handleUpdateContractorComment,
    handleOpenEditContractorComment,
    handleDeleteContractorComment,
    contractorTree,
    statusMeta,
    uploadingDocId,
    handleDownloadContractorFile,
    handlePreviewContractorFile,
    handleDeleteContractorFile,
    handleOpenDocumentComments,
    handleUploadClick,
    handleApprove,
    handleReject,
    latestInstruction,
    settingsInstructions,
    handleDownloadInstructionFile,
    handleDeleteInstruction,
    settingsLoading,
    settingsCategoryTree,
    handleSelectSettingsCategoryNode,
    handleOpenCategoryModal,
    handleCloseCategoryDocumentsModal,
    categoryDocumentsModalOpen,
    categoryDocumentsTarget,
    categoryDocumentsList,
    categoryOptions,
    handleDownloadTemplate,
    handleOpenDocumentModal,
    handleDeleteDocument,
    handleOpenInstructionModal,
    categoryModalOpen,
    editingCategory,
    setCategoryModalOpen,
    handleCategorySubmit,
    categoryForm,
    selectFullStyle,
    documentModalOpen,
    editingDocument,
    setDocumentModalOpen,
    handleDocumentSubmit,
    documentForm,
    templateModalOpen,
    setTemplateModalOpen,
    handleTemplateSubmit,
    templateForm,
    templateFileList,
    handleTemplateFileListChange,
    instructionModalOpen,
    handleCloseInstructionModal,
    handleInstructionSubmit,
    editingInstruction,
    instructionForm,
    instructionFileList,
    handleInstructionFileListChange,
    documentCommentModalOpen,
    documentCommentTarget,
    handleCloseDocumentCommentModal,
    documentCommentsLoading,
    documentComments,
    documentCommentText,
    setDocumentCommentText,
    handleAddDocumentComment,
    handleDeleteDocumentComment,
  } = useOccupationalSafety();

  const tabs = (() => {
    const items = [];

    if (isStaff) {
      items.push(
        {
          key: "all",
          label: t("ot.tabs.all"),
          children: (
            <AllSitesTab
              allSiteSummaries={allSiteSummaries}
              allSiteLoading={allSiteLoading}
              onOpenObject={handleOpenObject}
            />
          ),
        },
        {
          key: "object",
          label: t("ot.tabs.object"),
          children: (
            <ObjectTab
              constructionSiteOptions={constructionSiteOptions}
              selectedConstructionSiteId={selectedConstructionSiteId}
              onSelectConstructionSite={setSelectedConstructionSiteId}
              selectCollapsedStyle={selectCollapsedStyle}
              selectDropdownStyle={selectDropdownStyle}
              objectStatusSummary={objectStatusSummary}
              objectStatusLoading={objectStatusLoading}
              objectStatuses={objectStatuses}
              contractorStatusMeta={contractorStatusMeta}
              isStaff={isStaff}
              onTempAdmit={handleTempAdmit}
              onManualAdmit={handleManualAdmit}
              onBlockContractor={handleBlockContractor}
              onOpenContractor={handleOpenContractor}
            />
          ),
        },
      );
    }

    items.push({
      key: "contractor",
      label: t("ot.tabs.contractor"),
      children: (
        <ContractorTab
          isStaff={isStaff}
          uploadInputRef={uploadInputRef}
          onFileChange={handleFileChange}
          constructionSiteOptions={constructionSiteOptions}
          selectedConstructionSiteId={selectedConstructionSiteId}
          onSelectConstructionSite={setSelectedConstructionSiteId}
          selectCollapsedStyle={selectCollapsedStyle}
          contractorSelectStyle={contractorSelectStyle}
          selectDropdownStyle={selectDropdownStyle}
          counterpartyOptions={counterpartyOptions}
          selectedCounterpartyId={selectedCounterpartyId}
          onSelectCounterparty={setSelectedCounterpartyId}
          hasContractorSelection={hasContractorSelection}
          contractorLoading={contractorLoading}
          normalizedStats={normalizedStats}
          contractorCommentsLoading={contractorCommentsLoading}
          contractorComments={contractorComments}
          contractorCommentText={contractorCommentText}
          onContractorCommentTextChange={(event) =>
            setContractorCommentText(event.target.value)
          }
          contractorCommentEnabled={contractorCommentEnabled}
          onAddContractorComment={handleAddContractorComment}
          contractorCommentEditOpen={contractorCommentEditOpen}
          contractorCommentForm={contractorCommentForm}
          onCloseContractorCommentEdit={handleCloseContractorCommentEdit}
          onUpdateContractorComment={handleUpdateContractorComment}
          onOpenEditContractorComment={handleOpenEditContractorComment}
          onDeleteContractorComment={handleDeleteContractorComment}
          contractorTree={contractorTree}
          statusMeta={statusMeta}
          uploadingDocId={uploadingDocId}
          onDownloadTemplate={handleDownloadTemplate}
          onDownloadContractorFile={handleDownloadContractorFile}
          onPreviewContractorFile={handlePreviewContractorFile}
          onDeleteContractorFile={handleDeleteContractorFile}
          onOpenDocumentComments={handleOpenDocumentComments}
          onUploadClick={handleUploadClick}
          onApprove={handleApprove}
          onReject={handleReject}
          isContractorUser={isContractorUser}
          latestInstruction={latestInstruction}
          settingsInstructions={settingsInstructions}
          onDownloadInstructionFile={handleDownloadInstructionFile}
          onTempAdmit={handleTempAdmit}
          onManualAdmit={handleManualAdmit}
          onBlockContractor={handleBlockContractor}
        />
      ),
    });

    if (canManageSettings) {
      items.push({
        key: "settings",
        label: t("ot.tabs.settings"),
        children: (
          <SettingsTab
            templateInputRef={templateInputRef}
            onTemplateFileChange={handleTemplateFileChange}
            settingsLoading={settingsLoading}
            settingsCategoryTree={settingsCategoryTree}
            onSelectCategoryNode={handleSelectSettingsCategoryNode}
            onOpenCategoryModal={handleOpenCategoryModal}
            onOpenDocumentModal={handleOpenDocumentModal}
            latestInstruction={latestInstruction}
            settingsInstructions={settingsInstructions}
            onOpenInstructionModal={handleOpenInstructionModal}
            onDownloadInstructionFile={handleDownloadInstructionFile}
            onEditInstruction={handleOpenInstructionModal}
            onDeleteInstruction={handleDeleteInstruction}
          />
        ),
      });
    }

    return items;
  })();

  if (!isAllowed) {
    return (
      <Result
        status="403"
        title={t("common.accessDenied")}
        subTitle={t("ot.accessDenied")}
      />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Space
        direction="vertical"
        size={isStaff ? 12 : 4}
        style={{ width: "100%" }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {t("ot.title")}
        </Title>
        {isStaff ? (
          <Tabs
            className="ot-sticky-tabs"
            items={tabs}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
        ) : (
          tabs[0]?.children
        )}
      </Space>
      <OtModals
        categoryModalOpen={categoryModalOpen}
        editingCategory={editingCategory}
        onCloseCategoryModal={() => setCategoryModalOpen(false)}
        onSubmitCategory={handleCategorySubmit}
        categoryForm={categoryForm}
        categoryOptions={categoryOptions}
        selectFullStyle={selectFullStyle}
        selectDropdownStyle={selectDropdownStyle}
        documentModalOpen={documentModalOpen}
        editingDocument={editingDocument}
        onCloseDocumentModal={() => setDocumentModalOpen(false)}
        onSubmitDocument={handleDocumentSubmit}
        documentForm={documentForm}
        categoryDocumentsModalOpen={categoryDocumentsModalOpen}
        categoryDocumentsTarget={categoryDocumentsTarget}
        categoryDocumentsList={categoryDocumentsList}
        onCloseCategoryDocumentsModal={handleCloseCategoryDocumentsModal}
        onOpenDocumentModal={handleOpenDocumentModal}
        onDeleteDocument={handleDeleteDocument}
        templateModalOpen={templateModalOpen}
        onCloseTemplateModal={() => setTemplateModalOpen(false)}
        onSubmitTemplate={handleTemplateSubmit}
        templateForm={templateForm}
        templateFileList={templateFileList}
        onTemplateFileListChange={handleTemplateFileListChange}
        instructionModalOpen={instructionModalOpen}
        onCloseInstructionModal={handleCloseInstructionModal}
        onSubmitInstruction={handleInstructionSubmit}
        editingInstruction={editingInstruction}
        instructionForm={instructionForm}
        instructionFileList={instructionFileList}
        onInstructionFileListChange={handleInstructionFileListChange}
        documentCommentModalOpen={documentCommentModalOpen}
        documentCommentTarget={documentCommentTarget}
        onCloseDocumentCommentModal={handleCloseDocumentCommentModal}
        documentCommentsLoading={documentCommentsLoading}
        documentComments={documentComments}
        documentCommentText={documentCommentText}
        onDocumentCommentTextChange={(event) =>
          setDocumentCommentText(event.target.value)
        }
        onAddDocumentComment={handleAddDocumentComment}
        onDeleteDocumentComment={handleDeleteDocumentComment}
        canDeleteDocumentComments={isStaff}
      />
    </div>
  );
};

export default OccupationalSafetyPage;
