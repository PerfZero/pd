import dayjs from "dayjs";
import { formatInn, formatKig, formatSnils } from "@/utils/formatters";
import { findEmployeeMapping } from "@/modules/employees/lib/exportToExcelModalUtils";

export const buildExportToExcelModalColumns = ({
  constructionSiteId,
  counterpartyId,
}) => [
  { title: "№", render: (_, __, index) => index + 1, width: 50 },
  {
    title: "Ф.И.О.",
    render: (_, record) =>
      `${record.lastName} ${record.firstName} ${record.middleName || ""}`,
    ellipsis: true,
  },
  {
    title: "КИГ",
    dataIndex: "kig",
    key: "kig",
    ellipsis: true,
    render: (value) => formatKig(value),
  },
  {
    title: "Гражданство",
    dataIndex: ["citizenship", "name"],
    key: "citizenship",
    ellipsis: true,
  },
  {
    title: "Дата рождения",
    dataIndex: "birthDate",
    key: "birthDate",
    render: (date) => (date ? dayjs(date).format("DD.MM.YYYY") : "-"),
    ellipsis: true,
  },
  {
    title: "СНИЛС",
    dataIndex: "snils",
    key: "snils",
    ellipsis: true,
    render: (value) => formatSnils(value),
  },
  {
    title: "Должность",
    dataIndex: ["position", "name"],
    key: "position",
    ellipsis: true,
  },
  {
    title: "ИНН сотрудника",
    dataIndex: "inn",
    key: "inn",
    ellipsis: true,
    render: (value) => formatInn(value),
  },
  {
    title: "Организация",
    key: "organization",
    width: 200,
    render: (_, record) => {
      const mapping = findEmployeeMapping({
        employee: record,
        constructionSiteId,
        counterpartyId,
      });
      return mapping?.counterparty?.name || "-";
    },
  },
  {
    title: "ИНН организации",
    key: "organizationInn",
    width: 140,
    render: (_, record) => {
      const mapping = findEmployeeMapping({
        employee: record,
        constructionSiteId,
        counterpartyId,
      });
      return mapping?.counterparty?.inn || "-";
    },
  },
  {
    title: "КПП организации",
    key: "organizationKpp",
    width: 120,
    render: (_, record) => {
      const mapping = findEmployeeMapping({
        employee: record,
        constructionSiteId,
        counterpartyId,
      });
      return mapping?.counterparty?.kpp || "-";
    },
  },
];
