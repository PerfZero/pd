import dayjs from "dayjs";

export const DATE_FORMAT = "DD.MM.YYYY";

export const OCR_FILE_TYPE_LABELS = {
  passport: "Паспорт",
  patent_front: "Патент (лицевая сторона)",
  patent_back: "Патент (задняя сторона)",
  kig: "КИГ",
  visa: "Виза",
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

const normalizeString = (value) => String(value || "").trim();

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return normalizeString(value) === "";
  if (dayjs.isDayjs(value)) return !value.isValid();
  return false;
};

const normalizeDateForCompare = (value) => {
  if (!value) return "";
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format("YYYY-MM-DD") : "";
  }

  const normalized = normalizeString(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : normalized;
};

const normalizeGenderForCompare = (value) => {
  const normalized = normalizeString(value).toLowerCase();

  if (["male", "m", "м", "муж", "мужской"].includes(normalized)) {
    return "male";
  }
  if (["female", "f", "ж", "жен", "женский"].includes(normalized)) {
    return "female";
  }

  return normalized;
};

const formatDateForDisplay = (value) => {
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
