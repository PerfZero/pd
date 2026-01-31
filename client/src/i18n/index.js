import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "../locales/ru.json";
import uz from "../locales/uz.json";
import tj from "../locales/tj.json";
import kz from "../locales/kz.json";

export const SUPPORTED_LANGUAGES = ["ru", "uz", "tj", "kz"];

const normalizeLanguage = (lng) =>
  SUPPORTED_LANGUAGES.includes(lng) ? lng : "ru";

const storedLanguage =
  typeof window !== "undefined"
    ? window.localStorage.getItem("i18nextLng")
    : null;
const initialLanguage = normalizeLanguage(storedLanguage);

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    uz: { translation: uz },
    tj: { translation: tj },
    kz: { translation: kz },
  },
  lng: initialLanguage,
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
});

export const setLanguage = (lng) => {
  const next = normalizeLanguage(lng);
  i18n.changeLanguage(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("i18nextLng", next);
  }
};

export default i18n;
