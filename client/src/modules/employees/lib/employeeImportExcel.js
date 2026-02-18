import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import * as XLSX from "xlsx";

dayjs.extend(customParseFormat);

const normalizeValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).trim().replace(/\.+$/g, "");
};

const parseExcelDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (!parsedDate) {
      return null;
    }
    return dayjs(new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d)).format(
      "YYYY-MM-DD",
    );
  }

  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = dayjs(
    normalized,
    ["DD.MM.YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
    true,
  );
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
};

const resolveNameFields = (row) => {
  if (row["Ф.И.О."]) {
    return {
      lastName: String(row["Ф.И.О."] || "").trim(),
      firstName: String(row.__EMPTY || "").trim(),
      middleName: String(row.__EMPTY_1 || "").trim(),
    };
  }

  if (row.Фамилия) {
    return {
      lastName: String(row.Фамилия || "").trim(),
      firstName: String(row.Имя || "").trim(),
      middleName: String(row.Отчество || "").trim(),
    };
  }

  return {
    lastName: String(row.last_name || "").trim(),
    firstName: String(row.first_name || "").trim(),
    middleName: String(row.middle_name || "").trim(),
  };
};

const resolveKig = (row) => {
  const directKig = row.КИГ || row.kig;
  if (directKig) {
    return directKig;
  }

  return row["КИГ \r\nКарта иностранного гражданина"] || "";
};

const mapEmployeeImportRows = (rows = []) => {
  return rows.map((row) => {
    const { lastName, firstName, middleName } = resolveNameFields(row);
    const kig = resolveKig(row);

    return {
      counterpartyInn: normalizeValue(
        row["ИНН организации"] || row.inn_organization,
      ),
      counterpartyKpp: normalizeValue(
        row["КПП организации"] || row.kpp_organization,
      ),
      lastName,
      firstName,
      middleName,
      inn: normalizeValue(row["ИНН сотрудника"] || row.employee_inn),
      snils: normalizeValue(row.СНИЛС || row.snils),
      kig: normalizeValue(kig),
      kigEndDate: parseExcelDate(row["Срок окончания КИГ"] || row.kig_end_date),
      citizenship: normalizeValue(row.Гражданство || row.citizenship),
      birthDate: parseExcelDate(row["Дата рождения"] || row.birth_date),
      position: normalizeValue(row.Должность || row.position),
      organization: normalizeValue(row.Организация || row.organization),
    };
  });
};

export const readEmployeesFromExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        resolve(mapEmployeeImportRows(rawData));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("FileReader failed"));
    };

    reader.readAsBinaryString(file);
  });
