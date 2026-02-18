import { useEffect, useMemo, useState } from "react";
import { getStatusPriority } from "@/entities/employee/model/utils";

export const useApplicationRequestSelection = ({
  employees,
  searchText,
  selectedSite,
  includeFired,
  selectedCounterparty,
  user,
  defaultCounterpartyId,
}) => {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allSelected, setAllSelected] = useState(false);

  const availableEmployees = useMemo(() => {
    let filtered = employees;

    if (user?.role === "user") {
      const isDefaultCounterparty =
        user?.counterpartyId === defaultCounterpartyId;

      if (isDefaultCounterparty) {
        filtered = filtered.filter((emp) => emp.createdBy === user?.id);
      }
    } else if (user?.role === "admin" && selectedCounterparty) {
      filtered = filtered.filter((emp) => {
        const counterpartyId =
          emp.employeeCounterpartyMappings?.[0]?.counterpartyId;
        return counterpartyId === selectedCounterparty;
      });
    }

    filtered = filtered.filter((emp) => {
      const priority = getStatusPriority(emp);
      if (priority === 1) return false;
      if (priority === 3) return false;
      if (emp.statusCard === "draft") return false;
      if (!includeFired && priority === 2) return false;
      return true;
    });

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((employee) => {
        return (
          employee.firstName?.toLowerCase().includes(searchLower) ||
          employee.lastName?.toLowerCase().includes(searchLower) ||
          employee.middleName?.toLowerCase().includes(searchLower) ||
          employee.position?.name?.toLowerCase().includes(searchLower) ||
          employee.inn?.toLowerCase().includes(searchLower) ||
          employee.snils?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (selectedSite) {
      filtered = filtered.filter((emp) => {
        const siteNames =
          emp.employeeCounterpartyMappings
            ?.filter((mapping) => mapping.constructionSite)
            .map((mapping) => mapping.constructionSite?.id) || [];
        return siteNames.includes(selectedSite);
      });
    }

    return filtered;
  }, [
    employees,
    searchText,
    selectedSite,
    includeFired,
    selectedCounterparty,
    user?.role,
    user?.counterpartyId,
    user?.id,
    defaultCounterpartyId,
  ]);

  useEffect(() => {
    if (availableEmployees.length > 0 && selectedEmployees.length === 0) {
      const allIds = availableEmployees.map((emp) => emp.id);
      setSelectedEmployees(allIds);
      setAllSelected(true);
    }
  }, [availableEmployees, selectedEmployees.length]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEmployees(availableEmployees.map((emp) => emp.id));
      setAllSelected(true);
      return;
    }

    setSelectedEmployees([]);
    setAllSelected(false);
  };

  const handleEmployeeToggle = (employeeId) => {
    const isSelected = selectedEmployees.includes(employeeId);
    const newSelected = isSelected
      ? selectedEmployees.filter((id) => id !== employeeId)
      : [...selectedEmployees, employeeId];

    setSelectedEmployees(newSelected);
    setAllSelected(newSelected.length === availableEmployees.length);
  };

  return {
    availableEmployees,
    selectedEmployees,
    allSelected,
    handleSelectAll,
    handleEmployeeToggle,
  };
};
