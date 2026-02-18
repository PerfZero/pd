import dayjs from "dayjs";
import EmployeeDocumentUpload from "@/components/Employees/EmployeeDocumentUpload";

const DATE_FORMAT = "DD.MM.YYYY";

export const formatDateInputValue = (value) => {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (value && value.format) return value.format(DATE_FORMAT);
  return value;
};

export const createDateInputRules = (rules = []) => [
  ...rules,
  {
    pattern: /^\d{2}\.\d{2}\.\d{4}$/,
    message: "Дата должна быть в формате ДД.ММ.ГГГГ",
  },
  {
    validator: (_, value) => {
      if (!value) {
        return Promise.resolve();
      }
      try {
        const dateObj = dayjs(value, DATE_FORMAT, true);
        if (!dateObj.isValid()) {
          return Promise.reject(new Error("Некорректная дата"));
        }
      } catch {
        return Promise.reject(new Error("Некорректная дата"));
      }
      return Promise.resolve();
    },
  },
];

export const COMMON_UPLOADS = [
  { documentType: "passport", label: "Паспорт", multiple: true, ocrRefresh: true },
  {
    documentType: "consent",
    label: "Согласие на обработку персональных данных",
    multiple: true,
  },
  {
    documentType: "biometric_consent",
    label: "Согласие на перс.дан. Генподряд",
    multiple: true,
  },
  {
    documentType: "biometric_consent_developer",
    label: "Согласие на перс.дан. Застройщ",
    multiple: true,
  },
  { documentType: "bank_details", label: "Реквизиты счета", multiple: true },
  {
    documentType: "diploma",
    label: "Диплом / Документ об образовании",
    multiple: true,
  },
  { documentType: "med_book", label: "Мед.книжка", multiple: true },
  {
    documentType: "migration_card",
    label: "Миграционная карта",
    multiple: true,
  },
  {
    documentType: "arrival_notice",
    label: "Уведомление о прибытии (регистрация)",
    multiple: true,
  },
  {
    documentType: "mvd_notification",
    label: "Уведомление МВД",
    multiple: true,
  },
];

export const PATENT_UPLOADS = [
  {
    documentType: "kig",
    label: "КИГ (Карта иностранного гражданина)",
    multiple: true,
    ocrRefresh: true,
  },
  { documentType: "visa", label: "Виза", multiple: true, ocrRefresh: true },
  {
    documentType: "patent_front",
    label: "Патент лицевая сторона (с фото)",
    multiple: false,
    ocrRefresh: true,
  },
  {
    documentType: "patent_back",
    label: "Патент задняя сторона",
    multiple: false,
    ocrRefresh: true,
  },
  {
    documentType: "patent_payment_receipt",
    label: "Чек об оплате патента",
    multiple: true,
  },
];

export const renderUploads = ({
  uploads,
  employee,
  ensureEmployeeId,
  handleDocumentUploadComplete,
}) =>
  uploads.map((upload) => (
    <EmployeeDocumentUpload
      key={upload.documentType}
      employeeId={employee?.id}
      ensureEmployeeId={ensureEmployeeId}
      documentType={upload.documentType}
      label={upload.label}
      readonly={false}
      multiple={upload.multiple}
      onUploadComplete={upload.ocrRefresh ? handleDocumentUploadComplete : undefined}
    />
  ));
