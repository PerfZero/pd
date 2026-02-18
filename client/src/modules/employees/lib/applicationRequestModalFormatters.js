import dayjs from "dayjs";
import { formatInn, formatKig, formatSnils } from "@/utils/formatters";

const formatApplicationRequestCellValue = (employee, columnKey) => {
  switch (columnKey) {
    case "number":
      return "";
    case "fullName":
      return (
        `${employee.lastName || ""} ${employee.firstName || ""} ${employee.middleName || ""}`.trim() ||
        "-"
      );
    case "kig":
      return formatKig(employee.kig) || "-";
    case "citizenship":
      return employee.citizenship?.name || "-";
    case "birthDate":
      return employee.birthDate
        ? dayjs(employee.birthDate).format("DD.MM.YYYY")
        : "-";
    case "snils":
      return formatSnils(employee.snils) || "-";
    case "position":
      return employee.position?.name || "-";
    case "inn":
      return formatInn(employee.inn) || "-";
    case "passport":
      return employee.passportNumber || "-";
    case "passportDate":
      return employee.passportDate
        ? dayjs(employee.passportDate).format("DD.MM.YYYY")
        : "-";
    case "passportIssuer":
      return employee.passportIssuer || "-";
    case "registrationAddress":
      return employee.registrationAddress || "-";
    case "phone":
      return employee.phone || "-";
    case "department": {
      const departmentNames =
        employee.employeeCounterpartyMappings?.map(
          (mapping) => mapping.department?.name,
        ) || [];
      return departmentNames.join(", ") || "-";
    }
    case "counterparty": {
      const counterpartyName =
        employee.employeeCounterpartyMappings?.[0]?.counterparty?.name;
      return counterpartyName || "-";
    }
    case "counterpartyInn": {
      const counterpartyInn =
        employee.employeeCounterpartyMappings?.[0]?.counterparty?.inn;
      return counterpartyInn || "-";
    }
    case "counterpartyKpp": {
      const counterpartyKpp =
        employee.employeeCounterpartyMappings?.[0]?.counterparty?.kpp;
      return counterpartyKpp || "-";
    }
    default:
      return "-";
  }
};

export const buildApplicationRequestExcelData = ({
  employees,
  selectedColumns,
}) => {
  const activeColumns = selectedColumns.filter(
    (column) => column.enabled && column.key !== "number",
  );
  const hasNumberColumn = selectedColumns.find(
    (column) => column.key === "number",
  )?.enabled;

  const rows = employees.map((employee, index) => {
    const row = {};

    if (hasNumberColumn) {
      row["№"] = index + 1;
    }

    activeColumns.forEach((column) => {
      row[column.label] = formatApplicationRequestCellValue(
        employee,
        column.key,
      );
    });

    return row;
  });

  return {
    rows,
    hasNumberColumn: !!hasNumberColumn,
    activeColumnCount: activeColumns.length,
  };
};
