import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Grid,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  FileExcelOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import analyticsService from "@/services/analyticsService";
import { counterpartyService } from "@/services/counterpartyService";
import { constructionSiteService } from "@/services/constructionSiteService";
import { employeeService } from "@/services/employeeService";
import { usePageTitle } from "@/hooks/usePageTitle";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

const defaultDateRange = [dayjs().subtract(29, "day"), dayjs()];

const extractFileName = (contentDisposition, fallback) => {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallback;
    }
  }
  const plainMatch = contentDisposition.match(/filename="([^"]+)"/i);
  return plainMatch?.[1] || fallback;
};

const saveBlobResponse = (response, fallbackName) => {
  const fileName = extractFileName(
    response.headers?.["content-disposition"],
    fallbackName,
  );
  const blob = response.data;
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ru-RU");
};

const SimpleBars = ({ data, labelKey, valueKey, color = "#1677ff" }) => {
  const normalized = Array.isArray(data) ? data.slice(0, 14) : [];
  const max = normalized.reduce(
    (acc, item) => Math.max(acc, Number(item?.[valueKey]) || 0),
    0,
  );

  if (normalized.length === 0) {
    return <Text type="secondary">Нет данных для графика</Text>;
  }

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      {normalized.map((item) => {
        const value = Number(item?.[valueKey]) || 0;
        const ratio = max > 0 ? Math.max((value / max) * 100, 3) : 0;
        const key = [
          item?.id,
          item?.[labelKey],
          item?.[valueKey],
          item?.date,
          item?.createdAt,
        ]
          .filter(Boolean)
          .join("-");
        return (
          <div key={key || JSON.stringify(item)}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 12 }}>{item?.[labelKey] || "-"}</Text>
              <Text style={{ fontSize: 12 }} strong>
                {value}
              </Text>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "#f0f0f0",
                borderRadius: 99,
              }}
            >
              <div
                style={{
                  width: `${ratio}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 99,
                  transition: "width 0.25s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </Space>
  );
};

const AnalyticsPage = () => {
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  usePageTitle("Аналитика", isMobile);

  const [activeTab, setActiveTab] = useState("dashboard");

  const [filters, setFilters] = useState({
    dateRange: defaultDateRange,
    counterpartyId: undefined,
    constructionSiteId: undefined,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: defaultDateRange,
    counterpartyId: undefined,
    constructionSiteId: undefined,
  });

  const [counterparties, setCounterparties] = useState([]);
  const [constructionSites, setConstructionSites] = useState([]);

  const [employeeId, setEmployeeId] = useState(undefined);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);

  const [violationType, setViolationType] = useState(undefined);

  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [siteData, setSiteData] = useState({
    items: [],
    charts: { daily: [] },
    pagination: { page: 1, limit: 50, total: 0 },
  });
  const [siteLoading, setSiteLoading] = useState(false);

  const [contractorData, setContractorData] = useState({
    summary: [],
    dynamics: [],
    pagination: { page: 1, limit: 50, total: 0 },
  });
  const [contractorLoading, setContractorLoading] = useState(false);

  const [employeeData, setEmployeeData] = useState({
    employee: null,
    timesheet: [],
    passages: [],
    pagination: { page: 1, limit: 50, total: 0 },
    totals: { workDays: 0, totalHours: 0 },
  });
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [violationsData, setViolationsData] = useState({
    items: [],
    pagination: { page: 1, limit: 50, total: 0 },
  });
  const [violationsLoading, setViolationsLoading] = useState(false);

  const [siteExportLoading, setSiteExportLoading] = useState(false);
  const [contractorExcelLoading, setContractorExcelLoading] = useState(false);
  const [contractorPdfLoading, setContractorPdfLoading] = useState(false);
  const [employeeExportLoading, setEmployeeExportLoading] = useState(false);
  const [violationsExportLoading, setViolationsExportLoading] = useState(false);

  const baseParams = useMemo(() => {
    const [from, to] = appliedFilters.dateRange || [];
    return {
      dateFrom: from ? dayjs(from).format("YYYY-MM-DD") : undefined,
      dateTo: to ? dayjs(to).format("YYYY-MM-DD") : undefined,
      counterpartyId: appliedFilters.counterpartyId || undefined,
      constructionSiteId: appliedFilters.constructionSiteId || undefined,
    };
  }, [appliedFilters]);

  const loadReferences = useCallback(async () => {
    try {
      const [counterpartyResponse, siteResponse] = await Promise.all([
        counterpartyService.getAvailable(),
        constructionSiteService.getAll({ page: 1, limit: 1000 }),
      ]);

      setCounterparties(counterpartyResponse?.data?.data || []);
      setConstructionSites(siteResponse?.data?.data?.constructionSites || []);
    } catch (error) {
      console.error("Failed to load analytics references:", error);
      message.error(error?.userMessage || "Ошибка загрузки справочников");
    }
  }, [message]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      const response = await analyticsService.getDashboard(baseParams);
      setDashboardData(response?.data || null);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      message.error(
        error?.response?.data?.message || "Ошибка загрузки дашборда",
      );
    } finally {
      setDashboardLoading(false);
    }
  }, [baseParams, message]);

  const loadSiteReport = useCallback(async () => {
    try {
      setSiteLoading(true);
      const response = await analyticsService.getBySiteReport({
        ...baseParams,
        page: siteData.pagination.page,
        limit: siteData.pagination.limit,
      });
      const data = response?.data || {};

      setSiteData((prev) => ({
        ...prev,
        items: data.items || [],
        charts: data.charts || { daily: [] },
        pagination: {
          page: data.pagination?.page || prev.pagination.page,
          limit: data.pagination?.limit || prev.pagination.limit,
          total: data.pagination?.total || 0,
        },
      }));
    } catch (error) {
      console.error("Failed to load by-site report:", error);
      message.error(
        error?.response?.data?.message || "Ошибка отчета по объектам",
      );
    } finally {
      setSiteLoading(false);
    }
  }, [
    baseParams,
    message,
    siteData.pagination.limit,
    siteData.pagination.page,
  ]);

  const loadContractorReport = useCallback(async () => {
    try {
      setContractorLoading(true);
      const response = await analyticsService.getByContractorReport({
        ...baseParams,
        page: contractorData.pagination.page,
        limit: contractorData.pagination.limit,
      });
      const data = response?.data || {};

      setContractorData((prev) => ({
        ...prev,
        summary: data.summary || [],
        dynamics: data.dynamics || [],
        pagination: {
          page: data.pagination?.page || prev.pagination.page,
          limit: data.pagination?.limit || prev.pagination.limit,
          total: data.pagination?.total || 0,
        },
      }));
    } catch (error) {
      console.error("Failed to load by-contractor report:", error);
      message.error(
        error?.response?.data?.message || "Ошибка отчета по контрагентам",
      );
    } finally {
      setContractorLoading(false);
    }
  }, [
    baseParams,
    contractorData.pagination.limit,
    contractorData.pagination.page,
    message,
  ]);

  const loadEmployeeReport = useCallback(async () => {
    if (!employeeId) {
      setEmployeeData({
        employee: null,
        timesheet: [],
        passages: [],
        pagination: { page: 1, limit: 50, total: 0 },
        totals: { workDays: 0, totalHours: 0 },
      });
      return;
    }

    try {
      setEmployeeLoading(true);
      const response = await analyticsService.getEmployeeReport({
        ...baseParams,
        employeeId,
        page: employeeData.pagination.page,
        limit: employeeData.pagination.limit,
      });
      const data = response?.data || {};

      setEmployeeData((prev) => ({
        ...prev,
        employee: data.employee || null,
        timesheet: data.timesheet || [],
        passages: data.passages || [],
        totals: data.totals || { workDays: 0, totalHours: 0 },
        pagination: {
          page: data.pagination?.page || prev.pagination.page,
          limit: data.pagination?.limit || prev.pagination.limit,
          total: data.pagination?.total || 0,
        },
      }));
    } catch (error) {
      console.error("Failed to load employee report:", error);
      message.error(
        error?.response?.data?.message ||
          "Ошибка индивидуальной статистики сотрудника",
      );
    } finally {
      setEmployeeLoading(false);
    }
  }, [
    baseParams,
    employeeData.pagination.limit,
    employeeData.pagination.page,
    employeeId,
    message,
  ]);

  const loadViolationsReport = useCallback(async () => {
    try {
      setViolationsLoading(true);
      const response = await analyticsService.getViolationsReport({
        ...baseParams,
        page: violationsData.pagination.page,
        limit: violationsData.pagination.limit,
        violationType: violationType || undefined,
      });
      const data = response?.data || {};

      setViolationsData((prev) => ({
        ...prev,
        items: data.items || [],
        pagination: {
          page: data.pagination?.page || prev.pagination.page,
          limit: data.pagination?.limit || prev.pagination.limit,
          total: data.pagination?.total || 0,
        },
      }));
    } catch (error) {
      console.error("Failed to load violations report:", error);
      message.error(
        error?.response?.data?.message || "Ошибка отчета по нарушениям",
      );
    } finally {
      setViolationsLoading(false);
    }
  }, [
    baseParams,
    message,
    violationType,
    violationsData.pagination.limit,
    violationsData.pagination.page,
  ]);

  useEffect(() => {
    if (activeTab === "dashboard") loadDashboard();
  }, [activeTab, loadDashboard]);

  useEffect(() => {
    if (activeTab === "by-site") loadSiteReport();
  }, [activeTab, loadSiteReport]);

  useEffect(() => {
    if (activeTab === "by-contractor") loadContractorReport();
  }, [activeTab, loadContractorReport]);

  useEffect(() => {
    if (activeTab === "employee") loadEmployeeReport();
  }, [activeTab, loadEmployeeReport]);

  useEffect(() => {
    if (activeTab === "violations") loadViolationsReport();
  }, [activeTab, loadViolationsReport]);

  const applyFilters = () => {
    setSiteData((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: 1 },
    }));
    setContractorData((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: 1 },
    }));
    setEmployeeData((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: 1 },
    }));
    setViolationsData((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: 1 },
    }));
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    const next = {
      dateRange: defaultDateRange,
      counterpartyId: undefined,
      constructionSiteId: undefined,
    };
    setFilters(next);
    setAppliedFilters(next);
    setViolationType(undefined);
  };

  const refreshCurrentTab = () => {
    if (activeTab === "dashboard") loadDashboard();
    if (activeTab === "by-site") loadSiteReport();
    if (activeTab === "by-contractor") loadContractorReport();
    if (activeTab === "employee") loadEmployeeReport();
    if (activeTab === "violations") loadViolationsReport();
  };

  const handleEmployeeSearch = async (query) => {
    const normalized = String(query || "").trim();
    if (normalized.length < 2) {
      return;
    }

    try {
      setEmployeeSearchLoading(true);
      const response = await employeeService.search(normalized);
      const employees = response?.data?.employees || [];
      const options = employees.slice(0, 80).map((item) => ({
        value: item.id,
        label:
          `${item.lastName || ""} ${item.firstName || ""} ${item.middleName || ""}`.trim(),
      }));
      setEmployeeOptions(options);
    } catch (error) {
      console.error("Failed to search employees:", error);
    } finally {
      setEmployeeSearchLoading(false);
    }
  };

  const handleExportSiteExcel = async () => {
    try {
      setSiteExportLoading(true);
      const response = await analyticsService.exportBySiteExcel(baseParams);
      saveBlobResponse(response, "analytics_by_site.xlsx");
      message.success("Excel сформирован");
    } catch (error) {
      console.error("Export by-site excel failed:", error);
      message.error(error?.response?.data?.message || "Ошибка выгрузки Excel");
    } finally {
      setSiteExportLoading(false);
    }
  };

  const handleExportContractorExcel = async () => {
    try {
      setContractorExcelLoading(true);
      const response =
        await analyticsService.exportByContractorExcel(baseParams);
      saveBlobResponse(response, "analytics_by_contractor.xlsx");
      message.success("Excel сформирован");
    } catch (error) {
      console.error("Export by-contractor excel failed:", error);
      message.error(error?.response?.data?.message || "Ошибка выгрузки Excel");
    } finally {
      setContractorExcelLoading(false);
    }
  };

  const handleExportContractorPdf = async () => {
    try {
      setContractorPdfLoading(true);
      const response = await analyticsService.exportByContractorPdf(baseParams);
      saveBlobResponse(response, "analytics_by_contractor.pdf");
      message.success("PDF сформирован");
    } catch (error) {
      console.error("Export by-contractor pdf failed:", error);
      message.error(error?.response?.data?.message || "Ошибка выгрузки PDF");
    } finally {
      setContractorPdfLoading(false);
    }
  };

  const handleExportEmployeeExcel = async () => {
    if (!employeeId) {
      message.warning("Сначала выберите сотрудника");
      return;
    }

    try {
      setEmployeeExportLoading(true);
      const response = await analyticsService.exportEmployeeExcel({
        ...baseParams,
        employeeId,
      });
      saveBlobResponse(response, "analytics_employee.xlsx");
      message.success("Excel сформирован");
    } catch (error) {
      console.error("Export employee excel failed:", error);
      message.error(error?.response?.data?.message || "Ошибка выгрузки Excel");
    } finally {
      setEmployeeExportLoading(false);
    }
  };

  const handleExportViolationsExcel = async () => {
    try {
      setViolationsExportLoading(true);
      const response = await analyticsService.exportViolationsExcel({
        ...baseParams,
        violationType: violationType || undefined,
      });
      saveBlobResponse(response, "analytics_violations.xlsx");
      message.success("Excel сформирован");
    } catch (error) {
      console.error("Export violations excel failed:", error);
      message.error(error?.response?.data?.message || "Ошибка выгрузки Excel");
    } finally {
      setViolationsExportLoading(false);
    }
  };

  const dashboardPeriodSiteColumns = [
    {
      title: "Объект",
      dataIndex: "constructionSiteName",
      key: "constructionSiteName",
      render: (value) => value || "Без объекта",
    },
    {
      title: "Входы",
      dataIndex: "entriesCount",
      key: "entriesCount",
      width: 110,
    },
    {
      title: "Выходы",
      dataIndex: "exitsCount",
      key: "exitsCount",
      width: 110,
    },
    {
      title: "Сотрудники",
      dataIndex: "uniqueEmployees",
      key: "uniqueEmployees",
      width: 130,
    },
    {
      title: "Нарушения",
      dataIndex: "violationsCount",
      key: "violationsCount",
      width: 130,
      render: (value) => <Tag color={value > 0 ? "red" : "green"}>{value}</Tag>,
    },
  ];

  const dashboardPeriodCounterpartyColumns = [
    {
      title: "Контрагент",
      dataIndex: "counterpartyName",
      key: "counterpartyName",
    },
    {
      title: "Входы",
      dataIndex: "entriesCount",
      key: "entriesCount",
      width: 110,
    },
    {
      title: "Выходы",
      dataIndex: "exitsCount",
      key: "exitsCount",
      width: 110,
    },
    {
      title: "Сотрудники",
      dataIndex: "uniqueEmployees",
      key: "uniqueEmployees",
      width: 130,
    },
    {
      title: "Нарушения",
      dataIndex: "violationsCount",
      key: "violationsCount",
      width: 130,
      render: (value) => <Tag color={value > 0 ? "red" : "green"}>{value}</Tag>,
    },
  ];

  const bySiteColumns = [
    { title: "Дата", dataIndex: "date", key: "date", width: 130 },
    { title: "Время", dataIndex: "time", key: "time", width: 100 },
    {
      title: "Входы",
      dataIndex: "entriesCount",
      key: "entriesCount",
      width: 120,
    },
    {
      title: "Выходы",
      dataIndex: "exitsCount",
      key: "exitsCount",
      width: 120,
    },
    {
      title: "Текущая загруженность",
      dataIndex: "occupancy",
      key: "occupancy",
      width: 180,
    },
    {
      title: "Макс. загруженность за день",
      dataIndex: "maxDailyOccupancy",
      key: "maxDailyOccupancy",
      width: 220,
    },
  ];

  const contractorColumns = [
    {
      title: "Контрагент",
      dataIndex: "counterpartyName",
      key: "counterpartyName",
      width: 220,
    },
    {
      title: "Объект",
      dataIndex: "constructionSiteName",
      key: "constructionSiteName",
      width: 220,
    },
    {
      title: "Кол-во сотрудников",
      dataIndex: "employeesCount",
      key: "employeesCount",
      width: 170,
    },
    {
      title: "Среднее время (ч)",
      dataIndex: "averageHours",
      key: "averageHours",
      width: 160,
    },
    {
      title: "Рабочих дней",
      dataIndex: "workDays",
      key: "workDays",
      width: 140,
    },
  ];

  const timesheetColumns = [
    {
      title: "Дата",
      dataIndex: "date",
      key: "date",
      width: 130,
    },
    {
      title: "Первый вход",
      dataIndex: "firstEntry",
      key: "firstEntry",
      width: 190,
      render: (value) => formatDateTime(value),
    },
    {
      title: "Последний выход",
      dataIndex: "lastExit",
      key: "lastExit",
      width: 190,
      render: (value) => formatDateTime(value),
    },
    {
      title: "Всего часов",
      dataIndex: "totalHours",
      key: "totalHours",
      width: 130,
    },
  ];

  const passagesColumns = [
    {
      title: "Дата/время",
      dataIndex: "eventTime",
      key: "eventTime",
      width: 190,
      render: (value) => formatDateTime(value),
    },
    {
      title: "Точка доступа",
      dataIndex: "accessPoint",
      key: "accessPoint",
      width: 130,
      render: (value) => value ?? "-",
    },
    {
      title: "Направление",
      dataIndex: "directionLabel",
      key: "directionLabel",
      width: 120,
    },
    {
      title: "Результат",
      dataIndex: "allow",
      key: "allow",
      width: 130,
      render: (allow) => (
        <Tag color={allow ? "green" : "red"}>
          {allow ? "Разрешен" : "Отказ"}
        </Tag>
      ),
    },
    {
      title: "Причина",
      dataIndex: "decisionMessage",
      key: "decisionMessage",
      render: (value) => value || "-",
    },
  ];

  const violationsColumns = [
    {
      title: "Сотрудник",
      dataIndex: "employeeFullName",
      key: "employeeFullName",
      width: 220,
    },
    {
      title: "Дата/время",
      dataIndex: "eventTime",
      key: "eventTime",
      width: 190,
      render: (value) => formatDateTime(value),
    },
    {
      title: "Контрагент",
      dataIndex: "counterpartyName",
      key: "counterpartyName",
      width: 200,
    },
    {
      title: "Объект",
      dataIndex: "constructionSiteName",
      key: "constructionSiteName",
      width: 200,
      render: (value) => value || "Без объекта",
    },
    {
      title: "Тип нарушения",
      dataIndex: "violationTypeLabel",
      key: "violationTypeLabel",
      width: 260,
      render: (value) => <Tag color="red">{value}</Tag>,
    },
    {
      title: "Причина",
      dataIndex: "decisionMessage",
      key: "decisionMessage",
      render: (value) => value || "-",
    },
  ];

  const tabItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} lg={6}>
              <Card loading={dashboardLoading} size="small">
                <Statistic
                  title="Сейчас на объектах"
                  value={dashboardData?.online?.totalInside || 0}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card loading={dashboardLoading} size="small">
                <Statistic
                  title="Входов за период"
                  value={dashboardData?.periodStats?.totals?.entriesCount || 0}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card loading={dashboardLoading} size="small">
                <Statistic
                  title="Выходов за период"
                  value={dashboardData?.periodStats?.totals?.exitsCount || 0}
                />
              </Card>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Card loading={dashboardLoading} size="small">
                <Statistic
                  title="Нарушений за период"
                  value={
                    dashboardData?.periodStats?.totals?.violationsCount || 0
                  }
                />
              </Card>
            </Col>
          </Row>

          {dashboardData?.defaultCounterparty && (
            <Card size="small" loading={dashboardLoading}>
              <Text strong>Контрагент default (заказчик)</Text>
              <div style={{ marginTop: 8 }}>
                <Space size={16} wrap>
                  <Tag color="blue">
                    {dashboardData.defaultCounterparty.counterpartyName}
                  </Tag>
                  <Tag>
                    Сейчас на объекте:{" "}
                    {dashboardData.defaultCounterparty.insideCount}
                  </Tag>
                  <Tag>
                    Входы: {dashboardData.defaultCounterparty.entriesCount}
                  </Tag>
                  <Tag>
                    Выходы: {dashboardData.defaultCounterparty.exitsCount}
                  </Tag>
                  <Tag color="red">
                    Нарушения:{" "}
                    {dashboardData.defaultCounterparty.violationsCount}
                  </Tag>
                </Space>
              </div>
            </Card>
          )}

          <Row gutter={[12, 12]}>
            <Col xs={24} xl={12}>
              <Card
                title="Онлайн по объектам"
                size="small"
                loading={dashboardLoading}
              >
                <SimpleBars
                  data={dashboardData?.online?.bySite || []}
                  labelKey="constructionSiteName"
                  valueKey="insideCount"
                  color="#1677ff"
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                title="Онлайн по контрагентам"
                size="small"
                loading={dashboardLoading}
              >
                <SimpleBars
                  data={dashboardData?.online?.byCounterparty || []}
                  labelKey="counterpartyName"
                  valueKey="insideCount"
                  color="#13c2c2"
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="Статистика по объектам за период"
            size="small"
            loading={dashboardLoading}
          >
            <Table
              rowKey={(row) =>
                row.constructionSiteId || `site-${row.constructionSiteName}`
              }
              columns={dashboardPeriodSiteColumns}
              dataSource={dashboardData?.periodStats?.bySite || []}
              pagination={false}
              scroll={{ x: 860 }}
            />
          </Card>

          <Card
            title="Статистика по контрагентам за период"
            size="small"
            loading={dashboardLoading}
          >
            <Table
              rowKey={(row) => row.counterpartyId}
              columns={dashboardPeriodCounterpartyColumns}
              dataSource={dashboardData?.periodStats?.byCounterparty || []}
              pagination={false}
              scroll={{ x: 860 }}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: "by-site",
      label: "Отчет: по объектам",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card size="small" loading={siteLoading}>
            <Space style={{ marginBottom: 12 }} wrap>
              <Button
                icon={<FileExcelOutlined />}
                loading={siteExportLoading}
                onClick={handleExportSiteExcel}
              >
                Экспорт в Excel
              </Button>
            </Space>

            <Row gutter={[12, 12]}>
              <Col xs={24} lg={10}>
                <Card title="График: макс. загруженность по дням" size="small">
                  <SimpleBars
                    data={siteData?.charts?.daily || []}
                    labelKey="date"
                    valueKey="maxOccupancy"
                    color="#52c41a"
                  />
                </Card>
              </Col>
              <Col xs={24} lg={14}>
                <Card title="Таблица посещений" size="small">
                  <Table
                    rowKey={(row) => `${row.date}-${row.time}`}
                    columns={bySiteColumns}
                    dataSource={siteData.items}
                    loading={siteLoading}
                    scroll={{ x: 980 }}
                    pagination={{
                      current: siteData.pagination.page,
                      pageSize: siteData.pagination.limit,
                      total: siteData.pagination.total,
                      showSizeChanger: true,
                    }}
                    onChange={(nextPagination) => {
                      setSiteData((prev) => ({
                        ...prev,
                        pagination: {
                          ...prev.pagination,
                          page: nextPagination.current || 1,
                          limit:
                            nextPagination.pageSize || prev.pagination.limit,
                        },
                      }));
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Space>
      ),
    },
    {
      key: "by-contractor",
      label: "Отчет: по контрагентам",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card size="small" loading={contractorLoading}>
            <Space style={{ marginBottom: 12 }} wrap>
              <Button
                icon={<FileExcelOutlined />}
                loading={contractorExcelLoading}
                onClick={handleExportContractorExcel}
              >
                Экспорт в Excel
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                loading={contractorPdfLoading}
                onClick={handleExportContractorPdf}
              >
                Экспорт в PDF
              </Button>
            </Space>

            <Table
              rowKey={(row) =>
                `${row.counterpartyId}-${row.constructionSiteId || "none"}`
              }
              columns={contractorColumns}
              dataSource={contractorData.summary}
              loading={contractorLoading}
              scroll={{ x: 950 }}
              pagination={{
                current: contractorData.pagination.page,
                pageSize: contractorData.pagination.limit,
                total: contractorData.pagination.total,
                showSizeChanger: true,
              }}
              onChange={(nextPagination) => {
                setContractorData((prev) => ({
                  ...prev,
                  pagination: {
                    ...prev.pagination,
                    page: nextPagination.current || 1,
                    limit: nextPagination.pageSize || prev.pagination.limit,
                  },
                }));
              }}
            />

            <Card
              title="График динамики численности"
              size="small"
              style={{ marginTop: 12 }}
            >
              <SimpleBars
                data={(contractorData.dynamics || []).map((item) => ({
                  label: `${item.date} ${item.counterpartyName}`,
                  value: item.employeesCount,
                }))}
                labelKey="label"
                valueKey="value"
                color="#fa8c16"
              />
            </Card>
          </Card>
        </Space>
      ),
    },
    {
      key: "employee",
      label: "Отчет: сотрудник",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card size="small" loading={employeeLoading}>
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} md={16} lg={10}>
                <Text type="secondary">Сотрудник</Text>
                <Select
                  style={{ width: "100%", marginTop: 4 }}
                  showSearch
                  allowClear
                  value={employeeId}
                  onChange={(value) => {
                    setEmployeeData((prev) => ({
                      ...prev,
                      pagination: { ...prev.pagination, page: 1 },
                    }));
                    setEmployeeId(value);
                  }}
                  placeholder="Начните вводить ФИО"
                  filterOption={false}
                  onSearch={handleEmployeeSearch}
                  options={employeeOptions}
                  loading={employeeSearchLoading}
                />
              </Col>
              <Col xs={24} md={8} lg={14}>
                <Space wrap>
                  <Button
                    icon={<SearchOutlined />}
                    onClick={loadEmployeeReport}
                  >
                    Применить
                  </Button>
                  <Button
                    icon={<FileExcelOutlined />}
                    loading={employeeExportLoading}
                    onClick={handleExportEmployeeExcel}
                  >
                    Экспорт в Excel
                  </Button>
                </Space>
              </Col>
            </Row>

            {employeeData.employee && (
              <Card size="small" style={{ marginTop: 12 }}>
                <Space wrap size={16}>
                  <Tag color="blue">
                    {employeeData.employee.employeeFullName}
                  </Tag>
                  <Tag>
                    Контрагент: {employeeData.employee.counterpartyName || "-"}
                  </Tag>
                  <Tag>
                    Объект: {employeeData.employee.constructionSiteName || "-"}
                  </Tag>
                  <Tag>Рабочих дней: {employeeData.totals?.workDays || 0}</Tag>
                  <Tag>Всего часов: {employeeData.totals?.totalHours || 0}</Tag>
                </Space>
              </Card>
            )}

            <Card
              title="Табель учета рабочего времени"
              size="small"
              style={{ marginTop: 12 }}
            >
              <Table
                rowKey="id"
                columns={timesheetColumns}
                dataSource={employeeData.timesheet}
                pagination={false}
                scroll={{ x: 760 }}
                loading={employeeLoading}
              />
            </Card>

            <Card
              title="Детализация проходов"
              size="small"
              style={{ marginTop: 12 }}
            >
              <Table
                rowKey="id"
                columns={passagesColumns}
                dataSource={employeeData.passages}
                loading={employeeLoading}
                scroll={{ x: 980 }}
                pagination={{
                  current: employeeData.pagination.page,
                  pageSize: employeeData.pagination.limit,
                  total: employeeData.pagination.total,
                  showSizeChanger: true,
                }}
                onChange={(nextPagination) => {
                  setEmployeeData((prev) => ({
                    ...prev,
                    pagination: {
                      ...prev.pagination,
                      page: nextPagination.current || 1,
                      limit: nextPagination.pageSize || prev.pagination.limit,
                    },
                  }));
                }}
              />
            </Card>
          </Card>
        </Space>
      ),
    },
    {
      key: "violations",
      label: "Отчет: нарушения",
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card size="small" loading={violationsLoading}>
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} md={10} lg={8}>
                <Text type="secondary">Тип нарушения</Text>
                <Select
                  style={{ width: "100%", marginTop: 4 }}
                  allowClear
                  placeholder="Все типы"
                  value={violationType}
                  onChange={(value) => {
                    setViolationsData((prev) => ({
                      ...prev,
                      pagination: { ...prev.pagination, page: 1 },
                    }));
                    setViolationType(value);
                  }}
                  options={[
                    {
                      value: "after_block",
                      label: "Попытка после блокировки",
                    },
                    {
                      value: "without_pass",
                      label: "Попытка без пропуска",
                    },
                    {
                      value: "other",
                      label: "Прочее",
                    },
                  ]}
                />
              </Col>
              <Col xs={24} md={14} lg={16}>
                <Space wrap>
                  <Button
                    icon={<SearchOutlined />}
                    onClick={loadViolationsReport}
                  >
                    Применить
                  </Button>
                  <Button
                    icon={<FileExcelOutlined />}
                    loading={violationsExportLoading}
                    onClick={handleExportViolationsExcel}
                  >
                    Экспорт в Excel
                  </Button>
                </Space>
              </Col>
            </Row>

            <Table
              style={{ marginTop: 12 }}
              rowKey="id"
              columns={violationsColumns}
              dataSource={violationsData.items}
              loading={violationsLoading}
              scroll={{ x: 1250 }}
              pagination={{
                current: violationsData.pagination.page,
                pageSize: violationsData.pagination.limit,
                total: violationsData.pagination.total,
                showSizeChanger: true,
              }}
              onChange={(nextPagination) => {
                setViolationsData((prev) => ({
                  ...prev,
                  pagination: {
                    ...prev.pagination,
                    page: nextPagination.current || 1,
                    limit: nextPagination.pageSize || prev.pagination.limit,
                  },
                }));
              }}
            />
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Аналитика
          </Title>
          <Text type="secondary">
            Посещаемость объектов, рабочее время и нарушения режима по данным
            СКУД
          </Text>
        </div>

        <Card size="small">
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} md={12} lg={8}>
              <Text type="secondary">Период</Text>
              <RangePicker
                style={{ width: "100%", marginTop: 4 }}
                value={filters.dateRange}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    dateRange: value || defaultDateRange,
                  }))
                }
                allowClear={false}
              />
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Text type="secondary">Контрагент</Text>
              <Select
                style={{ width: "100%", marginTop: 4 }}
                placeholder="Все контрагенты"
                allowClear
                showSearch
                optionFilterProp="label"
                value={filters.counterpartyId}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    counterpartyId: value,
                  }))
                }
                options={counterparties.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Text type="secondary">Объект</Text>
              <Select
                style={{ width: "100%", marginTop: 4 }}
                placeholder="Все объекты"
                allowClear
                showSearch
                optionFilterProp="label"
                value={filters.constructionSiteId}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    constructionSiteId: value,
                  }))
                }
                options={constructionSites.map((item) => ({
                  value: String(item.id),
                  label: item.shortName || item.fullName,
                }))}
              />
            </Col>
            <Col xs={24} md={12} lg={4}>
              <Space wrap>
                <Button
                  icon={<SearchOutlined />}
                  type="primary"
                  onClick={applyFilters}
                >
                  Применить
                </Button>
                <Button icon={<ReloadOutlined />} onClick={refreshCurrentTab}>
                  Обновить
                </Button>
              </Space>
            </Col>
          </Row>

          <Space style={{ marginTop: 12 }}>
            <Button onClick={resetFilters}>Сбросить фильтры</Button>
            <Text type="secondary">
              Период: {baseParams.dateFrom} - {baseParams.dateTo}
            </Text>
          </Space>
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          destroyInactiveTabPane
        />
      </Space>
    </div>
  );
};

export default AnalyticsPage;
