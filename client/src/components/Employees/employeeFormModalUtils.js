import dayjs from "dayjs";

export const DATE_FORMAT = "DD.MM.YYYY";
export const OCR_CONFLICT_HELP =
  "Данные отличаются от распознанных. Проверьте правильность.";
export const OCR_DEBUG_PREFIX = "[EmployeeOCR]";
export const OCR_SUPPORTED_FILE_TYPES = [
  "passport",
  "patent_front",
  "patent_back",
  "kig",
  "visa",
];
export const OCR_FILE_TYPE_LABELS = {
  passport: "Паспорт",
  patent_front: "Патент (лицевая сторона)",
  patent_back: "Патент (задняя сторона)",
  kig: "КИГ",
  visa: "Виза",
};
export const OCR_DOC_TYPE_LABELS = {
  passport_rf: "паспорт РФ",
  foreign_passport: "иностранный паспорт",
  patent: "патент",
  kig: "КИГ",
  visa: "виза",
};
export const MVD_TYPE_LABELS = {
  rkl: "РКЛ",
  rklv2: "РКЛ v2",
  patent: "Патент",
  patentv2: "Патент v2",
  wanted: "Розыск",
  chekpassportv2: "Проверка паспорта v2",
};
export const MVD_PARAM_LABELS = {
  fio: "ФИО",
  birthdate: "Дата рождения",
  docnum: "Номер документа",
  docdate: "Дата документа",
  docseria: "Серия документа",
  docnumber: "Номер документа",
  blankseria: "Серия бланка",
  blanknumber: "Номер бланка",
  lbg: "Код подразделения/ЛБГ",
  lastname: "Фамилия",
  firstname: "Имя",
  seria: "Серия паспорта",
  nomer: "Номер паспорта",
};
export const MVD_PARAM_PLACEHOLDERS = {
  birthdate: "ДД.ММ.ГГГГ",
  docdate: "ДД.ММ.ГГГГ",
};

export const normalizeString = (value) => String(value || "").trim();

export const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return normalizeString(value) === "";
  if (dayjs.isDayjs(value)) return !value.isValid();
  return false;
};

export const normalizeDateForCompare = (value) => {
  if (!value) return "";
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format("YYYY-MM-DD") : "";
  }
  const normalized = normalizeString(value);
  if (!normalized) return "";
  if (normalized.match(/^\d{4}-\d{2}-\d{2}$/)) return normalized;
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : normalized;
};

export const normalizeGenderForCompare = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (["male", "m", "м", "муж", "мужской"].includes(normalized)) return "male";
  if (["female", "f", "ж", "жен", "женский"].includes(normalized)) {
    return "female";
  }
  return normalized;
};

export const normalizePassportNumberForCompare = (value) =>
  normalizeString(value).replace(/[^\d]/g, "");

export const formatPassportNumberForForm = ({ series, number }) => {
  const seriesDigits = normalizeString(series)
    .replace(/[^\d]/g, "")
    .slice(0, 4);
  const numberDigits = normalizeString(number)
    .replace(/[^\d]/g, "")
    .slice(0, 6);

  if (!seriesDigits && !numberDigits) return null;
  if (!seriesDigits) return numberDigits || null;
  if (!numberDigits) return seriesDigits || null;

  return `${seriesDigits} №${numberDigits}`;
};

export const formatDateForDisplay = (value) => {
  const normalized = normalizeDateForCompare(value);
  if (!normalized) return "—";
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : normalized;
};

export const formatFieldValueForDisplay = (
  fieldName,
  value,
  citizenships = [],
) => {
  if (isEmptyValue(value)) return "—";

  if (
    fieldName === "birthDate" ||
    fieldName === "passportDate" ||
    fieldName === "passportExpiryDate" ||
    fieldName === "patentIssueDate" ||
    fieldName === "kigEndDate"
  ) {
    return formatDateForDisplay(value);
  }

  if (fieldName === "gender") {
    const normalized = normalizeGenderForCompare(value);
    if (normalized === "male") return "Муж";
    if (normalized === "female") return "Жен";
    return String(value);
  }

  if (fieldName === "citizenshipId") {
    const match = citizenships.find((item) => item.id === value);
    return match?.name || String(value);
  }

  return String(value);
};

export const toDebugValue = (value) => {
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format("YYYY-MM-DD") : "Invalid dayjs";
  }
  if (value === undefined) return "__undefined__";
  if (value === null) return "__null__";
  return value;
};

export const toDebugObject = (objectValue = {}) =>
  Object.fromEntries(
    Object.entries(objectValue).map(([key, value]) => [
      key,
      toDebugValue(value),
    ]),
  );

export const mapOcrSexToFormGender = (ocrValue) => {
  const normalized = normalizeString(ocrValue).toUpperCase();
  if (normalized === "M") return "male";
  if (normalized === "F") return "female";
  return null;
};

export const resolveCitizenshipIdByOcrCode = (citizenships = [], ocrValue = "") => {
  const normalized = normalizeString(ocrValue).toUpperCase();
  if (!normalized) return null;

  const byCode = citizenships.find((item) => {
    const code = normalizeString(item.code).toUpperCase();
    if (!code) return false;
    return (
      code === normalized ||
      (normalized === "RUS" && code === "RU") ||
      (normalized === "RU" && code === "RUS")
    );
  });
  if (byCode) return byCode.id;

  if (normalized === "RUS" || normalized === "RU") {
    const byName = citizenships.find((item) =>
      normalizeString(item.name).toLowerCase().includes("рос"),
    );
    if (byName) return byName.id;
  }

  return null;
};

export const parseOcrRawJson = (response = {}) => {
  const rawJson =
    response?.data?.raw?.json ||
    response?.raw?.json ||
    response?.data?.data?.raw?.json ||
    null;

  if (rawJson && typeof rawJson === "object") {
    return rawJson;
  }

  const rawContent =
    response?.data?.raw?.content ||
    response?.raw?.content ||
    response?.data?.data?.raw?.content ||
    null;

  if (typeof rawContent !== "string" || !rawContent.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawContent);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const valueFromAliases = (source = {}, aliases = []) => {
  for (const key of aliases) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      const value = normalizeString(source[key]);
      if (value) return value;
    }
  }
  return null;
};

const toDigits = (value, maxLength = 64) =>
  normalizeString(value).replace(/[^\d]/g, "").slice(0, maxLength);

export const resolvePassportNumberPartsFromOcr = (
  normalized = {},
  rawJson = {},
) => {
  let seriesDigits = toDigits(
    normalized.passportSeries ||
      valueFromAliases(rawJson, ["passportSeries", "passport_series", "series"]),
    4,
  );

  let numberDigits = toDigits(
    normalized.passportNumber ||
      valueFromAliases(rawJson, [
        "passportNumberOnly",
        "passport_number_only",
        "numberOnly",
        "number_only",
      ]),
    10,
  );

  const rawCombinedDigits = toDigits(
    valueFromAliases(rawJson, [
      "passportNumber",
      "passport_number",
      "number",
      "seriesNumber",
      "series_number",
    ]),
    10,
  );

  if (!numberDigits && rawCombinedDigits) {
    if (rawCombinedDigits.length >= 10) {
      seriesDigits = seriesDigits || rawCombinedDigits.slice(0, 4);
      numberDigits = rawCombinedDigits.slice(4, 10);
    } else {
      // Для короткого OCR-значения не формируем серию искусственно.
      seriesDigits = "";
      numberDigits = rawCombinedDigits.slice(0, 6);
    }
  }

  if (
    seriesDigits &&
    numberDigits &&
    numberDigits.length < 6 &&
    rawCombinedDigits
  ) {
    if (rawCombinedDigits.length <= 6) {
      seriesDigits = "";
      numberDigits = rawCombinedDigits.slice(0, 6);
    }
  }

  return {
    seriesDigits: seriesDigits || null,
    numberDigits: numberDigits ? numberDigits.slice(0, 6) : null,
  };
};

export const resolveOcrDocumentTypeByFile = (
  fileDocumentType,
  passportTypeValue,
) => {
  if (fileDocumentType === "passport") {
    return passportTypeValue === "foreign" ? "foreign_passport" : "passport_rf";
  }
  if (
    fileDocumentType === "patent_front" ||
    fileDocumentType === "patent_back"
  ) {
    return "patent";
  }
  if (fileDocumentType === "kig") {
    return "kig";
  }
  if (fileDocumentType === "visa") {
    return "visa";
  }
  return null;
};

export const formatDateForMvd = (value) => {
  if (!value) return "";
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format("DD.MM.YYYY") : "";
  }
  const normalized = normalizeString(value);
  if (!normalized) return "";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const parsed = dayjs(normalized);
    return parsed.isValid() ? parsed.format("DD.MM.YYYY") : normalized;
  }
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.format("DD.MM.YYYY") : normalized;
};

export const extractPassportSeriesAndNumber = (passportNumberValue) => {
  const digits = normalizeString(passportNumberValue).replace(/[^\d]/g, "");
  return {
    series: digits.slice(0, 4),
    number: digits.slice(4, 10),
  };
};

export const buildMvdPrefillValues = (checkType, employeeFormValues = {}) => {
  const passport = extractPassportSeriesAndNumber(
    employeeFormValues.passportNumber,
  );
  const patentDigits = normalizeString(employeeFormValues.patentNumber).replace(
    /[^\d]/g,
    "",
  );
  const blankRaw = normalizeString(employeeFormValues.blankNumber).toUpperCase();
  const blankLetters = blankRaw.replace(/[^A-ZА-ЯЁ]/g, "").slice(0, 2);
  const blankDigits = blankRaw.replace(/[^\d]/g, "").slice(0, 7);

  if (checkType === "wanted") {
    return {
      lastname: normalizeString(employeeFormValues.lastName),
      firstname: normalizeString(employeeFormValues.firstName),
      birthdate: formatDateForMvd(employeeFormValues.birthDate),
    };
  }

  if (checkType === "chekpassportv2") {
    return {
      seria: passport.series,
      nomer: passport.number,
      lastname: normalizeString(employeeFormValues.lastName),
      firstname: normalizeString(employeeFormValues.firstName),
    };
  }

  if (checkType === "rkl" || checkType === "rklv2") {
    return {
      birthdate: formatDateForMvd(employeeFormValues.birthDate),
      docnum: normalizeString(employeeFormValues.passportNumber).replace(
        /[\s№]/g,
        "",
      ),
      docdate: formatDateForMvd(employeeFormValues.passportDate),
      fio: [
        normalizeString(employeeFormValues.lastName),
        normalizeString(employeeFormValues.firstName),
        normalizeString(employeeFormValues.middleName),
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  if (checkType === "patent" || checkType === "patentv2") {
    return {
      docseria: patentDigits.slice(0, 2),
      docnumber: patentDigits.slice(2),
      blankseria: blankLetters,
      blanknumber: blankDigits,
      lbg: "",
    };
  }

  return {};
};
