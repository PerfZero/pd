import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Modal, Form, App, Tabs } from "antd";
import {
  capitalizeFirstLetter,
  filterCyrillicOnly,
} from "../../utils/formatters";
import {
  createAntiAutofillIds,
  formatBlankNumber,
  formatInn,
  formatKig,
  formatPatentNumber,
  formatPhoneNumber,
  formatSnils,
} from "./employeeFormUtils";
import { useAuthStore } from "../../store/authStore";
import { useReferencesStore } from "../../store/referencesStore";
import TransferEmployeeModal from "./TransferEmployeeModal.jsx";
import EmployeeFormModalFooter from "./EmployeeFormModalFooter.jsx";
import { useEmployeeFormModalTabs } from "./useEmployeeFormModalTabs";
import { useEmployeeFormFieldConfig } from "./useEmployeeFormFieldConfig";
import {
  applyLinkingModePayload,
  getInitialLinkingMode,
  shouldStayOpenAfterSave,
} from "./useEmployeeLinkingMode";
import useEmployeeReferences from "./useEmployeeReferences";
import useEmployeeTabsValidation from "./useEmployeeTabsValidation";
import {
  DATE_FORMAT,
  OCR_FILE_TYPE_LABELS,
  MVD_TYPE_LABELS,
  MVD_PARAM_LABELS,
  MVD_PARAM_PLACEHOLDERS,
  formatFieldValueForDisplay,
} from "./employeeFormModalUtils";
import EmployeeFormOcrSection from "@/modules/employees/ui/form/EmployeeFormOcrSection";
import EmployeeFormMvdSection from "@/modules/employees/ui/form/EmployeeFormMvdSection";
import EmployeeOcrConflictsModal from "@/modules/employees/ui/form/EmployeeOcrConflictsModal";
import EmployeeMvdCheckModal from "@/modules/employees/ui/form/EmployeeMvdCheckModal";
import BrowserAutofillTrap from "@/modules/employees/ui/form/BrowserAutofillTrap";
import { useEmployeeFormOcrMvd } from "@/modules/employees/model/useEmployeeFormOcrMvd";
import { useEmployeeFormInitialization } from "@/modules/employees/model/useEmployeeFormInitialization";
import { useEmployeeFormSaveHandlers } from "@/modules/employees/model/useEmployeeFormSaveHandlers";
import { useEmployeeFormInputHandlers } from "@/modules/employees/model/useEmployeeFormInputHandlers";
import { useEmployeeFormTabFlow } from "@/modules/employees/model/useEmployeeFormTabFlow";
import { formatEmployeeFormPayload } from "@/modules/employees/lib/employeeFormPayload";

const EmployeeFormModal = ({
  visible,
  employee,
  onCancel,
  onSuccess,
  onCheckInn,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [mvdForm] = Form.useForm();
  const antiAutofillIds = useMemo(() => createAntiAutofillIds(), []);
  const [citizenships, setCitizenships] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingCitizenship, setCheckingCitizenship] = useState(false); // Флаг проверки гражданства
  const [dataLoaded, setDataLoaded] = useState(false); // Новый флаг: данные полностью загружены
  const [activeTab, setActiveTab] = useState("1");
  const [tabsValidation, setTabsValidation] = useState({
    1: false, // Личная информация
    2: false, // Документы
    3: false, // Патент
  });
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const [passportType, setPassportType] = useState(null); // Состояние для типа паспорта
  const [linkingMode, setLinkingMode] = useState(false); // 🎯 Режим привязки существующего сотрудника
  const { user } = useAuthStore();
  const { formConfigDefault, formConfigExternal } = useReferencesStore();
  const [transferModalVisible, setTransferModalVisible] = useState(false); // Модальное окно перевода сотрудника
  const [availableCounterparties, setAvailableCounterparties] = useState([]); // Доступные контрагенты
  const [loadingCounterparties, setLoadingCounterparties] = useState(false); // Загрузка контрагентов

  const {
    fetchCitizenships,
    fetchPositions,
    fetchDefaultCounterparty,
    fetchCounterparties,
  } = useEmployeeReferences({
    setCitizenships,
    setPositions,
    setDefaultCounterpartyId,
    setAvailableCounterparties,
    setLoadingCounterparties,
  });

  const { getFieldProps } = useEmployeeFormFieldConfig({
    userCounterpartyId: user?.counterpartyId,
    defaultCounterpartyId,
    formConfigDefault,
    formConfigExternal,
  });

  const { requiredFieldsByTab, computeValidation, requiresPatent } =
    useEmployeeTabsValidation({
      form,
      getFieldProps,
      passportType,
      selectedCitizenship,
    });
  const computeValidationRef = useRef(computeValidation);

  useEffect(() => {
    computeValidationRef.current = computeValidation;
  }, [computeValidation]);

  const scheduleValidation = useCallback(() => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        const validation = computeValidation();
        setTabsValidation(validation);
      });
      return;
    }
    const validation = computeValidation();
    setTabsValidation(validation);
  }, [computeValidation]);

  useEmployeeFormInitialization({
    visible,
    employee,
    form,
    userCounterpartyId: user?.counterpartyId || null,
    defaultCounterpartyId,
    fetchCitizenships,
    fetchPositions,
    fetchDefaultCounterparty,
    fetchCounterparties,
    setLinkingMode,
    setDataLoaded,
    setActiveTab,
    setSelectedCitizenship,
    setCheckingCitizenship,
    setPassportType,
    setTabsValidation,
    computeValidationRef,
    getInitialLinkingMode,
    formatInn,
    formatSnils,
    formatPhoneNumber,
    formatKig,
    formatPatentNumber,
    formatBlankNumber,
  });

  const updateSelectedCitizenship = useCallback(
    (citizenshipId) => {
      const citizenship = citizenships.find((c) => c.id === citizenshipId);
      setSelectedCitizenship(citizenship || null);
    },
    [citizenships],
  );

  const handleCitizenshipChange = useCallback(
    (citizenshipId) => {
      updateSelectedCitizenship(citizenshipId);
      // Валидация запустится автоматически через handleFieldsChange
    },
    [updateSelectedCitizenship],
  );

  const { allTabsValid, handleNext } = useEmployeeFormTabFlow({
    requiresPatent,
    checkingCitizenship,
    activeTab,
    setActiveTab,
    visible,
    requiredFieldsByTab,
    tabsValidation,
  });

  const {
    ocrFiles,
    loadingOcrFiles,
    selectedOcrFileId,
    setSelectedOcrFileId,
    ocrRunning,
    ocrConflicts,
    ocrModalVisible,
    ocrConflictByField,
    setOcrConflictByField,
    mvdModalVisible,
    mvdMetaLoading,
    mvdCheckLoading,
    mvdSupportedTypes,
    mvdSelectedType,
    mvdResult,
    mvdErrorText,
    selectedOcrDocumentType,
    selectedOcrDocumentLabel,
    selectedMvdParams,
    fetchOcrFiles,
    handleStartDocumentOcr,
    handleResolveConflictDecision,
    handleApplyOcrConflicts,
    handleCancelOcrConflictModal,
    handleMvdTypeChange,
    handleOpenMvdModal,
    handleRunMvdCheck,
    handleCloseMvdModal,
  } = useEmployeeFormOcrMvd({
    visible,
    employeeId: employee?.id || null,
    form,
    mvdForm,
    message,
    passportType,
    setPassportType,
    citizenships,
    updateSelectedCitizenship,
  });

  // Обработчик для обновления при изменении файлов
  const handleFilesChange = () => {
    if (employee?.id) {
      fetchOcrFiles();
    }
  };

  const { isFormResetRef, handleSave, handleSaveDraft, scheduleAutoSaveDraft } =
    useEmployeeFormSaveHandlers({
      form,
      employee,
      onSuccess,
      onCancel,
      message,
      linkingMode,
      setLinkingMode,
      setLoading,
      setActiveTab,
      setTabsValidation,
      setSelectedCitizenship,
      setPassportType,
      applyLinkingModePayload,
      shouldStayOpenAfterSave,
      formatEmployeeFormPayload,
    });

  const {
    latinInputError,
    handleFieldsChange,
    handleInnBlur,
    handleFullNameChange,
  } = useEmployeeFormInputHandlers({
    form,
    employee,
    onCheckInn,
    message,
    dataLoaded,
    passportType,
    setPassportType,
    scheduleValidation,
    scheduleAutoSaveDraft,
    setOcrConflictByField,
    isFormResetRef,
    filterCyrillicOnly,
    capitalizeFirstLetter,
  });

  // Обработчик закрытия модального окна
  const handleModalCancel = () => {
    onCancel();
  };

  const ocrSection = (
    <EmployeeFormOcrSection
      employeeId={employee?.id}
      selectedOcrFileId={selectedOcrFileId}
      loadingOcrFiles={loadingOcrFiles}
      ocrRunning={ocrRunning}
      onSelectFile={setSelectedOcrFileId}
      onStartOcr={handleStartDocumentOcr}
      onRefreshFiles={fetchOcrFiles}
      selectedOcrDocumentType={selectedOcrDocumentType}
      selectedOcrDocumentLabel={selectedOcrDocumentLabel}
      ocrFiles={ocrFiles}
      ocrFileTypeLabels={OCR_FILE_TYPE_LABELS}
    />
  );

  const mvdSection = (
    <EmployeeFormMvdSection
      mvdMetaLoading={mvdMetaLoading}
      mvdCheckLoading={mvdCheckLoading}
      onOpenMvdModal={handleOpenMvdModal}
    />
  );

  const tabsItems = useEmployeeFormModalTabs({
    employee,
    message,
    onCancel,
    user,
    defaultCounterpartyId,
    setTransferModalVisible,
    getFieldProps,
    positions,
    citizenships,
    handleCitizenshipChange,
    antiAutofillIds,
    latinInputError,
    handleFullNameChange,
    handleInnBlur,
    ocrConflictByField,
    requiresPatent,
    checkingCitizenship,
    passportType,
    setPassportType,
    dateFormat: DATE_FORMAT,
    ocrSection,
    mvdSection,
    availableCounterparties,
    loadingCounterparties,
    handleFilesChange,
    tabsValidation,
  });

  // Контент формы
  const formContent = (
    <>
      <BrowserAutofillTrap />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ gender: "male" }}
        onFieldsChange={handleFieldsChange}
        validateTrigger={["onChange", "onBlur"]}
        autoComplete="off"
        requiredMark={(label, { required }) => (
          <>
            {label}
            {required && (
              <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>
            )}
          </>
        )}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            // Валидация запустится через useEffect при изменении activeTab
          }}
          style={{ marginTop: 16 }}
          destroyOnHidden={false} // Рендерим все вкладки сразу, чтобы форма видела все поля
          items={tabsItems}
        />
      </Form>
    </>
  );

  const footer = (
    <EmployeeFormModalFooter
      employee={employee}
      loading={loading}
      allTabsValid={allTabsValid}
      onCancel={handleModalCancel}
      onSaveDraft={handleSaveDraft}
      onSave={handleSave}
      onNext={handleNext}
    />
  );

  // Модальное окно
  return (
    <>
      <Modal
        title={employee ? "Редактировать сотрудника" : "Добавить сотрудника"}
        open={visible}
        onCancel={handleModalCancel}
        maskClosable={false}
        width={1350}
        footer={footer}
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto", overflowX: "hidden" },
        }}
      >
        {formContent}
      </Modal>

      <EmployeeOcrConflictsModal
        open={ocrModalVisible}
        conflicts={ocrConflicts}
        onCancel={handleCancelOcrConflictModal}
        onApply={handleApplyOcrConflicts}
        onDecisionChange={handleResolveConflictDecision}
        formatFieldValue={(fieldName, value) =>
          formatFieldValueForDisplay(fieldName, value, citizenships)
        }
      />

      <EmployeeMvdCheckModal
        open={mvdModalVisible}
        onCancel={handleCloseMvdModal}
        onRunCheck={handleRunMvdCheck}
        confirmLoading={mvdCheckLoading}
        mvdForm={mvdForm}
        mvdSelectedType={mvdSelectedType}
        mvdMetaLoading={mvdMetaLoading}
        onTypeChange={handleMvdTypeChange}
        mvdSupportedTypes={mvdSupportedTypes}
        selectedMvdParams={selectedMvdParams}
        mvdErrorText={mvdErrorText}
        mvdResult={mvdResult}
        mvdTypeLabels={MVD_TYPE_LABELS}
        mvdParamLabels={MVD_PARAM_LABELS}
        mvdParamPlaceholders={MVD_PARAM_PLACEHOLDERS}
      />

      {/* Модальное окно перевода сотрудника в другую компанию */}
      <TransferEmployeeModal
        visible={transferModalVisible}
        employee={employee}
        onCancel={() => setTransferModalVisible(false)}
      />
    </>
  );
};

export default EmployeeFormModal;
