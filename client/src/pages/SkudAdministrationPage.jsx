import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Card,
  Dropdown,
  Button,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { skudService } from "@/services/skudService";
import { employeeService } from "@/services/employeeService";
import SkudAccessTab from "@/components/Admin/Skud/SkudAccessTab";
import SkudBindCardModal from "@/components/Admin/Skud/SkudBindCardModal";
import SkudCardsTab from "@/components/Admin/Skud/SkudCardsTab";
import SkudEventsTab from "@/components/Admin/Skud/SkudEventsTab";
import SkudPageHeader from "@/components/Admin/Skud/SkudPageHeader";
import SkudQrTab from "@/components/Admin/Skud/SkudQrTab";
import SkudSettingsTab from "@/components/Admin/Skud/SkudSettingsTab";
import SkudSyncTab from "@/components/Admin/Skud/SkudSyncTab";

const { Text } = Typography;

const statusMetaMap = {
  pending: { label: "Ожидает", color: "default" },
  allowed: { label: "Разрешен", color: "green" },
  blocked: { label: "Заблокирован", color: "red" },
  revoked: { label: "Отозван", color: "orange" },
  deleted: { label: "Удален", color: "volcano" },
};

const reasonCodeLabelMap = {
  manual_allow: "Ручное разрешение",
  manual_block: "Ручная блокировка",
  manual_revoke: "Ручной отзыв",
  manual_delete: "Удаление доступа",
  document_expired: "Истекший документ",
  rkl: "РКЛ",
  not_configured: "Не настроен",
  state_missing: "Статус не найден",
  employee_not_found: "Сотрудник не найден",
  employee_inactive: "Сотрудник не активен",
  qr_expired: "QR-код истек",
  qr_invalid: "Невалидный QR-код",
  qr_not_found: "QR-код не найден",
  qr_used: "QR-код уже использован",
  qr_revoked: "QR-код отозван",
  allowed: "Разрешено",
};

const directionLabelMap = {
  1: "Выход",
  2: "Вход",
  3: "Неизвестно",
};

const cardStatusMetaMap = {
  active: { label: "Активна", color: "green" },
  blocked: { label: "Заблокирована", color: "red" },
  unbound: { label: "Не привязана", color: "default" },
  revoked: { label: "Отозвана", color: "orange" },
  lost: { label: "Утеряна", color: "volcano" },
};

const qrStatusMetaMap = {
  active: { label: "Активен", color: "green" },
  used: { label: "Использован", color: "blue" },
  expired: { label: "Истек", color: "orange" },
  revoked: { label: "Отозван", color: "red" },
};

const syncStatusMetaMap = {
  pending: { label: "В очереди", color: "default" },
  processing: { label: "В работе", color: "processing" },
  success: { label: "Успешно", color: "green" },
  failed: { label: "Ошибка", color: "red" },
};

const syncOperationLabelMap = {
  grant_access: "Выдача доступа",
  block_access: "Блокировка доступа",
  revoke_access: "Отзыв доступа",
  remove_access: "Удаление доступа",
  register_card: "Регистрация карты",
  bind_card: "Привязка карты",
  unbind_card: "Отвязка карты",
  block_card: "Блокировка карты",
  allow_card: "Разрешение карты",
  manual_resync: "Ручной resync",
};

const now = dayjs();
const MOCK_ACCESS_ITEMS = [
  {
    id: "mock-access-1",
    employeeId: "mock-employee-1",
    status: "allowed",
    statusReason: "Допуск выдан оператором",
    reasonCode: "manual_allow",
    updatedAt: now.subtract(35, "minute").toISOString(),
    employee: {
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
    },
    isMock: true,
  },
  {
    id: "mock-access-2",
    employeeId: "mock-employee-2",
    status: "blocked",
    statusReason: "Истек срок действия документа",
    reasonCode: "document_expired",
    updatedAt: now.subtract(3, "hour").toISOString(),
    employee: {
      firstName: "Алексей",
      lastName: "Смирнов",
      middleName: "Игоревич",
    },
    isMock: true,
  },
  {
    id: "mock-access-3",
    employeeId: "mock-employee-3",
    status: "revoked",
    statusReason: "Увольнение",
    reasonCode: "manual_revoke",
    updatedAt: now.subtract(1, "day").toISOString(),
    employee: {
      firstName: "Мария",
      lastName: "Кузнецова",
      middleName: "Олеговна",
    },
    isMock: true,
  },
];

const MOCK_EVENT_ITEMS = [
  {
    id: "mock-event-1",
    eventTime: now.subtract(10, "minute").toISOString(),
    employee: {
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
    },
    accessPoint: 2,
    direction: 2,
    allow: true,
    decisionMessage: "",
    logId: 1092,
    isMock: true,
  },
  {
    id: "mock-event-2",
    eventTime: now.subtract(26, "minute").toISOString(),
    employee: {
      firstName: "Алексей",
      lastName: "Смирнов",
      middleName: "Игоревич",
    },
    accessPoint: 1,
    direction: 2,
    allow: false,
    decisionMessage: "Истек срок действия документа",
    logId: 1091,
    isMock: true,
  },
  {
    id: "mock-event-3",
    eventTime: now.subtract(58, "minute").toISOString(),
    externalEmpId: "EXT-221",
    accessPoint: 3,
    direction: 1,
    allow: true,
    decisionMessage: "",
    logId: 1089,
    isMock: true,
  },
];

const MOCK_CARD_ITEMS = [
  {
    id: "mock-card-1",
    cardNumber: "AB-11-2299",
    cardType: "rfid",
    status: "active",
    externalCardId: "SIG-1001",
    updatedAt: now.subtract(45, "minute").toISOString(),
    employeeId: "mock-employee-1",
    employee: {
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
    },
    isMock: true,
  },
  {
    id: "mock-card-2",
    cardNumber: "AC-07-1144",
    cardType: "rfid",
    status: "blocked",
    externalCardId: "SIG-1012",
    updatedAt: now.subtract(5, "hour").toISOString(),
    employeeId: "mock-employee-2",
    employee: {
      firstName: "Алексей",
      lastName: "Смирнов",
      middleName: "Игоревич",
    },
    isMock: true,
  },
  {
    id: "mock-card-3",
    cardNumber: "QR-009-551",
    cardType: "nfc",
    status: "unbound",
    externalCardId: null,
    updatedAt: now.subtract(1, "day").toISOString(),
    employeeId: null,
    employee: null,
    isMock: true,
  },
];

const MOCK_QR_TOKENS = [
  {
    id: "mock-qr-token-1",
    tokenType: "one_time",
    status: "active",
    expiresAt: now.add(3, "minute").toISOString(),
    createdAt: now.subtract(2, "minute").toISOString(),
    employee: {
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
    },
    isMock: true,
  },
  {
    id: "mock-qr-token-2",
    tokenType: "persistent",
    status: "used",
    usedAt: now.subtract(15, "minute").toISOString(),
    expiresAt: now.add(45, "minute").toISOString(),
    createdAt: now.subtract(18, "minute").toISOString(),
    employee: {
      firstName: "Мария",
      lastName: "Кузнецова",
      middleName: "Олеговна",
    },
    isMock: true,
  },
];

const MOCK_QR_DENIES = [
  {
    id: "mock-qr-deny-1",
    eventTime: now.subtract(8, "minute").toISOString(),
    employee: {
      firstName: "Алексей",
      lastName: "Смирнов",
      middleName: "Игоревич",
    },
    decisionMessage: "QR-код истек",
    rawPayload: { reasonCode: "qr_expired" },
    isMock: true,
  },
  {
    id: "mock-qr-deny-2",
    eventTime: now.subtract(35, "minute").toISOString(),
    employee: {
      firstName: "Мария",
      lastName: "Кузнецова",
      middleName: "Олеговна",
    },
    decisionMessage: "Доступ запрещен",
    rawPayload: { reasonCode: "manual_block" },
    isMock: true,
  },
];

const MOCK_SYNC_JOBS = [
  {
    id: "mock-sync-1",
    employeeId: "mock-employee-1",
    operation: "manual_resync",
    status: "success",
    createdAt: now.subtract(9, "minute").toISOString(),
    processedAt: now.subtract(8, "minute").toISOString(),
    employee: {
      firstName: "Иван",
      lastName: "Петров",
      middleName: "Сергеевич",
    },
    errorMessage: null,
    isMock: true,
  },
  {
    id: "mock-sync-2",
    employeeId: "mock-employee-2",
    operation: "grant_access",
    status: "failed",
    createdAt: now.subtract(32, "minute").toISOString(),
    processedAt: now.subtract(30, "minute").toISOString(),
    employee: {
      firstName: "Алексей",
      lastName: "Смирнов",
      middleName: "Игоревич",
    },
    errorMessage: "Не удалось синхронизировать с внешним API",
    isMock: true,
  },
];

const MOCK_STATS = {
  events: { total: 328, allow: 296, deny: 32 },
  accessStates: {
    pending: 12,
    allowed: 148,
    blocked: 23,
    revoked: 11,
    deleted: 7,
  },
};

const DEFAULT_SKUD_SETTINGS = {
  webdelEnabled: false,
  webdelBaseUrl: "",
  webdelBasicUser: "",
  webdelBasicPassword: "",
  webdelBasicPasswordConfigured: false,
  webdelIpAllowlist: "",
  integrationMode: "webdel",
  featureQrEnabled: true,
  featureCardsEnabled: true,
  featureSigurRestEnabled: false,
};

const getStatusMeta = (status) =>
  statusMetaMap[status] || { label: status || "-", color: "default" };

const getReasonCodeLabel = (reasonCode) =>
  reasonCodeLabelMap[reasonCode] || reasonCode || "-";

const getCardStatusMeta = (status) =>
  cardStatusMetaMap[status] || { label: status || "-", color: "default" };

const getQrStatusMeta = (status) =>
  qrStatusMetaMap[status] || { label: status || "-", color: "default" };

const getSyncStatusMeta = (status) =>
  syncStatusMetaMap[status] || { label: status || "-", color: "default" };

const getSyncOperationLabel = (operation) =>
  syncOperationLabelMap[operation] || operation || "-";

const ACCESS_STATUS_OPTIONS = Object.entries(statusMetaMap).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  }),
);

const CARD_STATUS_OPTIONS = Object.entries(cardStatusMetaMap).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  }),
);

const QR_STATUS_OPTIONS = Object.entries(qrStatusMetaMap).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  }),
);

const SYNC_STATUS_OPTIONS = Object.entries(syncStatusMetaMap).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  }),
);

const SkudAdministrationPage = () => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("access");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isStatsMock, setIsStatsMock] = useState(false);

  const [accessLoading, setAccessLoading] = useState(false);
  const [accessItems, setAccessItems] = useState([]);
  const [accessPagination, setAccessPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [accessSearch, setAccessSearch] = useState("");
  const [accessStatusFilter, setAccessStatusFilter] = useState(undefined);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [isAccessMock, setIsAccessMock] = useState(false);

  const [actionReason, setActionReason] = useState("");
  const [actionReasonCode, setActionReasonCode] = useState("");

  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState(undefined);

  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventItems, setEventItems] = useState([]);
  const [eventsPagination, setEventsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [eventsAllowFilter, setEventsAllowFilter] = useState(undefined);
  const [eventsDirectionFilter, setEventsDirectionFilter] = useState(undefined);
  const [eventsAccessPoint, setEventsAccessPoint] = useState("");
  const [eventsRange, setEventsRange] = useState(null);
  const [isEventsMock, setIsEventsMock] = useState(false);

  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardItems, setCardItems] = useState([]);
  const [cardsPagination, setCardsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [cardsSearch, setCardsSearch] = useState("");
  const [cardsStatusFilter, setCardsStatusFilter] = useState(undefined);
  const [isCardsMock, setIsCardsMock] = useState(false);

  const [registerCardNumber, setRegisterCardNumber] = useState("");
  const [registerCardType, setRegisterCardType] = useState("rfid");
  const [registerCardExternalId, setRegisterCardExternalId] = useState("");
  const [registerCardEmployeeId, setRegisterCardEmployeeId] =
    useState(undefined);

  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindCardTarget, setBindCardTarget] = useState(null);
  const [bindEmployeeId, setBindEmployeeId] = useState(undefined);

  const [qrTokensLoading, setQrTokensLoading] = useState(false);
  const [qrTokens, setQrTokens] = useState([]);
  const [qrTokensPagination, setQrTokensPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [qrStatusFilter, setQrStatusFilter] = useState(undefined);
  const [isQrMock, setIsQrMock] = useState(false);

  const [qrDeniesLoading, setQrDeniesLoading] = useState(false);
  const [qrDenies, setQrDenies] = useState([]);

  const [qrEmployeeId, setQrEmployeeId] = useState(undefined);
  const [qrTokenType, setQrTokenType] = useState("persistent");
  const [qrTtlMinutes, setQrTtlMinutes] = useState(5);
  const [generatedQrPayload, setGeneratedQrPayload] = useState(null);

  const [qrValidateToken, setQrValidateToken] = useState("");
  const [qrValidationResult, setQrValidationResult] = useState(null);

  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsCheckLoading, setSettingsCheckLoading] = useState(false);
  const [skudSettings, setSkudSettings] = useState(DEFAULT_SKUD_SETTINGS);
  const [settingsCheckResult, setSettingsCheckResult] = useState(null);

  const [syncJobsLoading, setSyncJobsLoading] = useState(false);
  const [syncJobs, setSyncJobs] = useState([]);
  const [syncJobsPagination, setSyncJobsPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [syncStatusFilter, setSyncStatusFilter] = useState(undefined);
  const [syncOperationFilter, setSyncOperationFilter] = useState("");
  const [isSyncMock, setIsSyncMock] = useState(false);
  const [lastSyncByEmployee, setLastSyncByEmployee] = useState({});

  const [actionResult, setActionResult] = useState(null);

  const accessPage = accessPagination.current;
  const accessPageSize = accessPagination.pageSize;
  const eventsPage = eventsPagination.current;
  const eventsPageSize = eventsPagination.pageSize;
  const cardsPage = cardsPagination.current;
  const cardsPageSize = cardsPagination.pageSize;
  const qrTokensPage = qrTokensPagination.current;
  const qrTokensPageSize = qrTokensPagination.pageSize;
  const syncJobsPage = syncJobsPagination.current;
  const syncJobsPageSize = syncJobsPagination.pageSize;

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await skudService.getStats();
      if (response.data) {
        setStats(response.data);
        setIsStatsMock(false);
      } else {
        setStats(MOCK_STATS);
        setIsStatsMock(true);
      }
    } catch {
      setStats(MOCK_STATS);
      setIsStatsMock(true);
      message.warning("Показаны демо-данные статистики СКУД");
    } finally {
      setStatsLoading(false);
    }
  }, [message]);

  const loadAccessStates = useCallback(async () => {
    setAccessLoading(true);
    try {
      const [skudResponse, employeesResponse, syncResponse] = await Promise.all(
        [
          skudService.getAccessStates({
            page: accessPage,
            limit: accessPageSize,
            status:
              accessStatusFilter && accessStatusFilter !== "pending"
                ? accessStatusFilter
                : undefined,
            q: accessSearch || undefined,
          }),
          employeeService.getAll({
            page: accessPage,
            limit: accessPageSize,
            search: accessSearch || undefined,
          }),
          skudService.getSyncJobs({
            page: 1,
            limit: 100,
          }),
        ],
      );

      const skudItems = skudResponse.data?.items || [];
      const employees = employeesResponse.data?.employees || [];
      const syncItems = syncResponse.data?.items || [];
      const syncByEmployee = syncItems.reduce((acc, job) => {
        if (job?.employeeId && !acc[job.employeeId]) {
          acc[job.employeeId] = job;
        }
        return acc;
      }, {});
      setLastSyncByEmployee(syncByEmployee);

      const attachSync = (rows) =>
        rows.map((row) => ({
          ...row,
          latestSyncJob: row.employeeId
            ? syncByEmployee[row.employeeId] || null
            : null,
        }));

      // Для общего списка и pending показываем всех сотрудников с "наложением" текущих состояний.
      if (!accessStatusFilter || accessStatusFilter === "pending") {
        const skudByEmployeeId = new Map(
          skudItems.map((item) => [item.employeeId, item]),
        );

        let mergedRows = employees.map((employee) => {
          const existingState = skudByEmployeeId.get(employee.id);
          if (existingState) {
            return existingState;
          }
          return {
            id: `synthetic-${employee.id}`,
            employeeId: employee.id,
            status: "pending",
            statusReason: "Доступ не настроен",
            reasonCode: "not_configured",
            updatedAt: employee.updatedAt || employee.createdAt || null,
            employee: {
              firstName: employee.firstName,
              lastName: employee.lastName,
              middleName: employee.middleName,
            },
            isSynthetic: true,
          };
        });

        if (accessStatusFilter === "pending") {
          mergedRows = mergedRows.filter((row) => row.status === "pending");
        }

        if (mergedRows.length > 0) {
          setAccessItems(attachSync(mergedRows));
          setAccessPagination((prev) => ({
            ...prev,
            total:
              employeesResponse.data?.pagination?.total || mergedRows.length,
          }));
          setIsAccessMock(false);
        } else {
          setAccessItems(MOCK_ACCESS_ITEMS);
          setAccessPagination((prev) => ({
            ...prev,
            total: MOCK_ACCESS_ITEMS.length,
          }));
          setIsAccessMock(true);
        }
      } else {
        if (skudItems.length > 0) {
          setAccessItems(attachSync(skudItems));
          setAccessPagination((prev) => ({
            ...prev,
            total: skudResponse.data?.pagination?.total || skudItems.length,
          }));
          setIsAccessMock(false);
        } else {
          setAccessItems([]);
          setAccessPagination((prev) => ({
            ...prev,
            total: 0,
          }));
          setIsAccessMock(false);
        }
      }

      setSelectedEmployeeIds([]);
    } catch {
      setAccessItems(MOCK_ACCESS_ITEMS);
      setLastSyncByEmployee({});
      setAccessPagination((prev) => ({
        ...prev,
        total: MOCK_ACCESS_ITEMS.length,
      }));
      setIsAccessMock(true);
      setSelectedEmployeeIds([]);
      message.warning("Показаны демо-данные по доступам СКУД");
    } finally {
      setAccessLoading(false);
    }
  }, [accessPage, accessPageSize, accessSearch, accessStatusFilter, message]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await skudService.getEvents({
        page: eventsPage,
        limit: eventsPageSize,
        allow: eventsAllowFilter,
        direction: eventsDirectionFilter,
        accessPoint: eventsAccessPoint || undefined,
        dateFrom: eventsRange?.[0]
          ? eventsRange[0].startOf("day").toISOString()
          : undefined,
        dateTo: eventsRange?.[1]
          ? eventsRange[1].endOf("day").toISOString()
          : undefined,
      });

      const items = response.data?.items || [];
      if (items.length > 0) {
        setEventItems(items);
        setEventsPagination((prev) => ({
          ...prev,
          total: response.data?.pagination?.total || items.length,
        }));
        setIsEventsMock(false);
      } else {
        setEventItems(MOCK_EVENT_ITEMS);
        setEventsPagination((prev) => ({
          ...prev,
          total: MOCK_EVENT_ITEMS.length,
        }));
        setIsEventsMock(true);
      }
    } catch {
      setEventItems(MOCK_EVENT_ITEMS);
      setEventsPagination((prev) => ({
        ...prev,
        total: MOCK_EVENT_ITEMS.length,
      }));
      setIsEventsMock(true);
      message.warning("Показаны демо-данные событий СКУД");
    } finally {
      setEventsLoading(false);
    }
  }, [
    eventsPage,
    eventsPageSize,
    eventsAllowFilter,
    eventsDirectionFilter,
    eventsAccessPoint,
    eventsRange,
    message,
  ]);

  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    try {
      const response = await skudService.getCards({
        page: cardsPage,
        limit: cardsPageSize,
        status: cardsStatusFilter || undefined,
        q: cardsSearch || undefined,
      });

      const items = response.data?.items || [];
      setCardItems(items);
      setCardsPagination((prev) => ({
        ...prev,
        total: response.data?.pagination?.total || items.length,
      }));
      setIsCardsMock(false);
    } catch {
      setCardItems(MOCK_CARD_ITEMS);
      setCardsPagination((prev) => ({
        ...prev,
        total: MOCK_CARD_ITEMS.length,
      }));
      setIsCardsMock(true);
      message.warning("Показаны демо-данные карт СКУД");
    } finally {
      setCardsLoading(false);
    }
  }, [cardsPage, cardsPageSize, cardsSearch, cardsStatusFilter, message]);

  const loadQrData = useCallback(async () => {
    setQrTokensLoading(true);
    setQrDeniesLoading(true);
    try {
      const [tokensResponse, deniesResponse] = await Promise.all([
        skudService.getQrTokens({
          page: qrTokensPage,
          limit: qrTokensPageSize,
          status: qrStatusFilter || undefined,
        }),
        skudService.getQrDenies({
          page: 1,
          limit: 20,
        }),
      ]);

      const tokens = tokensResponse.data?.items || [];
      const denies = deniesResponse.data?.items || [];

      setQrTokens(tokens);
      setQrTokensPagination((prev) => ({
        ...prev,
        total: tokensResponse.data?.pagination?.total || tokens.length,
      }));
      setQrDenies(denies);
      setIsQrMock(false);
    } catch {
      setQrTokens(MOCK_QR_TOKENS);
      setQrDenies(MOCK_QR_DENIES);
      setQrTokensPagination((prev) => ({
        ...prev,
        total: MOCK_QR_TOKENS.length,
      }));
      setIsQrMock(true);
      message.warning("Показаны демо-данные QR СКУД");
    } finally {
      setQrTokensLoading(false);
      setQrDeniesLoading(false);
    }
  }, [qrTokensPage, qrTokensPageSize, qrStatusFilter, message]);

  const loadSkudSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await skudService.getSettings();
      setSkudSettings({
        ...DEFAULT_SKUD_SETTINGS,
        ...(response.data || {}),
      });
      setSettingsCheckResult(null);
    } catch (error) {
      message.error(
        error.userMessage ||
          error.message ||
          "Не удалось загрузить настройки СКУД",
      );
    } finally {
      setSettingsLoading(false);
    }
  }, [message]);

  const loadSyncJobs = useCallback(async () => {
    setSyncJobsLoading(true);
    try {
      const response = await skudService.getSyncJobs({
        page: syncJobsPage,
        limit: syncJobsPageSize,
        status: syncStatusFilter || undefined,
        operation: syncOperationFilter || undefined,
      });

      const items = response.data?.items || [];
      setSyncJobs(items);
      setSyncJobsPagination((prev) => ({
        ...prev,
        total: response.data?.pagination?.total || items.length,
      }));

      const latestByEmployee = {};
      items.forEach((job) => {
        if (!job.employeeId) return;
        if (!latestByEmployee[job.employeeId]) {
          latestByEmployee[job.employeeId] = job;
        }
      });
      setLastSyncByEmployee(latestByEmployee);
      setIsSyncMock(false);
    } catch {
      setSyncJobs(MOCK_SYNC_JOBS);
      setSyncJobsPagination((prev) => ({
        ...prev,
        total: MOCK_SYNC_JOBS.length,
      }));
      setLastSyncByEmployee(
        MOCK_SYNC_JOBS.reduce((acc, job) => {
          if (job.employeeId && !acc[job.employeeId]) {
            acc[job.employeeId] = job;
          }
          return acc;
        }, {}),
      );
      setIsSyncMock(true);
      message.warning("Показаны демо-данные синхронизации СКУД");
    } finally {
      setSyncJobsLoading(false);
    }
  }, [
    syncJobsPage,
    syncJobsPageSize,
    syncStatusFilter,
    syncOperationFilter,
    message,
  ]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!["access", "cards", "qr", "sync"].includes(activeTab)) return;

    const preloadEmployees = async () => {
      try {
        const response = await employeeService.getAll({ page: 1, limit: 20 });
        const employees = response.data?.employees || [];
        setEmployeeOptions(
          employees.map((employee) => ({
            value: employee.id,
            label: `${employee.lastName || ""} ${employee.firstName || ""} ${
              employee.middleName || ""
            }`.trim(),
          })),
        );
      } catch {
        setEmployeeOptions([]);
      }
    };

    preloadEmployees();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "access") {
      loadAccessStates();
    }
  }, [activeTab, loadAccessStates]);

  useEffect(() => {
    if (activeTab === "events") {
      loadEvents();
    }
  }, [activeTab, loadEvents]);

  useEffect(() => {
    if (activeTab === "cards") {
      loadCards();
    }
  }, [activeTab, loadCards]);

  useEffect(() => {
    if (activeTab === "qr") {
      loadQrData();
    }
  }, [activeTab, loadQrData]);

  useEffect(() => {
    if (activeTab === "settings") {
      loadSkudSettings();
    }
  }, [activeTab, loadSkudSettings]);

  useEffect(() => {
    if (activeTab === "sync") {
      loadSyncJobs();
    }
  }, [activeTab, loadSyncJobs]);

  const searchEmployees = async (value) => {
    const q = value?.trim();
    if (!q) {
      setEmployeeOptions([]);
      return;
    }

    setEmployeeSearchLoading(true);
    try {
      const response = await employeeService.getAll({
        search: q,
        limit: 20,
        page: 1,
      });
      const employees = response.data?.employees || [];
      setEmployeeOptions(
        employees.map((employee) => ({
          value: employee.id,
          label: `${employee.lastName || ""} ${employee.firstName || ""} ${
            employee.middleName || ""
          }`.trim(),
        })),
      );
    } catch {
      message.error("Не удалось выполнить поиск сотрудников");
    } finally {
      setEmployeeSearchLoading(false);
    }
  };

  const mutateSingle = useCallback(
    async (action, employeeId) => {
      const payload = {
        employeeId,
        reason: actionReason || undefined,
        reasonCode: actionReasonCode || undefined,
      };

      if (action === "grant") {
        await skudService.grantAccess(payload);
        return;
      }
      if (action === "block") {
        await skudService.blockAccess(payload);
        return;
      }
      if (action === "revoke") {
        await skudService.revokeAccess(payload);
        return;
      }
      if (action === "delete") {
        await skudService.deleteAccess(employeeId, {
          reason: actionReason || undefined,
          reasonCode: actionReasonCode || undefined,
        });
        return;
      }
      if (action === "resync") {
        await skudService.resyncEmployee({
          employeeId,
          reason: actionReason || undefined,
        });
      }
    },
    [actionReason, actionReasonCode],
  );

  const mutateBatch = useCallback(
    async (action) => {
      if (!selectedEmployeeIds.length) {
        message.warning("Выберите сотрудников в таблице");
        return;
      }

      const response = await skudService.batchMutateAccess({
        action,
        employeeIds: selectedEmployeeIds,
        reason: actionReason || undefined,
        reasonCode: actionReasonCode || undefined,
      });

      const failedCount = response.data?.failedCount || 0;
      if (failedCount > 0) {
        message.warning(`Операция завершена частично. Ошибок: ${failedCount}`);
        return;
      }
      message.success("Массовая операция выполнена");
    },
    [selectedEmployeeIds, actionReason, actionReasonCode, message],
  );

  const mutateResyncBatch = useCallback(async () => {
    if (!selectedEmployeeIds.length) {
      message.warning("Выберите сотрудников в таблице");
      return;
    }

    const results = await Promise.allSettled(
      selectedEmployeeIds.map((employeeId) =>
        skudService.resyncEmployee({
          employeeId,
          reason: actionReason || undefined,
        }),
      ),
    );
    const failedCount = results.filter(
      (item) => item.status === "rejected",
    ).length;
    if (failedCount > 0) {
      message.warning(`Resync завершен частично. Ошибок: ${failedCount}`);
      return;
    }
    message.success("Resync для выбранных сотрудников поставлен в очередь");
  }, [selectedEmployeeIds, actionReason, message]);

  const runAction = useCallback(
    async (action, employeeId = null) => {
      if (isAccessMock) {
        message.warning("Операции недоступны на демо-данных");
        return;
      }

      try {
        if (employeeId) {
          await mutateSingle(action, employeeId);
          message.success(
            action === "resync"
              ? "Resync поставлен в очередь"
              : "Операция выполнена",
          );
          setActionResult({
            type: "success",
            text:
              action === "resync"
                ? "Ручной resync поставлен в очередь"
                : "Операция успешно выполнена",
            at: new Date().toISOString(),
          });
        } else {
          if (action === "resync") {
            await mutateResyncBatch();
          } else {
            await mutateBatch(action);
          }
          setActionResult({
            type: "success",
            text:
              action === "resync"
                ? "Resync по выбранным сотрудникам поставлен в очередь"
                : "Массовая операция успешно выполнена",
            at: new Date().toISOString(),
          });
        }
        await Promise.all([loadAccessStates(), loadStats(), loadSyncJobs()]);
        if (activeTab === "events") {
          await loadEvents();
        }
      } catch (error) {
        setActionResult({
          type: "error",
          text:
            error.userMessage ||
            error.message ||
            "Ошибка при выполнении операции",
          at: new Date().toISOString(),
        });
        message.error(
          error.userMessage ||
            error.message ||
            "Ошибка при выполнении операции",
        );
      }
    },
    [
      isAccessMock,
      message,
      loadAccessStates,
      loadStats,
      loadSyncJobs,
      activeTab,
      loadEvents,
      mutateSingle,
      mutateBatch,
      mutateResyncBatch,
    ],
  );

  const allowSelectedEmployee = async () => {
    if (!targetEmployeeId) {
      message.warning("Выберите сотрудника");
      return;
    }
    await runAction("grant", targetEmployeeId);
  };

  const registerCard = async () => {
    if (isCardsMock) {
      message.warning("Операции недоступны на демо-данных");
      return;
    }

    if (!registerCardNumber.trim()) {
      message.warning("Введите номер карты");
      return;
    }

    try {
      await skudService.registerCard({
        cardNumber: registerCardNumber.trim(),
        cardType: registerCardType || "rfid",
        externalCardId: registerCardExternalId.trim() || undefined,
        employeeId: registerCardEmployeeId || undefined,
      });
      message.success("Карта зарегистрирована");
      setRegisterCardNumber("");
      setRegisterCardExternalId("");
      setRegisterCardEmployeeId(undefined);
      await loadCards();
    } catch (error) {
      message.error(
        error.userMessage || error.message || "Ошибка при регистрации карты",
      );
    }
  };

  const runCardAction = useCallback(
    async (action, cardRecord) => {
      if (!cardRecord?.id) return;
      if (cardRecord.isMock || isCardsMock) {
        message.warning("Операции недоступны на демо-данных");
        return;
      }

      try {
        if (action === "bind") {
          setBindCardTarget(cardRecord);
          setBindModalOpen(true);
          return;
        }
        if (action === "unbind") {
          await skudService.unbindCard({ cardId: cardRecord.id });
        } else if (action === "block") {
          await skudService.blockCard({ cardId: cardRecord.id });
        } else if (action === "allow") {
          await skudService.allowCard({ cardId: cardRecord.id });
        } else {
          return;
        }

        message.success("Операция с картой выполнена");
        await loadCards();
      } catch (error) {
        message.error(
          error.userMessage || error.message || "Ошибка операции с картой",
        );
      }
    },
    [isCardsMock, message, loadCards],
  );

  const confirmBindCard = async () => {
    if (!bindCardTarget?.id) {
      message.warning("Карта не выбрана");
      return;
    }
    if (!bindEmployeeId) {
      message.warning("Выберите сотрудника для привязки");
      return;
    }

    try {
      await skudService.bindCard({
        cardId: bindCardTarget.id,
        employeeId: bindEmployeeId,
      });
      message.success("Карта привязана к сотруднику");
      setBindModalOpen(false);
      setBindCardTarget(null);
      setBindEmployeeId(undefined);
      await loadCards();
    } catch (error) {
      message.error(
        error.userMessage || error.message || "Ошибка привязки карты",
      );
    }
  };

  const handleGenerateQr = async () => {
    if (isQrMock) {
      message.warning("Операции недоступны на демо-данных");
      return;
    }
    if (!qrEmployeeId) {
      message.warning("Выберите сотрудника");
      return;
    }

    try {
      const response = await skudService.generateQr({
        employeeId: qrEmployeeId,
        tokenType: qrTokenType,
        ttlSeconds: Math.max(1, Number(qrTtlMinutes || 5)) * 60,
      });
      setGeneratedQrPayload(response.data || null);
      message.success("QR-код сформирован");
      await loadQrData();
    } catch (error) {
      message.error(
        error.userMessage || error.message || "Ошибка генерации QR",
      );
    }
  };

  const handleValidateQr = async () => {
    if (!qrValidateToken.trim()) {
      message.warning("Введите токен QR");
      return;
    }

    try {
      const response = await skudService.validateQr({
        token: qrValidateToken.trim(),
      });
      setQrValidationResult(response.data || null);
      if (response.data?.allow) {
        message.success("Доступ разрешен");
      } else {
        message.warning(response.data?.message || "Доступ запрещен");
      }
      await loadQrData();
    } catch (error) {
      message.error(error.userMessage || error.message || "Ошибка проверки QR");
    }
  };

  const updateSkudSettingField = (field, value) => {
    setSkudSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const buildSettingsPayload = () => {
    const payload = {
      webdelEnabled: Boolean(skudSettings.webdelEnabled),
      webdelBaseUrl: skudSettings.webdelBaseUrl || "",
      webdelBasicUser: skudSettings.webdelBasicUser || "",
      webdelIpAllowlist: skudSettings.webdelIpAllowlist || "",
      integrationMode: skudSettings.integrationMode || "webdel",
      featureQrEnabled: Boolean(skudSettings.featureQrEnabled),
      featureCardsEnabled: Boolean(skudSettings.featureCardsEnabled),
      featureSigurRestEnabled: Boolean(skudSettings.featureSigurRestEnabled),
    };

    const password = skudSettings.webdelBasicPassword || "";
    const isMaskedPassword =
      password === "********" && skudSettings.webdelBasicPasswordConfigured;
    if (!isMaskedPassword) {
      payload.webdelBasicPassword = password;
    }

    return payload;
  };

  const handleSaveSkudSettings = async () => {
    setSettingsSaving(true);
    try {
      await skudService.updateSettings(buildSettingsPayload());
      message.success("Настройки СКУД сохранены");
      await loadSkudSettings();
    } catch (error) {
      message.error(
        error.userMessage || error.message || "Не удалось сохранить настройки",
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCheckSkudConnection = async () => {
    setSettingsCheckLoading(true);
    try {
      const response = await skudService.checkSettings(buildSettingsPayload());
      setSettingsCheckResult(response.data || null);
      if (response.data?.ok) {
        message.success("Проверка подключения выполнена");
      } else {
        message.warning(
          response.data?.message || "Подключение не подтверждено",
        );
      }
    } catch (error) {
      message.error(
        error.userMessage ||
          error.message ||
          "Не удалось проверить подключение",
      );
    } finally {
      setSettingsCheckLoading(false);
    }
  };

  const accessColumns = useMemo(
    () => [
      {
        title: "Сотрудник",
        key: "employee",
        render: (_, record) => {
          const employee = record.employee;
          if (!employee) return "-";
          return `${employee.lastName || ""} ${employee.firstName || ""} ${
            employee.middleName || ""
          }`.trim();
        },
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 160,
        render: (value) => {
          const meta = getStatusMeta(value);
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: "Причина",
        dataIndex: "statusReason",
        ellipsis: true,
        render: (value) => value || "-",
      },
      {
        title: "Код причины",
        dataIndex: "reasonCode",
        width: 190,
        render: (value) => getReasonCodeLabel(value),
      },
      {
        title: "Обновлено",
        dataIndex: "updatedAt",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-",
      },
      {
        title: "Синхронизация",
        key: "sync",
        width: 210,
        render: (_, record) => {
          const syncJob =
            record.latestSyncJob || lastSyncByEmployee[record.employeeId];
          if (!syncJob) return "-";
          const meta = getSyncStatusMeta(syncJob.status);
          return (
            <Space direction="vertical" size={2}>
              <Tag color={meta.color}>{meta.label}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {getSyncOperationLabel(syncJob.operation)}
              </Text>
              {syncJob.status === "failed" && syncJob.errorMessage ? (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {syncJob.errorMessage}
                </Text>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: "Действия",
        key: "actions",
        width: 170,
        render: (_, record) => (
          <Dropdown
            disabled={record.isMock || !record.employeeId}
            trigger={["click"]}
            menu={{
              items: [
                { key: "grant", label: "Разрешить" },
                { key: "block", label: "Блокировать" },
                { key: "revoke", label: "Отозвать" },
                { key: "resync", label: "Ручной resync" },
                {
                  key: "delete",
                  label: "Удалить доступ",
                  danger: true,
                },
              ],
              onClick: ({ key }) => runAction(key, record.employeeId),
            }}
          >
            <Button size="small">Действия</Button>
          </Dropdown>
        ),
      },
    ],
    [runAction, lastSyncByEmployee],
  );

  const eventsColumns = useMemo(
    () => [
      {
        title: "Время",
        dataIndex: "eventTime",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm:ss") : "-",
      },
      {
        title: "Сотрудник",
        key: "employee",
        render: (_, record) => {
          if (!record.employee) {
            return record.externalEmpId
              ? `Внешний ID: ${record.externalEmpId}`
              : "-";
          }
          return `${record.employee.lastName || ""} ${record.employee.firstName || ""} ${
            record.employee.middleName || ""
          }`.trim();
        },
      },
      {
        title: "Точка",
        dataIndex: "accessPoint",
        width: 90,
        render: (value) => value ?? "-",
      },
      {
        title: "Направление",
        dataIndex: "direction",
        width: 120,
        render: (value) => directionLabelMap[value] || "-",
      },
      {
        title: "Решение",
        dataIndex: "allow",
        width: 130,
        render: (value) => {
          if (value === true) return <Tag color="green">Разрешено</Tag>;
          if (value === false) return <Tag color="red">Запрещено</Tag>;
          return <Tag>Событие</Tag>;
        },
      },
      {
        title: "Сообщение",
        dataIndex: "decisionMessage",
        render: (value) => value || "-",
      },
      {
        title: "logId",
        dataIndex: "logId",
        width: 110,
        render: (value) => value ?? "-",
      },
    ],
    [],
  );

  const cardsColumns = useMemo(
    () => [
      {
        title: "Номер карты",
        dataIndex: "cardNumber",
        width: 170,
        render: (value) => value || "-",
      },
      {
        title: "Тип",
        dataIndex: "cardType",
        width: 100,
        render: (value) => (value ? String(value).toUpperCase() : "-"),
      },
      {
        title: "Внешний ID",
        dataIndex: "externalCardId",
        width: 130,
        render: (value) => value || "-",
      },
      {
        title: "Сотрудник",
        key: "employee",
        render: (_, record) => {
          if (!record.employee) return "-";
          return `${record.employee.lastName || ""} ${record.employee.firstName || ""} ${
            record.employee.middleName || ""
          }`.trim();
        },
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 150,
        render: (value) => {
          const meta = getCardStatusMeta(value);
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: "Обновлено",
        dataIndex: "updatedAt",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-",
      },
      {
        title: "Действия",
        key: "actions",
        width: 170,
        render: (_, record) => {
          const menuItems = [
            { key: "bind", label: "Привязать" },
            {
              key: "unbind",
              label: "Отвязать",
              disabled: !record.employeeId,
            },
            {
              key: "block",
              label: "Блокировать",
              danger: true,
              disabled: record.status === "blocked",
            },
            {
              key: "allow",
              label: "Разрешить",
              disabled: !["blocked", "unbound"].includes(record.status),
            },
          ];

          return (
            <Dropdown
              disabled={record.isMock || isCardsMock}
              trigger={["click"]}
              menu={{
                items: menuItems,
                onClick: ({ key }) => runCardAction(key, record),
              }}
            >
              <Button size="small">Действия</Button>
            </Dropdown>
          );
        },
      },
    ],
    [isCardsMock, runCardAction],
  );

  const qrTokenColumns = useMemo(
    () => [
      {
        title: "Сотрудник",
        key: "employee",
        render: (_, record) => {
          if (!record.employee) return "-";
          return `${record.employee.lastName || ""} ${record.employee.firstName || ""} ${
            record.employee.middleName || ""
          }`.trim();
        },
      },
      {
        title: "Тип",
        dataIndex: "tokenType",
        width: 130,
        render: (value) =>
          value === "one_time" ? "Одноразовый" : "Постоянный",
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 130,
        render: (value) => {
          const meta = getQrStatusMeta(value);
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: "Истекает",
        dataIndex: "expiresAt",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm:ss") : "-",
      },
      {
        title: "Создан",
        dataIndex: "createdAt",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm:ss") : "-",
      },
    ],
    [],
  );

  const qrDenyColumns = useMemo(
    () => [
      {
        title: "Время",
        dataIndex: "eventTime",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm:ss") : "-",
      },
      {
        title: "Сотрудник",
        key: "employee",
        render: (_, record) => {
          if (!record.employee) return "-";
          return `${record.employee.lastName || ""} ${record.employee.firstName || ""} ${
            record.employee.middleName || ""
          }`.trim();
        },
      },
      {
        title: "Причина",
        dataIndex: "decisionMessage",
        render: (value) => value || "-",
      },
      {
        title: "Код причины",
        key: "reasonCode",
        width: 190,
        render: (_, record) =>
          getReasonCodeLabel(record.rawPayload?.reasonCode || null),
      },
    ],
    [],
  );

  const syncColumns = useMemo(
    () => [
      {
        title: "Время",
        dataIndex: "createdAt",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm:ss") : "-",
      },
      {
        title: "Сотрудник",
        key: "employee",
        render: (_, record) => {
          if (!record.employee) return "-";
          return `${record.employee.lastName || ""} ${record.employee.firstName || ""} ${
            record.employee.middleName || ""
          }`.trim();
        },
      },
      {
        title: "Операция",
        dataIndex: "operation",
        width: 180,
        render: (value) => getSyncOperationLabel(value),
      },
      {
        title: "Статус",
        dataIndex: "status",
        width: 130,
        render: (value) => {
          const meta = getSyncStatusMeta(value);
          return <Tag color={meta.color}>{meta.label}</Tag>;
        },
      },
      {
        title: "Ошибка/причина",
        dataIndex: "errorMessage",
        render: (value) => value || "-",
      },
      {
        title: "Обработано",
        dataIndex: "processedAt",
        width: 170,
        render: (value) =>
          value ? dayjs(value).format("DD.MM.YYYY HH:mm:ss") : "-",
      },
    ],
    [],
  );

  const accessTab = (
    <SkudAccessTab
      stats={stats}
      statsLoading={statsLoading}
      actionResult={actionResult}
      setActionResult={setActionResult}
      accessSearch={accessSearch}
      setAccessSearch={setAccessSearch}
      accessPagination={accessPagination}
      setAccessPagination={setAccessPagination}
      accessStatusFilter={accessStatusFilter}
      setAccessStatusFilter={setAccessStatusFilter}
      accessStatusOptions={ACCESS_STATUS_OPTIONS}
      actionReason={actionReason}
      setActionReason={setActionReason}
      actionReasonCode={actionReasonCode}
      setActionReasonCode={setActionReasonCode}
      loadAccessStates={loadAccessStates}
      isAccessMock={isAccessMock}
      targetEmployeeId={targetEmployeeId}
      setTargetEmployeeId={setTargetEmployeeId}
      searchEmployees={searchEmployees}
      employeeOptions={employeeOptions}
      employeeSearchLoading={employeeSearchLoading}
      allowSelectedEmployee={allowSelectedEmployee}
      runAction={runAction}
      accessColumns={accessColumns}
      accessItems={accessItems}
      accessLoading={accessLoading}
      selectedEmployeeIds={selectedEmployeeIds}
      setSelectedEmployeeIds={setSelectedEmployeeIds}
    />
  );

  const eventsTab = (
    <SkudEventsTab
      stats={stats}
      statsLoading={statsLoading}
      eventsAllowFilter={eventsAllowFilter}
      setEventsAllowFilter={setEventsAllowFilter}
      eventsDirectionFilter={eventsDirectionFilter}
      setEventsDirectionFilter={setEventsDirectionFilter}
      eventsAccessPoint={eventsAccessPoint}
      setEventsAccessPoint={setEventsAccessPoint}
      eventsRange={eventsRange}
      setEventsRange={setEventsRange}
      setEventsPagination={setEventsPagination}
      loadEvents={loadEvents}
      eventsColumns={eventsColumns}
      eventItems={eventItems}
      eventsLoading={eventsLoading}
      eventsPagination={eventsPagination}
    />
  );

  const cardsTab = (
    <SkudCardsTab
      stats={stats}
      statsLoading={statsLoading}
      cardsSearch={cardsSearch}
      setCardsSearch={setCardsSearch}
      setCardsPagination={setCardsPagination}
      cardsStatusFilter={cardsStatusFilter}
      setCardsStatusFilter={setCardsStatusFilter}
      cardStatusOptions={CARD_STATUS_OPTIONS}
      loadCards={loadCards}
      isCardsMock={isCardsMock}
      registerCardNumber={registerCardNumber}
      setRegisterCardNumber={setRegisterCardNumber}
      registerCardType={registerCardType}
      setRegisterCardType={setRegisterCardType}
      registerCardExternalId={registerCardExternalId}
      setRegisterCardExternalId={setRegisterCardExternalId}
      registerCardEmployeeId={registerCardEmployeeId}
      setRegisterCardEmployeeId={setRegisterCardEmployeeId}
      searchEmployees={searchEmployees}
      employeeOptions={employeeOptions}
      employeeSearchLoading={employeeSearchLoading}
      registerCard={registerCard}
      cardsColumns={cardsColumns}
      cardItems={cardItems}
      cardsLoading={cardsLoading}
      cardsPagination={cardsPagination}
    />
  );

  const qrTab = (
    <SkudQrTab
      stats={stats}
      statsLoading={statsLoading}
      isQrMock={isQrMock}
      qrEmployeeId={qrEmployeeId}
      setQrEmployeeId={setQrEmployeeId}
      searchEmployees={searchEmployees}
      employeeOptions={employeeOptions}
      employeeSearchLoading={employeeSearchLoading}
      qrTokenType={qrTokenType}
      setQrTokenType={setQrTokenType}
      qrTtlMinutes={qrTtlMinutes}
      setQrTtlMinutes={setQrTtlMinutes}
      handleGenerateQr={handleGenerateQr}
      generatedQrPayload={generatedQrPayload}
      qrValidateToken={qrValidateToken}
      setQrValidateToken={setQrValidateToken}
      handleValidateQr={handleValidateQr}
      qrValidationResult={qrValidationResult}
      getReasonCodeLabel={getReasonCodeLabel}
      qrStatusFilter={qrStatusFilter}
      setQrStatusFilter={setQrStatusFilter}
      setQrTokensPagination={setQrTokensPagination}
      qrStatusOptions={QR_STATUS_OPTIONS}
      loadQrData={loadQrData}
      qrTokenColumns={qrTokenColumns}
      qrTokens={qrTokens}
      qrTokensLoading={qrTokensLoading}
      qrTokensPagination={qrTokensPagination}
      qrDenyColumns={qrDenyColumns}
      qrDenies={qrDenies}
      qrDeniesLoading={qrDeniesLoading}
    />
  );

  const syncTab = (
    <SkudSyncTab
      isSyncMock={isSyncMock}
      syncStatusFilter={syncStatusFilter}
      setSyncStatusFilter={setSyncStatusFilter}
      setSyncJobsPagination={setSyncJobsPagination}
      syncStatusOptions={SYNC_STATUS_OPTIONS}
      syncOperationFilter={syncOperationFilter}
      setSyncOperationFilter={setSyncOperationFilter}
      loadSyncJobs={loadSyncJobs}
      syncColumns={syncColumns}
      syncJobs={syncJobs}
      syncJobsLoading={syncJobsLoading}
      syncJobsPagination={syncJobsPagination}
    />
  );

  const settingsTab = (
    <SkudSettingsTab
      settingsLoading={settingsLoading}
      skudSettings={skudSettings}
      updateSkudSettingField={updateSkudSettingField}
      settingsSaving={settingsSaving}
      handleSaveSkudSettings={handleSaveSkudSettings}
      settingsCheckLoading={settingsCheckLoading}
      handleCheckSkudConnection={handleCheckSkudConnection}
      loadSkudSettings={loadSkudSettings}
      settingsCheckResult={settingsCheckResult}
    />
  );

  const tabsItems = [
    { key: "access", label: "Доступ", children: accessTab },
    { key: "events", label: "События", children: eventsTab },
    { key: "cards", label: "Карты", children: cardsTab },
    { key: "qr", label: "QR", children: qrTab },
    { key: "sync", label: "Синхронизация", children: syncTab },
    { key: "settings", label: "Настройки", children: settingsTab },
  ];

  const isDemo =
    isStatsMock ||
    isAccessMock ||
    isEventsMock ||
    isCardsMock ||
    isQrMock ||
    isSyncMock;

  return (
    <Card
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        margin: 0,
      }}
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          padding: 0,
        },
      }}
    >
      <SkudPageHeader isDemo={isDemo} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          padding: "16px 24px 24px 24px",
        }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabsItems} />
      </div>

      <SkudBindCardModal
        bindModalOpen={bindModalOpen}
        bindCardTarget={bindCardTarget}
        bindEmployeeId={bindEmployeeId}
        setBindModalOpen={setBindModalOpen}
        setBindCardTarget={setBindCardTarget}
        setBindEmployeeId={setBindEmployeeId}
        confirmBindCard={confirmBindCard}
        searchEmployees={searchEmployees}
        employeeOptions={employeeOptions}
        employeeSearchLoading={employeeSearchLoading}
      />
    </Card>
  );
};

export default SkudAdministrationPage;
