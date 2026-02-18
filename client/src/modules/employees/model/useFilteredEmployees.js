import { useMemo } from "react";
import { getUniqueFilterValues } from "@/entities/employee";

const normalizeDocSearch = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^0-9A-ZА-ЯЁ]/g, "");

export const useFilteredEmployees = ({
  employees,
  searchText,
  statusFilter,
  counterpartyFilter,
}) => {
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    if (statusFilter) {
      filtered = filtered.filter((employee) => {
        const cardStatusMapping = employee.statusMappings?.find((item) => {
          const group = item.statusGroup || item.status_group;
          return group === "status_card" || group === "card draft";
        });

        const mainStatusMapping = employee.statusMappings?.find((item) => {
          const group = item.statusGroup || item.status_group;
          return group === "status" || group === "draft";
        });

        const activeStatusMapping = employee.statusMappings?.find(
          (item) =>
            item.statusGroup === "status_active" ||
            item.status_group === "status_active",
        );

        const mainStatus = mainStatusMapping?.status?.name;
        const isDraft =
          cardStatusMapping?.status?.name === "status_card_draft" ||
          mainStatus === "status_draft";
        const isProcessed =
          cardStatusMapping?.status?.name === "status_card_processed";
        const isFired =
          activeStatusMapping?.status?.name === "status_active_fired";
        const isInactive =
          activeStatusMapping?.status?.name === "status_active_inactive";
        const isActive =
          mainStatus === "status_new" ||
          mainStatus === "status_tb_passed" ||
          mainStatus === "status_processed";

        if (statusFilter === "draft") return isDraft;
        if (statusFilter === "processed") return isProcessed;
        if (statusFilter === "active") return isActive;
        if (statusFilter === "fired") return isFired;
        if (statusFilter === "inactive") return isInactive;
        return true;
      });
    }

    if (!searchText) return filtered;

    const searchLower = searchText.toLowerCase();
    const normalizedDocSearchValue = normalizeDocSearch(searchText);

    return filtered.filter((employee) => {
      const normalizedPassport = normalizeDocSearch(employee.passportNumber);
      const normalizedKig = normalizeDocSearch(employee.kig);
      const normalizedPatent = normalizeDocSearch(employee.patentNumber);
      const isLastNameExact =
        employee.lastName?.toLowerCase().trim() === searchLower;
      const isDocumentExact =
        normalizedDocSearchValue.length > 0 &&
        (normalizedPassport === normalizedDocSearchValue ||
          normalizedKig === normalizedDocSearchValue ||
          normalizedPatent === normalizedDocSearchValue);

      return (
        employee.firstName?.toLowerCase().includes(searchLower) ||
        employee.middleName?.toLowerCase().includes(searchLower) ||
        employee.position?.name?.toLowerCase().includes(searchLower) ||
        employee.inn?.toLowerCase().includes(searchLower) ||
        employee.snils?.toLowerCase().includes(searchLower) ||
        isLastNameExact ||
        isDocumentExact
      );
    });
  }, [employees, searchText, statusFilter]);

  const uniqueFilters = useMemo(
    () => getUniqueFilterValues(filteredEmployees, counterpartyFilter),
    [filteredEmployees, counterpartyFilter],
  );

  return {
    filteredEmployees,
    uniqueFilters,
  };
};
