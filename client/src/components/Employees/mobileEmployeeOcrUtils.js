import dayjs from "dayjs";

export const OCR_DOC_TYPE_LABELS = {
  passport_rf: "паспорт РФ",
  foreign_passport: "иностранный паспорт",
  patent: "патент",
  kig: "КИГ",
  visa: "виза",
};

export const formatRussianPassportNumber = (value) => {
  if (!value) return value;
  const cleaned = value.replace(/[^\d№]/g, "");
  const numbersOnly = cleaned.replace(/№/g, "");
  const limited = numbersOnly.slice(0, 10);

  if (limited.length <= 4) {
    return limited;
  }

  return `${limited.slice(0, 4)} №${limited.slice(4)}`;
};

export const normalizeString = (value) => String(value || "").trim();

export const isEmptyFormValue = (value) =>
  value === null || value === undefined || normalizeString(value) === "";

const capitalizeFirstLetter = (value = "") =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const toDisplayName = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return normalized
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      return capitalizeFirstLetter(part);
    })
    .join("");
};

export const mapOcrSexToFormGender = (ocrValue) => {
  const normalized = normalizeString(ocrValue).toUpperCase();
  if (normalized === "M") return "male";
  if (normalized === "F") return "female";
  return null;
};

export const resolveCitizenshipIdByOcrCode = (
  citizenships = [],
  ocrValue = "",
) => {
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

  return byCode ? byCode.id : null;
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
      valueFromAliases(rawJson, [
        "passportSeries",
        "passport_series",
        "series",
      ]),
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
    const seriesIndex = rawCombinedDigits.indexOf(seriesDigits);
    if (seriesIndex >= 0) {
      const afterSeries = rawCombinedDigits.slice(
        seriesIndex + seriesDigits.length,
      );
      if (afterSeries.length >= 6) {
        numberDigits = afterSeries.slice(0, 6);
      }
    }
  }

  if (numberDigits.length > 6) {
    numberDigits = numberDigits.slice(-6);
  }

  return { seriesDigits, numberDigits };
};

export const formatDateForMobileForm = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null;
  }
  if (normalized.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parsed = dayjs(normalized, "YYYY-MM-DD", true);
    return parsed.isValid() ? parsed : null;
  }
  if (normalized.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const parsed = dayjs(normalized, "DD.MM.YYYY", true);
    return parsed.isValid() ? parsed : null;
  }
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed : null;
};

export const formatPassportNumberForMobileForm = ({ series, number }) => {
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

export const getOcrSourceDocumentType = (file = {}) => {
  const fileDocumentType = String(file.documentType || "").toLowerCase();
  if (!fileDocumentType) return null;

  if (fileDocumentType === "passport") {
    return "passport_rf";
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
