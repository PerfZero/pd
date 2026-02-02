import { Tabs, Typography, Space, Result } from "antd";
import AllSitesTab from "@/pages/occupationalSafety/AllSitesTab";
import ObjectTab from "@/pages/occupationalSafety/ObjectTab";
import ContractorTab from "@/pages/occupationalSafety/ContractorTab";
import SettingsTab from "@/pages/occupationalSafety/SettingsTab";
import OtModals from "@/pages/occupationalSafety/OtModals";
import useOccupationalSafety from "@/pages/occupationalSafety/useOccupationalSafety.jsx";

const { Title } = Typography;

const OccupationalSafetyPage = () => {
  const {
    t,
    isAllowed,
    isDefaultCounterpartyUser,
    activeTab,
    setActiveTab,
    isStaff,
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
    handleRecalculateStatus,
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
    renderTreeTitle,
    latestInstruction,
    settingsInstructions,
    handleDownloadInstructionFile,
    settingsLoading,
    settingsCategoryTree,
    handleOpenCategoryModal,
    categoryOptions,
    selectedCategoryId,
    setSelectedCategoryId,
    filteredDocuments,
    handleDownloadTemplate,
    templateUploadingId,
    handleTemplateUploadClick,
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
    setInstructionModalOpen,
    handleInstructionSubmit,
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
              onRecalculateStatus={handleRecalculateStatus}
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
          templateInputRef={templateInputRef}
          onFileChange={handleFileChange}
          onTemplateFileChange={handleTemplateFileChange}
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
          renderTreeTitle={renderTreeTitle}
          latestInstruction={latestInstruction}
          settingsInstructions={settingsInstructions}
          onDownloadInstructionFile={handleDownloadInstructionFile}
        />
      ),
    });

    if (canManageSettings) {
      items.push({
        key: "settings",
        label: t("ot.tabs.settings"),
        children: (
          <SettingsTab
            settingsLoading={settingsLoading}
            settingsCategoryTree={settingsCategoryTree}
            onOpenCategoryModal={handleOpenCategoryModal}
            categoryOptions={categoryOptions}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            selectCollapsedStyle={selectCollapsedStyle}
            selectDropdownStyle={selectDropdownStyle}
            filteredDocuments={filteredDocuments}
            onDownloadTemplate={handleDownloadTemplate}
            templateUploadingId={templateUploadingId}
            onTemplateUploadClick={handleTemplateUploadClick}
            onOpenDocumentModal={handleOpenDocumentModal}
            onDeleteDocument={handleDeleteDocument}
            latestInstruction={latestInstruction}
            settingsInstructions={settingsInstructions}
            onOpenInstructionModal={handleOpenInstructionModal}
            onDownloadInstructionFile={handleDownloadInstructionFile}
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

  if (isDefaultCounterpartyUser) {
    return (
      <Result
        status="403"
        title={t("common.accessDenied")}
        subTitle={t("ot.defaultCounterpartyDenied")}
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
          <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
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
        templateModalOpen={templateModalOpen}
        onCloseTemplateModal={() => setTemplateModalOpen(false)}
        onSubmitTemplate={handleTemplateSubmit}
        templateForm={templateForm}
        templateFileList={templateFileList}
        onTemplateFileListChange={handleTemplateFileListChange}
        instructionModalOpen={instructionModalOpen}
        onCloseInstructionModal={() => setInstructionModalOpen(false)}
        onSubmitInstruction={handleInstructionSubmit}
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
      />
    </div>
  );
};

export default OccupationalSafetyPage;
