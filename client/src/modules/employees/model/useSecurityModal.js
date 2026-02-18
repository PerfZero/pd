import { useCallback, useEffect, useMemo, useState } from "react";
import { employeeService } from "@/services/employeeService";
import { employeeStatusService } from "@/services/employeeStatusService";
import { counterpartyService } from "@/services/counterpartyService";
import { matchesSecurityStatusFilters } from "@/modules/employees/lib/securityModalUtils";

export const useSecurityModal = ({
  visible,
  onSuccess,
  messageApi,
}) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [statusFilters, setStatusFilters] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const fetchAllStatuses = useCallback(async () => {
    try {
      const statuses = await employeeStatusService.getAllStatuses();
      setAllStatuses(statuses);
    } catch (error) {
      console.error("Error loading statuses:", error);
      messageApi.error("Ошибка при загрузке списка статусов");
    }
  }, [messageApi]);

  const fetchCounterparties = useCallback(async () => {
    try {
      const { data } = await counterpartyService.getAll({
        limit: 10000,
        page: 1,
      });
      setCounterparties(data.data.counterparties || []);
    } catch (error) {
      console.error("Error loading counterparties:", error);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);

      const response = await employeeService.getAll({
        limit: 10000,
        activeOnly: "true",
      });
      let allEmployees = response.data.employees || [];

      if (allEmployees.length > 0) {
        try {
          const employeeIds = allEmployees.map((employee) => employee.id);
          const statusesBatch =
            await employeeStatusService.getStatusesBatch(employeeIds);

          allEmployees = allEmployees.map((employee) => ({
            ...employee,
            statusMappings: statusesBatch[employee.id] || [],
          }));
        } catch (statusError) {
          console.warn("Error loading statuses batch:", statusError);
        }
      }

      let filtered = allEmployees;

      if (selectedCounterparty) {
        filtered = filtered.filter((employee) =>
          employee.employeeCounterpartyMappings?.some(
            (mapping) => mapping.counterpartyId === selectedCounterparty,
          ),
        );
      }

      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filtered = filtered.filter(
          (employee) =>
            employee.firstName?.toLowerCase().includes(searchLower) ||
            employee.lastName?.toLowerCase().includes(searchLower) ||
            employee.middleName?.toLowerCase().includes(searchLower),
        );
      }

      filtered = filtered.filter((employee) =>
        matchesSecurityStatusFilters(employee, statusFilters),
      );

      setEmployees(filtered);
    } catch (error) {
      console.error("Error fetching employees:", error);
      messageApi.error("Ошибка при загрузке сотрудников");
    } finally {
      setLoading(false);
    }
  }, [messageApi, searchText, selectedCounterparty, statusFilters]);

  useEffect(() => {
    if (visible) {
      fetchCounterparties();
      fetchAllStatuses();
      fetchEmployees();
    }
  }, [visible, fetchAllStatuses, fetchCounterparties, fetchEmployees]);

  const handleBlock = async (employeeId) => {
    try {
      const blockStatus = allStatuses.find(
        (status) => status.name === "status_secure_block",
      );

      if (!blockStatus) {
        throw new Error("Статус блокировки не найден");
      }

      await employeeStatusService.setStatus(employeeId, blockStatus.id);
      messageApi.success("Сотрудник заблокирован");
      if (onSuccess) {
        onSuccess();
      }
      fetchEmployees();
    } catch (error) {
      console.error("Error blocking employee:", error);
      messageApi.error("Ошибка при блокировке сотрудника");
    }
  };

  const handleUnblock = async (employeeId) => {
    try {
      const allowStatus = allStatuses.find(
        (status) => status.name === "status_secure_allow",
      );

      if (!allowStatus) {
        throw new Error("Статус разблокировки не найден");
      }

      await employeeStatusService.setStatus(employeeId, allowStatus.id);
      messageApi.success("Сотрудник разблокирован");
      if (onSuccess) {
        onSuccess();
      }
      fetchEmployees();
    } catch (error) {
      console.error("Error unblocking employee:", error);
      messageApi.error("Ошибка при разблокировке сотрудника");
    }
  };

  const tablePagination = useMemo(
    () => ({
      current: pagination.current,
      pageSize: pagination.pageSize,
      showSizeChanger: true,
      pageSizeOptions: [10, 20, 50, 100],
      total: employees.length,
      onChange: (page, pageSize) => {
        setPagination({ current: page, pageSize });
      },
    }),
    [employees.length, pagination],
  );

  return {
    loading,
    employees,
    counterparties,
    searchText,
    setSearchText,
    selectedCounterparty,
    setSelectedCounterparty,
    statusFilters,
    setStatusFilters,
    handleBlock,
    handleUnblock,
    tablePagination,
  };
};
