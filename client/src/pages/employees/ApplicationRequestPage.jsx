import { useState } from "react";
import { App } from "antd";
import { useNavigate } from "react-router-dom";
import { useEmployees } from "@/entities/employee";
import { useSettings } from "@/entities/settings";
import { useAuthStore } from "@/store/authStore";
import { useExcelColumns } from "@/hooks/useExcelColumns";
import { useApplicationRequestSelection } from "@/modules/employees/model/useApplicationRequestSelection";
import { useApplicationRequestFilters } from "@/modules/employees/model/useApplicationRequestFilters";
import { useApplicationRequestExport } from "@/modules/employees/model/useApplicationRequestExport";
import ApplicationRequestHeader from "@/modules/employees/ui/ApplicationRequestHeader";
import ApplicationRequestEmployeeList from "@/modules/employees/ui/ApplicationRequestEmployeeList";
import ApplicationRequestActionsBar from "@/modules/employees/ui/ApplicationRequestActionsBar";
import ExcelColumnsModal from "@/modules/employees/ui/ExcelColumnsModal";

const ApplicationRequestPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);

  const { user } = useAuthStore();
  const { defaultCounterpartyId } = useSettings();
  const {
    columns: selectedColumns,
    updateColumns,
    toggleColumn,
    moveColumnUp,
    moveColumnDown,
    selectAll,
    deselectAll,
  } = useExcelColumns();

  const {
    employees,
    loading: employeesLoading,
    refetch: refetchEmployees,
  } = useEmployees();

  const {
    searchText,
    setSearchText,
    selectedSite,
    setSelectedSite,
    selectedCounterparty,
    setSelectedCounterparty,
    includeFired,
    setIncludeFired,
    availableSites,
    sitesLoading,
    availableCounterparties,
    counterpartiesLoading,
  } = useApplicationRequestFilters({
    user,
    defaultCounterpartyId,
  });

  const {
    availableEmployees,
    selectedEmployees,
    allSelected,
    handleSelectAll,
    handleEmployeeToggle,
  } = useApplicationRequestSelection({
    employees,
    searchText,
    selectedSite,
    includeFired,
    selectedCounterparty,
    user,
    defaultCounterpartyId,
  });

  const { exportLoading, handleCreateRequest } = useApplicationRequestExport({
    message,
    navigate,
    selectedEmployees,
    availableEmployees,
    selectedColumns,
    refetchEmployees,
  });

  const isLoading = employeesLoading || exportLoading;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <ApplicationRequestHeader
        onBack={() => navigate("/employees")}
        userRole={user?.role}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        selectedCounterparty={selectedCounterparty}
        onCounterpartyChange={setSelectedCounterparty}
        counterpartiesLoading={counterpartiesLoading}
        availableCounterparties={availableCounterparties}
        selectedSite={selectedSite}
        onSiteChange={setSelectedSite}
        sitesLoading={sitesLoading}
        availableSites={availableSites}
        includeFired={includeFired}
        onIncludeFiredChange={setIncludeFired}
        onOpenColumns={() => setIsColumnsModalOpen(true)}
      />

      <ApplicationRequestEmployeeList
        isLoading={isLoading}
        availableEmployees={availableEmployees}
        selectedEmployees={selectedEmployees}
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
        onEmployeeToggle={handleEmployeeToggle}
      />

      <ApplicationRequestActionsBar
        selectedCount={selectedEmployees.length}
        availableCount={availableEmployees.length}
        isLoading={isLoading}
        onCancel={() => navigate("/employees")}
        onCreate={handleCreateRequest}
      />

      <ExcelColumnsModal
        visible={isColumnsModalOpen}
        onCancel={() => setIsColumnsModalOpen(false)}
        columns={selectedColumns}
        onUpdate={updateColumns}
        toggleColumn={toggleColumn}
        moveColumnUp={moveColumnUp}
        moveColumnDown={moveColumnDown}
        selectAll={selectAll}
        deselectAll={deselectAll}
      />
    </div>
  );
};

export default ApplicationRequestPage;
