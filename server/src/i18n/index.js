import i18next from "i18next";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadLocale = (lang) => {
  const localePath = path.join(__dirname, "..", "locales", `${lang}.json`);
  if (!fs.existsSync(localePath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(localePath, "utf8"));
};

const resources = {
  ru: { translation: loadLocale("ru") },
  uz: { translation: loadLocale("uz") },
  tj: { translation: loadLocale("tj") },
  kz: { translation: loadLocale("kz") },
};

i18next.init({
  resources,
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
});

export const getTranslator = (lng) => i18next.getFixedT(lng || "ru");

export default i18next;
