import { getTranslator } from "../i18n/index.js";

const SUPPORTED_LANGUAGES = new Set(["ru", "uz", "tj", "kz"]);

const normalizeLanguage = (lng) => {
  if (!lng) return "ru";
  const normalized = lng.toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : "ru";
};

export const attachTranslator = (req, _res, next) => {
  const userLanguage = req.user?.userLanguage;
  const headerLanguage = req.headers["accept-language"];
  const headerPrimary = headerLanguage ? headerLanguage.split(",")[0] : null;
  const language = normalizeLanguage(userLanguage || headerPrimary);

  req.language = language;
  req.t = getTranslator(language);
  next();
};
