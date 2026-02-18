import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { employeeService } from "@/services/employeeService";
import { employeeStatusService } from "@/services/employeeStatusService";
import { constructionSiteService } from "@/services/constructionSiteService";
import { counterpartyService } from "@/services/counterpartyService";
import {
  buildExportExcelRows,
  buildStatusUpdatesForExport,
  filterEmployeesForExport,
} from "@/modules/employees/lib/exportToExcelModalUtils";

export const useExportToExcelModal = ({
  visible,
  onCancel,
  messageApi,
}) => {
  const [loading, setLoading] = useState(false);
  const [constructionSites, setConstructionSites] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [constructionSiteId, setConstructionSiteId] = useState(null);
  const [counterpartyId, setCounterpartyId] = useState(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const fetchInitialData = async () => {
      try {
        const [sitesResponse, counterpartiesResponse] = await Promise.all([
          constructionSiteService.getAll(),
          counterpartyService.getAll({ limit: 10000, page: 1 }),
        ]);

        setConstructionSites(sitesResponse?.data?.data?.constructionSites || []);
        setCounterparties(
          counterpartiesResponse?.data?.data?.counterparties || [],
        );
      } catch (error) {
        console.error("Error loading export filters:", error);
      }
    };

    fetchInitialData();
    setFilterType("all");
    setConstructionSiteId(null);
    setCounterpartyId(null);
    setEmployees([]);
    setSelectedEmployees([]);
  }, [visible]);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!constructionSiteId || !counterpartyId) {
        setEmployees([]);
        setSelectedEmployees([]);
        return;
      }

      try {
        setLoading(true);
        const response = await employeeService.getAll();
        const allEmployees = response.data.employees || [];

        const filtered = filterEmployeesForExport({
          allEmployees,
          constructionSiteId,
          counterpartyId,
          filterType,
        });

        setEmployees(filtered);
        setSelectedEmployees(filtered.map((employee) => employee.id));
      } catch (error) {
        console.error("Error filtering employees:", error);
        messageApi.error("Ошибка при загрузке списка сотрудников");
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [constructionSiteId, counterpartyId, filterType, messageApi]);

  const rowSelection = useMemo(
    () => ({
      selectedRowKeys: selectedEmployees,
      onChange: (selectedRowKeys) => {
        setSelectedEmployees(selectedRowKeys);
      },
    }),
    [selectedEmployees],
  );

  const handleExport = async () => {
    if (selectedEmployees.length === 0) {
      messageApi.warning("Выберите хотя бы одного сотрудника для экспорта");
      return;
    }

    try {
      setLoading(true);

      const employeesToExport = employees.filter((employee) =>
        selectedEmployees.includes(employee.id),
      );

      const rows = buildExportExcelRows({
        employees: employeesToExport,
        constructionSiteId,
        counterpartyId,
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Сотрудники");

      const fileName = `Сотрудники_${dayjs().format("DD-MM-YYYY_HH-mm")}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      const allStatuses = await employeeStatusService.getAllStatuses();
      const statusUpdates = buildStatusUpdatesForExport({
        employees: employeesToExport,
        filterType,
        allStatuses,
      });

      if (statusUpdates.length > 0) {
        await Promise.all(
          statusUpdates.map(({ employeeId, statusId }) =>
            employeeStatusService.setStatus(employeeId, statusId),
          ),
        );
      }

      messageApi.success(`Файл успешно сохранен: ${fileName}`);
      onCancel();
    } catch (error) {
      console.error("Export error:", error);
      messageApi.error("Ошибка при экспорте в Excel");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    constructionSites,
    counterparties,
    employees,
    selectedEmployees,
    filterType,
    setFilterType,
    constructionSiteId,
    setConstructionSiteId,
    counterpartyId,
    setCounterpartyId,
    rowSelection,
    handleExport,
  };
};
