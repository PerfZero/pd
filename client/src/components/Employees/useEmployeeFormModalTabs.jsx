import { useMemo } from "react";
import { CheckCircleFilled, CheckCircleOutlined } from "@ant-design/icons";
import EmployeeBasicInfoTab from "./EmployeeBasicInfoTab.jsx";
import EmployeeDocumentsTab from "./EmployeeDocumentsTab.jsx";
import EmployeePatentTab from "./EmployeePatentTab.jsx";
import EmployeeCounterpartyTab from "./EmployeeCounterpartyTab.jsx";
import EmployeeFilesTab from "./EmployeeFilesTab.jsx";

export const useEmployeeFormModalTabs = ({
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
  dateFormat,
  ocrSection,
  mvdSection,
  availableCounterparties,
  loadingCounterparties,
  handleFilesChange,
  tabsValidation,
}) => {
  return useMemo(() => {
    const getTabIcon = (tabKey) => {
      if (tabsValidation[tabKey]) {
        return (
          <CheckCircleFilled
            style={{ color: "#52c41a", fontSize: 16, marginRight: 8 }}
          />
        );
      }
      return (
        <CheckCircleOutlined
          style={{ color: "#d9d9d9", fontSize: 16, marginRight: 8 }}
        />
      );
    };

    const items = [
      {
        key: "1",
        label: (
          <span>
            {getTabIcon("1")}
            Личная информация
          </span>
        ),
        children: (
          <EmployeeBasicInfoTab
            employee={employee}
            messageApi={message}
            onCancel={onCancel}
            user={user}
            defaultCounterpartyId={defaultCounterpartyId}
            onTransfer={() => setTransferModalVisible(true)}
            getFieldProps={getFieldProps}
            positions={positions}
            citizenships={citizenships}
            handleCitizenshipChange={handleCitizenshipChange}
            antiAutofillIds={antiAutofillIds}
            latinInputError={latinInputError}
            handleFullNameChange={handleFullNameChange}
            handleInnBlur={handleInnBlur}
            dateFormat={dateFormat}
            ocrConflictByField={ocrConflictByField}
          />
        ),
      },
      {
        key: "2",
        label: (
          <span>
            {getTabIcon("2")}
            Документы
          </span>
        ),
        children: (
          <EmployeeDocumentsTab
            getFieldProps={getFieldProps}
            requiresPatent={requiresPatent}
            passportType={passportType}
            setPassportType={setPassportType}
            dateFormat={dateFormat}
            ocrSection={ocrSection}
            mvdSection={mvdSection}
            ocrConflictByField={ocrConflictByField}
          />
        ),
      },
    ];

    if (requiresPatent || checkingCitizenship) {
      items.push({
        key: "3",
        label: (
          <span>
            {getTabIcon("3")}
            Патент
            {checkingCitizenship && " (проверка...)"}
          </span>
        ),
        disabled: checkingCitizenship,
        children: checkingCitizenship ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
            Проверка необходимости патента...
          </div>
        ) : (
          <EmployeePatentTab getFieldProps={getFieldProps} dateFormat={dateFormat} />
        ),
      });
    }

    if (employee?.id) {
      items.push({
        key: "4",
        label: "Файлы",
        children: (
          <EmployeeFilesTab employeeId={employee.id} onFilesUpdated={handleFilesChange} />
        ),
      });
    }

    items.push({
      key: "5",
      label: "🏢 Контрагент",
      children: (
        <EmployeeCounterpartyTab
          availableCounterparties={availableCounterparties}
          loadingCounterparties={loadingCounterparties}
        />
      ),
    });

    return items;
  }, [
    antiAutofillIds,
    availableCounterparties,
    checkingCitizenship,
    citizenships,
    dateFormat,
    defaultCounterpartyId,
    employee,
    getFieldProps,
    handleCitizenshipChange,
    handleFilesChange,
    handleFullNameChange,
    handleInnBlur,
    latinInputError,
    loadingCounterparties,
    message,
    mvdSection,
    ocrConflictByField,
    ocrSection,
    onCancel,
    passportType,
    positions,
    requiresPatent,
    setPassportType,
    setTransferModalVisible,
    tabsValidation,
    user,
  ]);
};
