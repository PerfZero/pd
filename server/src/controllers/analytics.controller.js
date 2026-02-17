import * as XLSX from "xlsx";
import { QueryTypes } from "sequelize";
import {
  CounterpartySubcounterpartyMapping,
  Setting,
  sequelize,
} from "../models/index.js";
import { AppError } from "../middleware/errorHandler.js";
import { transliterate } from "../utils/transliterate.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const MAX_EXPORT_ROWS = 10000;
const DEFAULT_PERIOD_DAYS = 30;

const VIOLATION_TYPE_LABELS = {
  after_block: "Попытка прохода после блокировки",
  without_pass: "Попытка прохода без пропуска",
  other: "Прочее нарушение",
};

const DIRECTION_LABELS = {
  1: "Выход",
  2: "Вход",
  3: "Неизвестно",
};

const normalizePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const normalizeSearch = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeDateOnly = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  return datePart;
};

const parseDay = (value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addDays = (date, days) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toDateOnlyString = (date) => date.toISOString().split("T")[0];

const toDateFromValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const formatDateTime = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const formatHours = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildDateRange = (query) => {
  const today = new Date();
  const todayDay = parseDay(toDateOnlyString(today));

  let dateFrom = normalizeDateOnly(query?.dateFrom);
  let dateTo = normalizeDateOnly(query?.dateTo);

  if (!dateTo) {
    dateTo = toDateOnlyString(todayDay);
  }

  if (!dateFrom) {
    dateFrom = toDateOnlyString(addDays(parseDay(dateTo), -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const fromDay = parseDay(dateFrom);
  const toDay = parseDay(dateTo);
  if (!fromDay || !toDay) {
    throw new AppError("Некорректный период дат", 400);
  }

  if (fromDay.getTime() > toDay.getTime()) {
    throw new AppError("dateFrom не может быть позже dateTo", 400);
  }

  const toExclusive = addDays(toDay, 1);

  return {
    dateFrom,
    dateTo,
    dateFromTs: fromDay.toISOString(),
    dateToExclusiveTs: toExclusive.toISOString(),
  };
};

const sanitizeAsciiFileName = (value) => {
  const transliterated = transliterate(String(value || ""));
  const normalized = transliterated
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "export";
};

const getAllowedCounterpartyIds = async (user) => {
  if (["admin", "manager", "ot_admin", "ot_engineer"].includes(user.role)) {
    return null;
  }

  if (user.role !== "user") {
    throw new AppError("Недостаточно прав", 403);
  }

  const defaultCounterpartyId = await Setting.getSetting("default_counterparty_id");
  if (!defaultCounterpartyId) {
    return user.counterpartyId ? [user.counterpartyId] : [];
  }

  if (user.counterpartyId === defaultCounterpartyId) {
    return [user.counterpartyId];
  }

  const subcontractors = await CounterpartySubcounterpartyMapping.findAll({
    where: { parentCounterpartyId: user.counterpartyId },
    attributes: ["childCounterpartyId"],
  });

  return [
    user.counterpartyId,
    ...subcontractors.map((item) => item.childCounterpartyId),
  ].filter(Boolean);
};

const buildScopeCte = async ({ user, filters }) => {
  const replacements = {};
  const allowedCounterpartyIds = await getAllowedCounterpartyIds(user);

  if (allowedCounterpartyIds && allowedCounterpartyIds.length === 0) {
    return {
      cte: "",
      replacements,
      empty: true,
    };
  }

  const where = ["e.is_deleted = FALSE"];

  if (allowedCounterpartyIds) {
    where.push("ecm.counterparty_id IN (:allowedCounterpartyIds)");
    replacements.allowedCounterpartyIds = allowedCounterpartyIds;
  }

  if (filters.counterpartyId) {
    if (
      allowedCounterpartyIds &&
      !allowedCounterpartyIds.includes(filters.counterpartyId)
    ) {
      throw new AppError("Нет доступа к выбранному контрагенту", 403);
    }

    where.push("ecm.counterparty_id = :counterpartyId");
    replacements.counterpartyId = filters.counterpartyId;
  }

  if (filters.constructionSiteId) {
    where.push("ecm.construction_site_id::text = :constructionSiteId");
    replacements.constructionSiteId = String(filters.constructionSiteId);
  }

  if (filters.employeeId) {
    where.push("e.id = :employeeId");
    replacements.employeeId = filters.employeeId;
  }

  if (filters.employeeSearch) {
    where.push(`(
      e.last_name ILIKE :employeeSearch
      OR e.first_name ILIKE :employeeSearch
      OR e.middle_name ILIKE :employeeSearch
      OR CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name) ILIKE :employeeSearch
    )`);
    replacements.employeeSearch = `%${filters.employeeSearch}%`;
  }

  const cte = `
    WITH scoped_employees AS (
      SELECT DISTINCT ON (e.id)
        e.id AS employee_id,
        e.first_name,
        e.last_name,
        e.middle_name,
        TRIM(CONCAT_WS(' ', e.last_name, e.first_name, e.middle_name)) AS employee_full_name,
        ecm.counterparty_id,
        c.name AS counterparty_name,
        ecm.construction_site_id,
        COALESCE(cs.short_name, cs.full_name) AS construction_site_name
      FROM employees e
      INNER JOIN employee_counterparty_mapping ecm
        ON ecm.employee_id = e.id
      INNER JOIN counterparties c
        ON c.id = ecm.counterparty_id
      LEFT JOIN construction_sites cs
        ON cs.id::text = ecm.construction_site_id::text
      WHERE ${where.join(" AND ")}
      ORDER BY
        e.id,
        ecm.updated_at DESC NULLS LAST,
        ecm.created_at DESC NULLS LAST,
        ecm.id DESC
    )
  `;

  return {
    cte,
    replacements,
    empty: false,
  };
};

const getCommonFilters = (req) => ({
  counterpartyId: normalizeSearch(req.query.counterpartyId),
  constructionSiteId: normalizeSearch(req.query.constructionSiteId),
  employeeId: normalizeSearch(req.query.employeeId),
  employeeSearch: normalizeSearch(req.query.employeeSearch),
});

const mapGroupedPeriodRow = (row) => ({
  counterpartyId: row.counterparty_id || null,
  counterpartyName: row.counterparty_name || "-",
  constructionSiteId: row.construction_site_id || null,
  constructionSiteName: row.construction_site_name || "Без объекта",
  entriesCount: toNumber(row.entries_count),
  exitsCount: toNumber(row.exits_count),
  uniqueEmployees: toNumber(row.unique_employees),
  violationsCount: toNumber(row.violations_count),
});

const fetchDashboardData = async (req) => {
  const filters = getCommonFilters(req);
  const period = buildDateRange(req.query);
  const scope = await buildScopeCte({ user: req.user, filters });

  if (scope.empty) {
    return {
      period,
      online: {
        totalInside: 0,
        bySite: [],
        byCounterparty: [],
      },
      periodStats: {
        totals: {
          entriesCount: 0,
          exitsCount: 0,
          uniqueEmployees: 0,
          violationsCount: 0,
        },
        bySite: [],
        byCounterparty: [],
      },
      defaultCounterparty: null,
    };
  }

  const replacements = {
    ...scope.replacements,
    dateFromTs: period.dateFromTs,
    dateToExclusiveTs: period.dateToExclusiveTs,
  };

  const onlineBySiteQuery = `
    ${scope.cte},
    latest_events AS (
      SELECT DISTINCT ON (ev.employee_id)
        ev.employee_id,
        ev.allow,
        ev.direction,
        ev.event_time
      FROM skud_access_events ev
      INNER JOIN scoped_employees se ON se.employee_id = ev.employee_id
      WHERE ev.external_system = 'sigur'
      ORDER BY ev.employee_id, ev.event_time DESC, ev.id DESC
    )
    SELECT
      COALESCE(se.construction_site_id::text, '') AS construction_site_id,
      COALESCE(se.construction_site_name, 'Без объекта') AS construction_site_name,
      COUNT(*)::int AS inside_count
    FROM latest_events le
    INNER JOIN scoped_employees se
      ON se.employee_id = le.employee_id
    WHERE le.allow IS TRUE AND le.direction = 2
    GROUP BY se.construction_site_id, se.construction_site_name
    ORDER BY inside_count DESC, construction_site_name ASC
  `;

  const onlineByCounterpartyQuery = `
    ${scope.cte},
    latest_events AS (
      SELECT DISTINCT ON (ev.employee_id)
        ev.employee_id,
        ev.allow,
        ev.direction,
        ev.event_time
      FROM skud_access_events ev
      INNER JOIN scoped_employees se ON se.employee_id = ev.employee_id
      WHERE ev.external_system = 'sigur'
      ORDER BY ev.employee_id, ev.event_time DESC, ev.id DESC
    )
    SELECT
      se.counterparty_id,
      se.counterparty_name,
      COUNT(*)::int AS inside_count
    FROM latest_events le
    INNER JOIN scoped_employees se
      ON se.employee_id = le.employee_id
    WHERE le.allow IS TRUE AND le.direction = 2
    GROUP BY se.counterparty_id, se.counterparty_name
    ORDER BY inside_count DESC, se.counterparty_name ASC
  `;

  const periodBySiteQuery = `
    ${scope.cte}
    SELECT
      COALESCE(se.construction_site_id::text, '') AS construction_site_id,
      COALESCE(se.construction_site_name, 'Без объекта') AS construction_site_name,
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 2)::int AS entries_count,
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 1)::int AS exits_count,
      COUNT(DISTINCT ev.employee_id) FILTER (WHERE ev.allow IS TRUE)::int AS unique_employees,
      COUNT(*) FILTER (WHERE COALESCE(ev.allow, FALSE) = FALSE)::int AS violations_count
    FROM skud_access_events ev
    INNER JOIN scoped_employees se ON se.employee_id = ev.employee_id
    WHERE ev.external_system = 'sigur'
      AND ev.event_time >= :dateFromTs
      AND ev.event_time < :dateToExclusiveTs
    GROUP BY se.construction_site_id, se.construction_site_name
    ORDER BY construction_site_name ASC
  `;

  const periodByCounterpartyQuery = `
    ${scope.cte}
    SELECT
      se.counterparty_id,
      se.counterparty_name,
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 2)::int AS entries_count,
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 1)::int AS exits_count,
      COUNT(DISTINCT ev.employee_id) FILTER (WHERE ev.allow IS TRUE)::int AS unique_employees,
      COUNT(*) FILTER (WHERE COALESCE(ev.allow, FALSE) = FALSE)::int AS violations_count
    FROM skud_access_events ev
    INNER JOIN scoped_employees se ON se.employee_id = ev.employee_id
    WHERE ev.external_system = 'sigur'
      AND ev.event_time >= :dateFromTs
      AND ev.event_time < :dateToExclusiveTs
    GROUP BY se.counterparty_id, se.counterparty_name
    ORDER BY se.counterparty_name ASC
  `;

  const totalsQuery = `
    ${scope.cte}
    SELECT
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 2)::int AS entries_count,
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 1)::int AS exits_count,
      COUNT(DISTINCT ev.employee_id) FILTER (WHERE ev.allow IS TRUE)::int AS unique_employees,
      COUNT(*) FILTER (WHERE COALESCE(ev.allow, FALSE) = FALSE)::int AS violations_count
    FROM skud_access_events ev
    INNER JOIN scoped_employees se ON se.employee_id = ev.employee_id
    WHERE ev.external_system = 'sigur'
      AND ev.event_time >= :dateFromTs
      AND ev.event_time < :dateToExclusiveTs
  `;

  const [
    onlineBySiteRows,
    onlineByCounterpartyRows,
    periodBySiteRows,
    periodByCounterpartyRows,
    totalsRows,
    defaultCounterpartyId,
  ] = await Promise.all([
    sequelize.query(onlineBySiteQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(onlineByCounterpartyQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(periodBySiteQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(periodByCounterpartyQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(totalsQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    Setting.getSetting("default_counterparty_id"),
  ]);

  const onlineBySite = onlineBySiteRows.map((row) => ({
    constructionSiteId: row.construction_site_id || null,
    constructionSiteName: row.construction_site_name || "Без объекта",
    insideCount: toNumber(row.inside_count),
  }));

  const onlineByCounterparty = onlineByCounterpartyRows.map((row) => ({
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparty_name,
    insideCount: toNumber(row.inside_count),
  }));

  const periodBySite = periodBySiteRows.map((row) => ({
    constructionSiteId: row.construction_site_id || null,
    constructionSiteName: row.construction_site_name || "Без объекта",
    entriesCount: toNumber(row.entries_count),
    exitsCount: toNumber(row.exits_count),
    uniqueEmployees: toNumber(row.unique_employees),
    violationsCount: toNumber(row.violations_count),
  }));

  const periodByCounterparty = periodByCounterpartyRows.map((row) => ({
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparty_name,
    entriesCount: toNumber(row.entries_count),
    exitsCount: toNumber(row.exits_count),
    uniqueEmployees: toNumber(row.unique_employees),
    violationsCount: toNumber(row.violations_count),
  }));

  const totalsRow = totalsRows?.[0] || {};
  const totals = {
    entriesCount: toNumber(totalsRow.entries_count),
    exitsCount: toNumber(totalsRow.exits_count),
    uniqueEmployees: toNumber(totalsRow.unique_employees),
    violationsCount: toNumber(totalsRow.violations_count),
  };

  const totalInside = onlineByCounterparty.reduce(
    (acc, row) => acc + row.insideCount,
    0,
  );

  let defaultCounterparty = null;
  if (defaultCounterpartyId) {
    const periodItem = periodByCounterparty.find(
      (item) => item.counterpartyId === defaultCounterpartyId,
    );
    const onlineItem = onlineByCounterparty.find(
      (item) => item.counterpartyId === defaultCounterpartyId,
    );

    if (periodItem || onlineItem) {
      defaultCounterparty = {
        counterpartyId: defaultCounterpartyId,
        counterpartyName:
          periodItem?.counterpartyName || onlineItem?.counterpartyName || "-",
        insideCount: onlineItem?.insideCount || 0,
        entriesCount: periodItem?.entriesCount || 0,
        exitsCount: periodItem?.exitsCount || 0,
        uniqueEmployees: periodItem?.uniqueEmployees || 0,
        violationsCount: periodItem?.violationsCount || 0,
      };
    }
  }

  return {
    period,
    online: {
      totalInside,
      bySite: onlineBySite,
      byCounterparty: onlineByCounterparty,
    },
    periodStats: {
      totals,
      bySite: periodBySite,
      byCounterparty: periodByCounterparty,
    },
    defaultCounterparty,
  };
};

const fetchBySiteReportData = async ({ req, withPagination = true }) => {
  const filters = getCommonFilters(req);
  const period = buildDateRange(req.query);
  const scope = await buildScopeCte({ user: req.user, filters });

  const page = normalizePositiveInt(req.query.page, DEFAULT_PAGE);
  const requestedLimit = normalizePositiveInt(req.query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, withPagination ? MAX_LIMIT : MAX_EXPORT_ROWS);

  if (scope.empty) {
    return {
      period,
      filters,
      items: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 1,
      },
      charts: {
        hourly: [],
        daily: [],
      },
    };
  }

  const replacements = {
    ...scope.replacements,
    dateFromTs: period.dateFromTs,
    dateToExclusiveTs: period.dateToExclusiveTs,
  };

  const hourlyQuery = `
    ${scope.cte}
    SELECT
      DATE_TRUNC('hour', ev.event_time) AS hour_bucket,
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 2)::int AS entries_count,
      COUNT(*) FILTER (WHERE ev.allow IS TRUE AND ev.direction = 1)::int AS exits_count
    FROM skud_access_events ev
    INNER JOIN scoped_employees se
      ON se.employee_id = ev.employee_id
    WHERE ev.external_system = 'sigur'
      AND ev.event_time >= :dateFromTs
      AND ev.event_time < :dateToExclusiveTs
    GROUP BY DATE_TRUNC('hour', ev.event_time)
    ORDER BY hour_bucket ASC
  `;

  const hourlyRows = await sequelize.query(hourlyQuery, {
    replacements,
    type: QueryTypes.SELECT,
  });

  const tempRows = [];
  const occupancyByDay = new Map();

  hourlyRows.forEach((row) => {
    const hourBucket = row.hour_bucket;
    const dateKey = toDateOnlyString(new Date(hourBucket));
    const entriesCount = toNumber(row.entries_count);
    const exitsCount = toNumber(row.exits_count);

    const currentState = occupancyByDay.get(dateKey) || {
      current: 0,
      max: 0,
      entriesCount: 0,
      exitsCount: 0,
    };

    currentState.current += entriesCount - exitsCount;
    if (currentState.current < 0) currentState.current = 0;
    currentState.max = Math.max(currentState.max, currentState.current);
    currentState.entriesCount += entriesCount;
    currentState.exitsCount += exitsCount;

    occupancyByDay.set(dateKey, currentState);

    tempRows.push({
      hourBucket,
      dateKey,
      entriesCount,
      exitsCount,
      occupancy: currentState.current,
    });
  });

  const rows = tempRows.map((row, index) => ({
    id: index + 1,
    date: row.dateKey,
    time: new Date(row.hourBucket).toISOString().slice(11, 16),
    entriesCount: row.entriesCount,
    exitsCount: row.exitsCount,
    occupancy: row.occupancy,
    maxDailyOccupancy: occupancyByDay.get(row.dateKey)?.max || 0,
  }));

  const total = rows.length;
  const pages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const pagedRows = withPagination ? rows.slice(offset, offset + limit) : rows;

  const daily = Array.from(occupancyByDay.entries())
    .map(([date, values]) => ({
      date,
      entriesCount: values.entriesCount,
      exitsCount: values.exitsCount,
      maxOccupancy: values.max,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const hourly = rows.map((item) => ({
    dateTime: `${item.date} ${item.time}`,
    entriesCount: item.entriesCount,
    exitsCount: item.exitsCount,
    occupancy: item.occupancy,
    maxDailyOccupancy: item.maxDailyOccupancy,
  }));

  return {
    period,
    filters,
    items: pagedRows,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
    charts: {
      hourly,
      daily,
    },
  };
};

const fetchByContractorReportData = async ({ req, withPagination = true }) => {
  const filters = getCommonFilters(req);
  const period = buildDateRange(req.query);
  const scope = await buildScopeCte({ user: req.user, filters });

  const page = normalizePositiveInt(req.query.page, DEFAULT_PAGE);
  const requestedLimit = normalizePositiveInt(req.query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, withPagination ? MAX_LIMIT : MAX_EXPORT_ROWS);

  if (scope.empty) {
    return {
      period,
      filters,
      summary: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 1,
      },
      dynamics: [],
    };
  }

  const replacements = {
    ...scope.replacements,
    dateFromTs: period.dateFromTs,
    dateToExclusiveTs: period.dateToExclusiveTs,
  };

  const summaryQuery = `
    ${scope.cte},
    events_allowed AS (
      SELECT
        ev.employee_id,
        ev.event_time,
        ev.direction,
        se.counterparty_id,
        se.counterparty_name,
        se.construction_site_id,
        se.construction_site_name
      FROM skud_access_events ev
      INNER JOIN scoped_employees se
        ON se.employee_id = ev.employee_id
      WHERE ev.external_system = 'sigur'
        AND ev.allow IS TRUE
        AND ev.direction IN (1, 2)
        AND ev.event_time >= :dateFromTs
        AND ev.event_time < :dateToExclusiveTs
    ),
    employee_day AS (
      SELECT
        employee_id,
        counterparty_id,
        counterparty_name,
        construction_site_id,
        construction_site_name,
        DATE(event_time) AS day_date,
        MIN(event_time) FILTER (WHERE direction = 2) AS first_entry,
        MAX(event_time) FILTER (WHERE direction = 1) AS last_exit
      FROM events_allowed
      GROUP BY
        employee_id,
        counterparty_id,
        counterparty_name,
        construction_site_id,
        construction_site_name,
        DATE(event_time)
    ),
    employee_day_stats AS (
      SELECT
        *,
        CASE
          WHEN first_entry IS NOT NULL
            AND last_exit IS NOT NULL
            AND last_exit >= first_entry
          THEN EXTRACT(EPOCH FROM (last_exit - first_entry)) / 3600.0
          ELSE 0
        END AS total_hours
      FROM employee_day
    )
    SELECT
      counterparty_id,
      counterparty_name,
      COALESCE(construction_site_id::text, '') AS construction_site_id,
      COALESCE(construction_site_name, 'Без объекта') AS construction_site_name,
      COUNT(DISTINCT employee_id)::int AS employees_count,
      ROUND(AVG(total_hours)::numeric, 2) AS avg_hours,
      COUNT(*) FILTER (WHERE first_entry IS NOT NULL)::int AS work_days
    FROM employee_day_stats
    GROUP BY
      counterparty_id,
      counterparty_name,
      construction_site_id,
      construction_site_name
    ORDER BY counterparty_name ASC, construction_site_name ASC
  `;

  const dynamicsQuery = `
    ${scope.cte}
    SELECT
      DATE(ev.event_time) AS day_date,
      se.counterparty_id,
      se.counterparty_name,
      COALESCE(se.construction_site_id::text, '') AS construction_site_id,
      COALESCE(se.construction_site_name, 'Без объекта') AS construction_site_name,
      COUNT(DISTINCT ev.employee_id)::int AS employees_count
    FROM skud_access_events ev
    INNER JOIN scoped_employees se
      ON se.employee_id = ev.employee_id
    WHERE ev.external_system = 'sigur'
      AND ev.allow IS TRUE
      AND ev.direction = 2
      AND ev.event_time >= :dateFromTs
      AND ev.event_time < :dateToExclusiveTs
    GROUP BY
      DATE(ev.event_time),
      se.counterparty_id,
      se.counterparty_name,
      se.construction_site_id,
      se.construction_site_name
    ORDER BY day_date ASC, se.counterparty_name ASC, construction_site_name ASC
  `;

  const [summaryRows, dynamicsRows] = await Promise.all([
    sequelize.query(summaryQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(dynamicsQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
  ]);

  const summary = summaryRows.map((row, index) => ({
    id: index + 1,
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparty_name,
    constructionSiteId: row.construction_site_id || null,
    constructionSiteName: row.construction_site_name || "Без объекта",
    employeesCount: toNumber(row.employees_count),
    averageHours: formatHours(row.avg_hours),
    workDays: toNumber(row.work_days),
  }));

  const total = summary.length;
  const pages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const pagedSummary = withPagination
    ? summary.slice(offset, offset + limit)
    : summary;

  const dynamics = dynamicsRows.map((row) => ({
    date: toDateOnlyString(new Date(row.day_date)),
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparty_name,
    constructionSiteId: row.construction_site_id || null,
    constructionSiteName: row.construction_site_name || "Без объекта",
    employeesCount: toNumber(row.employees_count),
  }));

  return {
    period,
    filters,
    summary: pagedSummary,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
    dynamics,
    summaryAll: summary,
  };
};

const fetchEmployeeReportData = async ({ req, withPagination = true }) => {
  const filters = getCommonFilters(req);
  const period = buildDateRange(req.query);
  const scope = await buildScopeCte({ user: req.user, filters });

  const page = normalizePositiveInt(req.query.page, DEFAULT_PAGE);
  const requestedLimit = normalizePositiveInt(req.query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, withPagination ? MAX_LIMIT : MAX_EXPORT_ROWS);

  if (!filters.employeeId) {
    throw new AppError("Для индивидуальной статистики выберите сотрудника", 400);
  }

  if (scope.empty) {
    return {
      period,
      filters,
      employee: null,
      timesheet: [],
      passages: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 1,
      },
      totals: {
        workDays: 0,
        totalHours: 0,
      },
    };
  }

  const replacements = {
    ...scope.replacements,
    dateFromTs: period.dateFromTs,
    dateToExclusiveTs: period.dateToExclusiveTs,
    limit,
    offset: (page - 1) * limit,
  };

  const employeeQuery = `
    ${scope.cte}
    SELECT
      employee_id,
      employee_full_name,
      counterparty_id,
      counterparty_name,
      construction_site_id,
      construction_site_name
    FROM scoped_employees
    LIMIT 1
  `;

  const timesheetQuery = `
    ${scope.cte},
    events_allowed AS (
      SELECT
        ev.event_time,
        ev.direction
      FROM skud_access_events ev
      INNER JOIN scoped_employees se
        ON se.employee_id = ev.employee_id
      WHERE ev.external_system = 'sigur'
        AND ev.allow IS TRUE
        AND ev.direction IN (1, 2)
        AND ev.event_time >= :dateFromTs
        AND ev.event_time < :dateToExclusiveTs
    ),
    employee_day AS (
      SELECT
        DATE(event_time) AS day_date,
        MIN(event_time) FILTER (WHERE direction = 2) AS first_entry,
        MAX(event_time) FILTER (WHERE direction = 1) AS last_exit
      FROM events_allowed
      GROUP BY DATE(event_time)
    )
    SELECT
      day_date,
      first_entry,
      last_exit,
      CASE
        WHEN first_entry IS NOT NULL
          AND last_exit IS NOT NULL
          AND last_exit >= first_entry
        THEN EXTRACT(EPOCH FROM (last_exit - first_entry)) / 3600.0
        ELSE 0
      END AS total_hours
    FROM employee_day
    ORDER BY day_date ASC
  `;

  const passagesBase = `
    ${scope.cte}
    SELECT
      ev.id,
      ev.event_time,
      ev.access_point,
      ev.direction,
      ev.allow,
      ev.decision_message,
      COALESCE(ev.raw_payload->>'reasonCode', '') AS reason_code,
      se.counterparty_id,
      se.counterparty_name,
      COALESCE(se.construction_site_id::text, '') AS construction_site_id,
      COALESCE(se.construction_site_name, 'Без объекта') AS construction_site_name
    FROM skud_access_events ev
    INNER JOIN scoped_employees se
      ON se.employee_id = ev.employee_id
    WHERE ev.external_system = 'sigur'
      AND ev.event_time >= :dateFromTs
      AND ev.event_time < :dateToExclusiveTs
  `;

  const passagesQuery = `${passagesBase}
    ORDER BY ev.event_time DESC, ev.id DESC
    ${withPagination ? "LIMIT :limit OFFSET :offset" : ""}
  `;

  const countQuery = `
    ${scope.cte}
    SELECT COUNT(*)::int AS total
    FROM skud_access_events ev
    INNER JOIN scoped_employees se
      ON se.employee_id = ev.employee_id
    WHERE ev.external_system = 'sigur'
      AND ev.event_time >= :dateFromTs
      AND ev.event_time < :dateToExclusiveTs
  `;

  const [employeeRows, timesheetRows, passagesRows, countRows] = await Promise.all([
    sequelize.query(employeeQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(timesheetQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(passagesQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(countQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
  ]);

  const employeeRow = employeeRows?.[0] || null;

  const employee = employeeRow
    ? {
        employeeId: employeeRow.employee_id,
        employeeFullName: employeeRow.employee_full_name,
        counterpartyId: employeeRow.counterparty_id,
        counterpartyName: employeeRow.counterparty_name,
        constructionSiteId: employeeRow.construction_site_id || null,
        constructionSiteName:
          employeeRow.construction_site_name || "Без объекта",
      }
    : null;

  const timesheet = timesheetRows.map((row, index) => ({
    id: index + 1,
    date: toDateOnlyString(new Date(row.day_date)),
    firstEntry: toDateFromValue(row.first_entry),
    lastExit: toDateFromValue(row.last_exit),
    totalHours: formatHours(row.total_hours),
  }));

  const passages = passagesRows.map((row) => ({
    id: row.id,
    eventTime: formatDateTime(row.event_time),
    accessPoint: row.access_point,
    direction: toNumber(row.direction),
    directionLabel: DIRECTION_LABELS[toNumber(row.direction)] || "-",
    allow: row.allow === true,
    decisionMessage: row.decision_message || "",
    reasonCode: row.reason_code || "",
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparty_name,
    constructionSiteId: row.construction_site_id || null,
    constructionSiteName: row.construction_site_name || "Без объекта",
  }));

  const total = toNumber(countRows?.[0]?.total);
  const pages = Math.ceil(total / limit) || 1;

  const totals = {
    workDays: timesheet.length,
    totalHours: formatHours(
      timesheet.reduce((acc, row) => acc + (row.totalHours || 0), 0),
    ),
  };

  return {
    period,
    filters,
    employee,
    timesheet,
    passages,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
    totals,
  };
};

const VIOLATION_TYPE_SQL = `
  CASE
    WHEN COALESCE(ev.raw_payload->>'reasonCode', '') LIKE 'state_blocked%'
      OR COALESCE(ev.raw_payload->>'reasonCode', '') LIKE 'state_revoked%'
    THEN 'after_block'
    WHEN COALESCE(ev.raw_payload->>'reasonCode', '') IN (
      'employee_not_found',
      'state_missing',
      'qr_not_found',
      'qr_invalid',
      'qr_expired',
      'qr_used',
      'qr_revoked'
    )
    THEN 'without_pass'
    ELSE 'other'
  END
`;

const fetchViolationsReportData = async ({ req, withPagination = true }) => {
  const filters = getCommonFilters(req);
  const period = buildDateRange(req.query);
  const scope = await buildScopeCte({ user: req.user, filters });

  const page = normalizePositiveInt(req.query.page, DEFAULT_PAGE);
  const requestedLimit = normalizePositiveInt(req.query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, withPagination ? MAX_LIMIT : MAX_EXPORT_ROWS);

  const violationType = normalizeSearch(req.query.violationType);
  if (
    violationType &&
    !["after_block", "without_pass", "other"].includes(violationType)
  ) {
    throw new AppError("Некорректный тип нарушения", 400);
  }

  if (scope.empty) {
    return {
      period,
      filters: {
        ...filters,
        violationType,
      },
      items: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 1,
      },
    };
  }

  const replacements = {
    ...scope.replacements,
    dateFromTs: period.dateFromTs,
    dateToExclusiveTs: period.dateToExclusiveTs,
    limit,
    offset: (page - 1) * limit,
  };

  const typeWhere = violationType ? "WHERE v.violation_type = :violationType" : "";
  if (violationType) {
    replacements.violationType = violationType;
  }

  const violationsCte = `
    ${scope.cte},
    violations AS (
      SELECT
        ev.id,
        ev.employee_id,
        se.employee_full_name,
        se.counterparty_id,
        se.counterparty_name,
        COALESCE(se.construction_site_id::text, '') AS construction_site_id,
        COALESCE(se.construction_site_name, 'Без объекта') AS construction_site_name,
        ev.event_time,
        ev.access_point,
        COALESCE(ev.raw_payload->>'reasonCode', '') AS reason_code,
        ev.decision_message,
        ${VIOLATION_TYPE_SQL} AS violation_type
      FROM skud_access_events ev
      INNER JOIN scoped_employees se
        ON se.employee_id = ev.employee_id
      WHERE ev.external_system = 'sigur'
        AND COALESCE(ev.allow, FALSE) = FALSE
        AND ev.event_time >= :dateFromTs
        AND ev.event_time < :dateToExclusiveTs
    )
  `;

  const rowsQuery = `
    ${violationsCte}
    SELECT *
    FROM violations v
    ${typeWhere}
    ORDER BY v.event_time DESC, v.id DESC
    ${withPagination ? "LIMIT :limit OFFSET :offset" : ""}
  `;

  const countQuery = `
    ${violationsCte}
    SELECT COUNT(*)::int AS total
    FROM violations v
    ${typeWhere}
  `;

  const [rows, countRows] = await Promise.all([
    sequelize.query(rowsQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
    sequelize.query(countQuery, {
      replacements,
      type: QueryTypes.SELECT,
    }),
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeFullName: row.employee_full_name || "-",
    counterpartyId: row.counterparty_id,
    counterpartyName: row.counterparty_name || "-",
    constructionSiteId: row.construction_site_id || null,
    constructionSiteName: row.construction_site_name || "Без объекта",
    eventTime: formatDateTime(row.event_time),
    accessPoint: row.access_point,
    reasonCode: row.reason_code || "",
    decisionMessage: row.decision_message || "",
    violationType: row.violation_type,
    violationTypeLabel:
      VIOLATION_TYPE_LABELS[row.violation_type] || VIOLATION_TYPE_LABELS.other,
  }));

  const total = toNumber(countRows?.[0]?.total);
  const pages = Math.ceil(total / limit) || 1;

  return {
    period,
    filters: {
      ...filters,
      violationType,
    },
    items,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
};

const escapePdfText = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const toPdfAsciiText = (value) =>
  transliterate(String(value || ""))
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const createSimplePdfBuffer = (lines) => {
  const normalized = (Array.isArray(lines) ? lines : [])
    .map((line) => toPdfAsciiText(line))
    .map((line) => line.slice(0, 105));

  if (normalized.length === 0) {
    normalized.push("No data");
  }

  const linesPerPage = 48;
  const pages = [];
  for (let index = 0; index < normalized.length; index += linesPerPage) {
    pages.push(normalized.slice(index, index + linesPerPage));
  }

  const objectStrings = [];
  const pageObjectNums = [];
  const contentObjectNums = [];

  let nextObjNum = 3;
  for (let i = 0; i < pages.length; i += 1) {
    pageObjectNums.push(nextObjNum);
    nextObjNum += 1;
    contentObjectNums.push(nextObjNum);
    nextObjNum += 1;
  }

  const fontObjNum = nextObjNum;

  pages.forEach((pageLines, pageIndex) => {
    const textOps = ["BT", "/F1 9 Tf"];
    let y = 810;

    pageLines.forEach((line) => {
      textOps.push(`1 0 0 1 32 ${y} Tm (${escapePdfText(line)}) Tj`);
      y -= 16;
    });

    textOps.push("ET");

    const contentStream = textOps.join("\n");
    const contentObjNum = contentObjectNums[pageIndex];
    const pageObjNum = pageObjectNums[pageIndex];

    objectStrings[contentObjNum] = `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`;
    objectStrings[pageObjNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>`;
  });

  objectStrings[fontObjNum] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objectStrings[2] = `<< /Type /Pages /Kids [${pageObjectNums
    .map((objNum) => `${objNum} 0 R`)
    .join(" ")}] /Count ${pageObjectNums.length} >>`;
  objectStrings[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  const maxObjNum = objectStrings.length - 1;
  const offsets = new Array(maxObjNum + 1).fill(0);

  let output = "%PDF-1.4\n";

  for (let objNum = 1; objNum <= maxObjNum; objNum += 1) {
    offsets[objNum] = Buffer.byteLength(output, "utf8");
    output += `${objNum} 0 obj\n${objectStrings[objNum]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(output, "utf8");
  output += `xref\n0 ${maxObjNum + 1}\n`;
  output += "0000000000 65535 f \n";

  for (let objNum = 1; objNum <= maxObjNum; objNum += 1) {
    output += `${String(offsets[objNum]).padStart(10, "0")} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${maxObjNum + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, "utf8");
};

export const getAnalyticsDashboard = async (req, res, next) => {
  try {
    const data = await fetchDashboardData(req);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsBySiteReport = async (req, res, next) => {
  try {
    const data = await fetchBySiteReportData({ req, withPagination: true });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const exportAnalyticsBySiteExcel = async (req, res, next) => {
  try {
    const data = await fetchBySiteReportData({ req, withPagination: false });
    const rows = data.items.slice(0, MAX_EXPORT_ROWS);

    const worksheetRows = rows.map((item, index) => ({
      "#": index + 1,
      Date: item.date,
      Time: item.time,
      Entries: item.entriesCount,
      Exits: item.exitsCount,
      Occupancy: item.occupancy,
      MaxDailyOccupancy: item.maxDailyOccupancy,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(worksheetRows),
      "BySite",
    );

    if (data.charts?.daily?.length) {
      const dailyRows = data.charts.daily.map((item) => ({
        Date: item.date,
        Entries: item.entriesCount,
        Exits: item.exitsCount,
        MaxOccupancy: item.maxOccupancy,
      }));

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(dailyRows),
        "Daily",
      );
    }

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `${sanitizeAsciiFileName("analytics_by_site")}_${toDateOnlyString(new Date())}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsByContractorReport = async (req, res, next) => {
  try {
    const data = await fetchByContractorReportData({ req, withPagination: true });

    res.json({
      success: true,
      data: {
        period: data.period,
        filters: data.filters,
        summary: data.summary,
        pagination: data.pagination,
        dynamics: data.dynamics,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const exportAnalyticsByContractorExcel = async (req, res, next) => {
  try {
    const data = await fetchByContractorReportData({ req, withPagination: false });

    const summaryRows = data.summary.slice(0, MAX_EXPORT_ROWS).map((item, index) => ({
      "#": index + 1,
      Counterparty: item.counterpartyName,
      ConstructionSite: item.constructionSiteName,
      EmployeesCount: item.employeesCount,
      AverageHours: item.averageHours,
      WorkDays: item.workDays,
    }));

    const dynamicsRows = data.dynamics.slice(0, MAX_EXPORT_ROWS).map((item) => ({
      Date: item.date,
      Counterparty: item.counterpartyName,
      ConstructionSite: item.constructionSiteName,
      EmployeesCount: item.employeesCount,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      "Summary",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dynamicsRows),
      "Dynamics",
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `${sanitizeAsciiFileName("analytics_by_contractor")}_${toDateOnlyString(new Date())}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const exportAnalyticsByContractorPdf = async (req, res, next) => {
  try {
    const data = await fetchByContractorReportData({ req, withPagination: false });
    const lines = [];

    lines.push("Analytics report by contractors");
    lines.push(`Period: ${data.period.dateFrom} - ${data.period.dateTo}`);
    lines.push("");
    lines.push("Counterparty | Site | Employees | AvgHours | WorkDays");

    data.summary.slice(0, MAX_EXPORT_ROWS).forEach((item) => {
      lines.push(
        `${item.counterpartyName} | ${item.constructionSiteName} | ${item.employeesCount} | ${item.averageHours} | ${item.workDays}`,
      );
    });

    if (data.summary.length === 0) {
      lines.push("No data for selected filters.");
    }

    const buffer = createSimplePdfBuffer(lines);
    const fileName = `${sanitizeAsciiFileName("analytics_by_contractor")}_${toDateOnlyString(new Date())}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsEmployeeReport = async (req, res, next) => {
  try {
    const data = await fetchEmployeeReportData({ req, withPagination: true });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const exportAnalyticsEmployeeExcel = async (req, res, next) => {
  try {
    const data = await fetchEmployeeReportData({ req, withPagination: false });

    const timesheetRows = data.timesheet.slice(0, MAX_EXPORT_ROWS).map((item, index) => ({
      "#": index + 1,
      Date: item.date,
      FirstEntry: item.firstEntry || "",
      LastExit: item.lastExit || "",
      TotalHours: item.totalHours,
    }));

    const passagesRows = data.passages.slice(0, MAX_EXPORT_ROWS).map((item, index) => ({
      "#": index + 1,
      EventTime: item.eventTime,
      AccessPoint: item.accessPoint,
      Direction: item.directionLabel,
      Allowed: item.allow ? "Yes" : "No",
      ReasonCode: item.reasonCode,
      DecisionMessage: item.decisionMessage,
      Counterparty: item.counterpartyName,
      ConstructionSite: item.constructionSiteName,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(timesheetRows),
      "Timesheet",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(passagesRows),
      "Passages",
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const employeeSuffix = sanitizeAsciiFileName(
      data.employee?.employeeFullName || "employee",
    );
    const fileName = `${sanitizeAsciiFileName("analytics_employee")}_${employeeSuffix}_${toDateOnlyString(new Date())}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsViolationsReport = async (req, res, next) => {
  try {
    const data = await fetchViolationsReportData({ req, withPagination: true });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const exportAnalyticsViolationsExcel = async (req, res, next) => {
  try {
    const data = await fetchViolationsReportData({ req, withPagination: false });
    const rows = data.items.slice(0, MAX_EXPORT_ROWS).map((item, index) => ({
      "#": index + 1,
      Employee: item.employeeFullName,
      Counterparty: item.counterpartyName,
      ConstructionSite: item.constructionSiteName,
      EventTime: item.eventTime,
      AccessPoint: item.accessPoint,
      ViolationType: item.violationTypeLabel,
      ReasonCode: item.reasonCode,
      DecisionMessage: item.decisionMessage,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows),
      "Violations",
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `${sanitizeAsciiFileName("analytics_violations")}_${toDateOnlyString(new Date())}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
