import { useState, useMemo, useEffect } from "react";
import {
  Typography,
  App,
  Grid,
  Button,
  Tooltip,
  Dropdown,
  Checkbox,
  Space,
} from "antd";
import {
  PlusOutlined,
  FileExcelOutlined,
  ClearOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  useEmployees,
  useEmployeeActions,
  useCheckInn,
  getUniqueFilterValues,
} from "@/entities/employee";
import { employeeApi } from "@/entities/employee";
import { useDepartments } from "@/entities/department";
import { useSettings } from "@/entities/settings";
import { useAuthStore } from "@/store/authStore";
import { counterpartyService } from "@/services/counterpartyService";
import { employeeService } from "@/services/employeeService";
import { usePageTitle } from "@/hooks/usePageTitle";
import { EmployeeTable, MobileEmployeeList } from "@/widgets/employee-table";
import { EmployeeSearchFilter } from "@/features/employee-search";
import { EmployeeActions } from "@/features/employee-actions";
import EmployeeFormModal from "@/components/Employees/EmployeeFormModal";
import EmployeeViewModal from "@/components/Employees/EmployeeViewModal";
import EmployeeViewDrawer from "@/components/Employees/EmployeeViewDrawer";
import EmployeeFilesModal from "@/components/Employees/EmployeeFilesModal";
import EmployeeSitesModal from "@/components/Employees/EmployeeSitesModal";
import ApplicationRequestModal from "@/components/Employees/ApplicationRequestModal";
import ExportToExcelModal from "@/components/Employees/ExportToExcelModal";
import EmployeeImportModal from "@/components/Employees/EmployeeImportModal";
import SecurityModal from "@/components/Employees/SecurityModal";
import { useTranslation } from "react-i18next";

const { Title } = Typography;
const { useBreakpoint } = Grid;

// Ключ для сохранения фильтров таблицы (должен совпадать с useTableFilters)
const TABLE_FILTERS_STORAGE_KEY = "employee_table_filters";
const TABLE_COLUMNS_STORAGE_KEY = "employee_table_columns";
const EMPLOYEES_PAGE_STATE_STORAGE_KEY = "employees_page_state";

const normalizeDocSearch = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^0-9A-ZА-ЯЁ]/g, "");

// Функция для получения начальных фильтров из localStorage
const getInitialFilters = () => {
  try {
    const saved = localStorage.getItem(TABLE_FILTERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn("Ошибка при загрузке фильтров таблицы:", error);
    return {};
  }
};

const getInitialHiddenColumns = () => {
  try {
    const saved = localStorage.getItem(TABLE_COLUMNS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn("Ошибка при загрузке колонок таблицы:", error);
    return [];
  }
};

const getInitialPageState = () => {
  try {
    const saved = localStorage.getItem(EMPLOYEES_PAGE_STATE_STORAGE_KEY);
    if (!saved) {
      return {
        searchText: "",
        statusFilter: null,
      };
    }
    const parsed = JSON.parse(saved);
    return {
      searchText: parsed.searchText || "",
      statusFilter: parsed.statusFilter || null,
    };
  } catch (error) {
    console.warn("Ошибка при загрузке состояния страницы сотрудников:", error);
    return {
      searchText: "",
      statusFilter: null,
    };
  }
};

const normalizeTableFilters = (value) => {
  const normalized = {};
  Object.entries(value || {}).forEach(([key, item]) => {
    if (item === null || item === undefined) {
      return;
    }
    if (Array.isArray(item)) {
      if (item.length > 0) {
        normalized[key] = item;
      }
      return;
    }
    normalized[key] = item;
  });
  return normalized;
};

/**
 * Страница управления сотрудниками
 * Оптимизирована для быстрой загрузки с параллельными запросами и мемоизацией
 * Адаптивный дизайн: таблица на десктопе, карточки на мобильных
 */
const EmployeesPage = () => {
  const { modal } = App.useApp();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { t } = useTranslation();

  // Получаем данные пользователя в самом начале
  const { user } = useAuthStore();

  // Загружаем настройки (нужны для определения defaultCounterpartyId)
  const { defaultCounterpartyId, loading: settingsLoading } = useSettings();

  const [initialPageState] = useState(getInitialPageState);
  const [searchText, setSearchText] = useState(initialPageState.searchText);
  const [statusFilter, setStatusFilter] = useState(
    initialPageState.statusFilter,
  );
  // Инициализируем фильтры из localStorage
  const [tableFilters, setTableFilters] = useState(getInitialFilters);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [hiddenColumns, setHiddenColumns] = useState(getInitialHiddenColumns);
  // Маппинг имен контрагентов в ID для фильтрации на сервере
  const [counterpartyMap, setCounterpartyMap] = useState({});
  const [hasSubcontractors, setHasSubcontractors] = useState(false); // Есть ли у пользователя субподрядчики

  useEffect(() => {
    localStorage.setItem(
      EMPLOYEES_PAGE_STATE_STORAGE_KEY,
      JSON.stringify({
        searchText,
        statusFilter,
      }),
    );
  }, [searchText, statusFilter]);

  useEffect(() => {
    const normalizedFilters = normalizeTableFilters(tableFilters);
    if (Object.keys(normalizedFilters).length > 0) {
      localStorage.setItem(
        TABLE_FILTERS_STORAGE_KEY,
        JSON.stringify(normalizedFilters),
      );
    } else {
      localStorage.removeItem(TABLE_FILTERS_STORAGE_KEY);
    }
  }, [tableFilters]);

  // Загружаем список контрагентов для маппинга имя → ID
  // И проверяем наличие субподрядчиков
  useEffect(() => {
    const loadCounterparties = async () => {
      try {
        const { data } = await counterpartyService.getAll({
          limit: 10000,
          page: 1,
        });
        const counterparties =
          data?.data?.counterparties || data?.counterparties || [];
        const map = {};
        counterparties.forEach((c) => {
          if (c.name) map[c.name] = c.id;
        });
        setCounterpartyMap(map);

        // Проверяем наличие субподрядчиков у текущего контрагента
        if (
          user?.counterpartyId &&
          user.counterpartyId !== defaultCounterpartyId
        ) {
          const availableResponse = await counterpartyService.getAvailable();
          if (availableResponse.data.success) {
            const available = availableResponse.data.data || [];
            // Если доступно больше одного контрагента, значит есть субподрядчики
            setHasSubcontractors(available.length > 1);
          }
        }
      } catch (error) {
        console.warn("Ошибка загрузки контрагентов:", error);
      }
    };
    if (defaultCounterpartyId !== undefined) {
      loadCounterparties();
    }
  }, [user?.counterpartyId, defaultCounterpartyId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSitesModalOpen, setIsSitesModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filesEmployee, setFilesEmployee] = useState(null);
  const [sitesEmployee, setSitesEmployee] = useState(null);

  // Устанавливаем заголовок страницы для мобильной версии
  usePageTitle(t("employees.title"), isMobile);

  // Загружаем ВСЕ сотрудников без фильтрации по статусам (activeOnly = false)
  // Прогрессивная загрузка: сначала первые 100, потом остальные в фоне
  // Преобразуем имя контрагента в ID для фильтрации на сервере
  const counterpartyIdForFilter = useMemo(() => {
    if (!tableFilters.counterparty || tableFilters.counterparty.length === 0)
      return null;
    // Берем первый выбранный контрагент (если выбрано несколько)
    const counterpartyName = tableFilters.counterparty[0];
    return counterpartyMap[counterpartyName] || null;
  }, [tableFilters.counterparty, counterpartyMap]);

  // Флаг готовности фильтра контрагента (маппинг загружен или фильтр не установлен)
  const isCounterpartyFilterReady =
    !tableFilters.counterparty?.length ||
    Object.keys(counterpartyMap).length > 0;

  const {
    employees,
    loading: employeesLoading,
    backgroundLoading,
    totalCount,
    refetch: refetchEmployees,
  } = useEmployees(
    false,
    counterpartyIdForFilter ? { counterpartyId: counterpartyIdForFilter } : {},
    isCounterpartyFilterReady, // Не загружаем пока маппинг не готов
  );
  const { departments, loading: departmentsLoading } = useDepartments();

  // Общий статус загрузки (только первоначальная загрузка)
  const loading = employeesLoading || departmentsLoading || settingsLoading;

  // Определяем права доступа
  const canExport =
    user?.counterpartyId === defaultCounterpartyId && user?.role !== "user";

  // Определяем, должен ли быть виден столбец "Контрагент"
  // Видно для: 1) пользователей с правом экспорта, 2) пользователей с субподрядчиками
  const showCounterpartyColumn = canExport || hasSubcontractors;
  const showDepartmentColumn =
    defaultCounterpartyId && user?.counterpartyId === defaultCounterpartyId;

  // Определяем, может ли пользователь удалять сотрудника
  // Удаление доступно только администраторам
  const canDeleteEmployee = () => {
    return user?.role === "admin";
  };

  const canMarkForDeletion = () => {
    return user?.role === "user";
  };

  // Actions для работы с сотрудниками
  const { createEmployee, updateEmployee, deleteEmployee, updateDepartment } =
    useEmployeeActions(refetchEmployees);

  // Хук проверки ИНН
  const { checkInn } = useCheckInn();

  // Обработчик проверки ИНН с показом модального окна
  const handleCheckInn = async (innValue) => {
    try {
      const foundEmployee = await checkInn(innValue);
      if (foundEmployee) {
        const fullName = [
          foundEmployee.lastName,
          foundEmployee.firstName,
          foundEmployee.middleName,
        ]
          .filter(Boolean)
          .join(" ");

        modal.confirm({
          title: "Сотрудник с таким ИНН уже существует",
          content: `Перейти к редактированию?\n\n${fullName}`,
          okText: "ОК",
          cancelText: "Отмена",
          onOk: () => {
            setIsModalOpen(false);
            setEditingEmployee(null);
            navigate(`/employees/edit/${foundEmployee.id}`);
          },
        });
      }
    } catch (error) {
      // Обработка ошибки 409 - сотрудник найден в другом контрагенте
      if (error.response?.status === 409) {
        modal.error({
          title: "Ошибка",
          content:
            error.response?.data?.message ||
            "Сотрудник с таким ИНН уже существует. Обратитесь к администратору.",
          okText: "ОК",
        });
      } else {
        console.error("Ошибка при проверке ИНН:", error);
      }
    }
  };

  // Мемоизированная фильтрация с учетом поиска и статуса
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Фильтр по статусу
    if (statusFilter) {
      filtered = filtered.filter((employee) => {
        // Находим статусы сотрудника (с поддержкой старых неправильных групп из импорта)
        const cardStatusMapping = employee.statusMappings?.find((m) => {
          const group = m.statusGroup || m.status_group;
          return group === "status_card" || group === "card draft";
        });
        const mainStatusMapping = employee.statusMappings?.find((m) => {
          const group = m.statusGroup || m.status_group;
          return group === "status" || group === "draft";
        });
        const activeStatusMapping = employee.statusMappings?.find(
          (m) =>
            m.statusGroup === "status_active" ||
            m.status_group === "status_active",
        );

        // Получаем основной статус (status_new, status_tb_passed, status_processed)
        const mainStatus = mainStatusMapping?.status?.name;

        // Проверяем статусы (черновик может быть в группе status_card, status или старых группах)
        const isDraft =
          cardStatusMapping?.status?.name === "status_card_draft" ||
          mainStatus === "status_draft";
        const isProcessed =
          cardStatusMapping?.status?.name === "status_card_processed";
        const isFired =
          activeStatusMapping?.status?.name === "status_active_fired";
        const isInactive =
          activeStatusMapping?.status?.name === "status_active_inactive";
        // Действующий = status_new или status_tb_passed или status_processed (аналогично десктопной таблице)
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

    // Фильтр по поисковому запросу
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

  // Мемоизированные уникальные значения для фильтров
  const uniqueFilters = useMemo(
    () => getUniqueFilterValues(filteredEmployees, tableFilters.counterparty),
    [filteredEmployees, tableFilters.counterparty],
  );

  // Handlers
  const handleAdd = () => {
    if (isMobile) {
      // На мобильных переходим на отдельную страницу
      navigate("/employees/add");
    } else {
      // На десктопе открываем модальное окно
      setEditingEmployee(null);
      setIsModalOpen(true);
    }
  };

  const handleEdit = (employee) => {
    if (isMobile) {
      // На мобильных переходим на отдельную страницу
      navigate(`/employees/edit/${employee.id}`);
    } else {
      // На десктопе открываем модальное окно
      setEditingEmployee(employee);
      setIsModalOpen(true);
    }
  };

  const handleView = (employee) => {
    if (isMobile) {
      // На мобильных открываем боковую панель
      setViewingEmployee(employee);
      setIsViewModalOpen(true);
    } else {
      // На десктопе открываем модальное окно
      setViewingEmployee(employee);
      setIsViewModalOpen(true);
    }
  };

  const handleViewFiles = (employee) => {
    setFilesEmployee(employee);
    setIsFilesModalOpen(true);
  };

  const handleCloseFilesModal = () => {
    setIsFilesModalOpen(false);
    setFilesEmployee(null);
  };

  const handleFilesUpdated = () => {
    // Обновляем таблицу при изменении файлов
    refetchEmployees();
  };

  const handleConstructionSitesEdit = (employee) => {
    setSitesEmployee(employee);
    setIsSitesModalOpen(true);
  };

  const handleCloseSitesModal = () => {
    setIsSitesModalOpen(false);
    setSitesEmployee(null);
  };

  const handleSitesUpdated = () => {
    // Обновляем таблицу при изменении объектов
    refetchEmployees();
  };

  const handleRequest = () => {
    if (isMobile) {
      // На мобильных переходим на отдельную страницу
      navigate("/employees/request");
    } else {
      // На десктопе открываем модальное окно
      setIsRequestModalOpen(true);
    }
  };

  const handleDelete = async (id) => {
    await deleteEmployee(id);
    refetchEmployees();
  };

  const handleMarkForDeletion = async (employee) => {
    modal.confirm({
      title: "Пометить сотрудника на удаление?",
      content: `${employee.lastName} ${employee.firstName} будет помечен на удаление.`,
      okText: "Пометить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        await employeeService.markForDeletion(employee.id);
        refetchEmployees();
      },
    });
  };

  const handleDepartmentChange = async (employeeId, departmentId) => {
    await updateDepartment(employeeId, departmentId);
    refetchEmployees();
  };

  const handleFormSuccess = async (values) => {
    if (editingEmployee) {
      // Обновление существующего сотрудника
      const updated = await updateEmployee(editingEmployee.id, values);
      setEditingEmployee(updated);

      // Проверяем есть ли у сотрудника статусы с is_upload = true
      // Если есть - устанавливаем статус "Редактирован" с is_upload = true
      if (
        editingEmployee.statusMappings &&
        editingEmployee.statusMappings.length > 0
      ) {
        const hasUploadedStatus = editingEmployee.statusMappings.some(
          (mapping) => mapping.isUpload,
        );

        if (hasUploadedStatus) {
          try {
            // Устанавливаем статус "Редактирован" с is_upload = true
            await employeeApi.setEditedStatus(editingEmployee.id, true);
          } catch (error) {
            console.warn("Error setting edited status:", error);
            // Не прерываем процесс сохранения если ошибка при установке статуса
          }
        }
      }
    } else {
      // Создание нового сотрудника
      const newEmployee = await createEmployee(values);
      setEditingEmployee(newEmployee);
    }
    refetchEmployees();
  };

  // Сброс фильтров таблицы
  const handleResetFilters = () => {
    setSearchText("");
    setStatusFilter(null);
    setTableFilters({});
    // Инкрементируем триггер для сброса фильтров в таблице
    setResetTrigger((prev) => prev + 1);
  };

  const availableColumns = useMemo(() => {
    const columns = [
      { key: "index", label: "№" },
      { key: "fullName", label: "ФИО" },
      { key: "position", label: "Должность" },
      ...(showDepartmentColumn
        ? [{ key: "department", label: "Подразделение" }]
        : []),
      ...(showCounterpartyColumn
        ? [{ key: "counterparty", label: "Контрагент" }]
        : []),
      { key: "constructionSite", label: "Объект" },
      { key: "citizenship", label: "Гражданство" },
      { key: "statusCard", label: "Заполнен" },
      { key: "createdAt", label: "Дата создания" },
      { key: "files", label: "Файлы" },
      { key: "documentExpiry", label: "Срок действия док." },
      { key: "status", label: "Статус" },
      { key: "actions", label: "Действия" },
    ];

    return columns;
  }, [showCounterpartyColumn, showDepartmentColumn]);

  const handleToggleColumn = (key) => {
    setHiddenColumns((prev) => {
      const next = prev.includes(key)
        ? prev.filter((col) => col !== key)
        : [...prev, key];
      localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleResetColumns = () => {
    setHiddenColumns([]);
    localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify([]));
  };

  return (
    <div
      style={{
        height: "100%", // Занимает всю высоту Content
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // БЕЗ прокрутки на уровне страницы
        backgroundColor: "#fff",
      }}
    >
      {/* Заголовок с поиском и действиями */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          backgroundColor: "#fff",
          padding: "16px",
          borderBottom: "1px solid #f0f0f0",
          flexShrink: 0, // Не сжимается - всегда виден
          marginBottom: 0, // БЕЗ отступа снизу
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Заголовок только на десктопе - на мобильных в Header */}
          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <Title level={2} style={{ margin: 0 }}>
                {t("employees.title")}
              </Title>
              {backgroundLoading && (
                <Tooltip
                  title={`Загрузка данных... (${employees.length} из ${totalCount})`}
                >
                  <SyncOutlined
                    spin
                    style={{ color: "#1890ff", fontSize: 16 }}
                  />
                </Tooltip>
              )}
            </div>
          )}

          {/* На десктопе показываем поиск и кнопку сброса рядом с заголовком */}
          {!isMobile && (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 250 }}>
                <EmployeeSearchFilter
                  searchText={searchText}
                  onSearchChange={setSearchText}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                />
              </div>
              <Button
                type="text"
                danger
                icon={<ClearOutlined />}
                onClick={handleResetFilters}
                title={t("common.reset")}
              >
                {t("common.reset")}
              </Button>
            </div>
          )}
        </div>

        {/* На десктопе показываем действия справа */}
        {!isMobile && (
          <Space size="middle">
            <Dropdown
              trigger={["click"]}
              popupRender={() => (
                <div
                  style={{
                    padding: 12,
                    background: "#fff",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    minWidth: 220,
                  }}
                >
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: "100%" }}
                  >
                    {availableColumns.map((col) => (
                      <Checkbox
                        key={col.key}
                        checked={!hiddenColumns.includes(col.key)}
                        onChange={() => handleToggleColumn(col.key)}
                      >
                        {col.label}
                      </Checkbox>
                    ))}
                    <Button size="small" onClick={handleResetColumns}>
                      Сбросить
                    </Button>
                  </Space>
                </div>
              )}
            >
              <Button type="default">{t("common.columns")}</Button>
            </Dropdown>
            <EmployeeActions
              onAdd={handleAdd}
              onRequest={handleRequest}
              onImport={() => setIsImportModalOpen(true)}
              onSecurity={() => setIsSecurityModalOpen(true)}
              canExport={canExport}
            />
          </Space>
        )}
      </div>

      {/* Поиск на мобильных - отдельной строкой */}
      {isMobile && (
        <div
          style={{
            marginBottom: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "0 16px 12px 16px",
            flexShrink: 0,
          }}
        >
          <EmployeeSearchFilter
            searchText={searchText}
            onSearchChange={setSearchText}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          <div style={{ display: "flex", gap: 12 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              size="large"
              style={{ flex: 1 }}
            >
              {t("common.add")}
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleRequest}
              size="large"
              style={{ flex: 1, background: "#52c41a", borderColor: "#52c41a" }}
            >
              {t("employees.requestExcel")}
            </Button>
          </div>
        </div>
      )}

      {/* Таблица сотрудников на десктопе / Карточки на мобильных */}
      {isMobile ? (
        <MobileEmployeeList
          employees={filteredEmployees}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewFiles={handleViewFiles}
          canExport={canExport}
          canDeleteEmployee={canDeleteEmployee}
          canMarkForDeletion={canMarkForDeletion}
          onMarkForDeletion={handleMarkForDeletion}
        />
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            paddingRight: 15,
          }}
        >
          <EmployeeTable
            employees={filteredEmployees}
            departments={departments}
            loading={loading}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onViewFiles={handleViewFiles}
            onDepartmentChange={handleDepartmentChange}
            canExport={canExport}
            showCounterpartyColumn={showCounterpartyColumn}
            canDeleteEmployee={canDeleteEmployee}
            canMarkForDeletion={canMarkForDeletion}
            onMarkForDeletion={handleMarkForDeletion}
            uniqueFilters={uniqueFilters}
            onFiltersChange={setTableFilters}
            defaultCounterpartyId={defaultCounterpartyId}
            userCounterpartyId={user?.counterpartyId}
            onConstructionSitesEdit={handleConstructionSitesEdit}
            resetTrigger={resetTrigger}
            hiddenColumnKeys={hiddenColumns}
          />
        </div>
      )}

      {/* Модальные окна - для десктопа */}
      {!isMobile && (
        <>
          <EmployeeFormModal
            visible={isModalOpen}
            employee={editingEmployee}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingEmployee(null);
            }}
            onSuccess={handleFormSuccess}
            onCheckInn={handleCheckInn}
          />

          <EmployeeViewModal
            visible={isViewModalOpen}
            employee={viewingEmployee}
            onCancel={() => setIsViewModalOpen(false)}
            onEdit={() => {
              setIsViewModalOpen(false);
              setEditingEmployee(viewingEmployee);
              setIsModalOpen(true);
            }}
          />
        </>
      )}

      {/* Боковая панель просмотра - только для мобильных */}
      {isMobile && (
        <EmployeeViewDrawer
          visible={isViewModalOpen}
          employee={viewingEmployee}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingEmployee(null);
          }}
          onEdit={() => {
            setIsViewModalOpen(false);
            setEditingEmployee(viewingEmployee);
            navigate(`/employees/edit/${viewingEmployee.id}`);
            setViewingEmployee(null);
          }}
        />
      )}

      <EmployeeFilesModal
        visible={isFilesModalOpen}
        employeeId={filesEmployee?.id}
        employeeName={
          filesEmployee
            ? `${filesEmployee.lastName} ${filesEmployee.firstName} ${filesEmployee.middleName || ""}`
            : ""
        }
        onClose={handleCloseFilesModal}
        onFilesUpdated={handleFilesUpdated}
      />

      <EmployeeSitesModal
        visible={isSitesModalOpen}
        employee={sitesEmployee}
        onCancel={handleCloseSitesModal}
        onSuccess={handleSitesUpdated}
      />

      <ApplicationRequestModal
        visible={isRequestModalOpen}
        onCancel={() => {
          setIsRequestModalOpen(false);
          refetchEmployees();
        }}
        employees={filteredEmployees}
        tableFilters={tableFilters}
        userRole={user?.role}
        userCounterpartyId={user?.counterpartyId}
        defaultCounterpartyId={defaultCounterpartyId}
        userId={user?.id}
      />

      <ExportToExcelModal
        visible={isExportModalOpen}
        onCancel={() => {
          setIsExportModalOpen(false);
          refetchEmployees();
        }}
      />

      <EmployeeImportModal
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => refetchEmployees()}
      />

      <SecurityModal
        visible={isSecurityModalOpen}
        onCancel={() => setIsSecurityModalOpen(false)}
        onSuccess={() => refetchEmployees()}
      />
    </div>
  );
};

export default EmployeesPage;
