import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  formatKig,
  formatPatentNumber,
} from "@/modules/employees/lib/employeeFormFormatters";
import {
  OCR_CONFLICT_HELP,
  OCR_DOC_TYPE_LABELS,
  OCR_SUPPORTED_FILE_TYPES,
  normalizeString,
  isEmptyValue,
  normalizeDateForCompare,
  normalizeGenderForCompare,
  normalizePassportNumberForCompare,
  formatPassportNumberForForm,
  mapOcrSexToFormGender,
  resolveCitizenshipIdByOcrCode,
  parseOcrRawJson,
  resolvePassportNumberPartsFromOcr,
  resolveOcrDocumentTypeByFile,
} from "@/modules/employees/lib/employeeOcrMvdUtils";
import ocrService from "@/services/ocrService";
import { employeeService } from "@/services/employeeService";

const getFieldLabel = (fieldName) => {
  const labels = {
    lastName: "Фамилия",
    firstName: "Имя",
    middleName: "Отчество",
    birthDate: "Дата рождения",
    gender: "Пол",
    citizenshipId: "Гражданство",
    passportNumber: "№ паспорта",
    passportDate: "Дата выдачи паспорта",
    passportExpiryDate: "Дата окончания паспорта",
    passportIssuer: "Кем выдан паспорт",
    kig: "КИГ",
    kigEndDate: "Дата окончания КИГ",
    patentNumber: "Номер патента",
    patentIssueDate: "Дата выдачи патента",
  };

  return labels[fieldName] || fieldName;
};

const areValuesDifferent = (fieldName, currentValue, ocrValue) => {
  if (
    fieldName === "birthDate" ||
    fieldName === "passportDate" ||
    fieldName === "passportExpiryDate" ||
    fieldName === "patentIssueDate" ||
    fieldName === "kigEndDate"
  ) {
    return (
      normalizeDateForCompare(currentValue) !==
      normalizeDateForCompare(ocrValue)
    );
  }

  if (fieldName === "gender") {
    return (
      normalizeGenderForCompare(currentValue) !==
      normalizeGenderForCompare(ocrValue)
    );
  }

  if (fieldName === "passportNumber") {
    return (
      normalizePassportNumberForCompare(currentValue) !==
      normalizePassportNumberForCompare(ocrValue)
    );
  }

  if (fieldName === "citizenshipId") {
    return normalizeString(currentValue) !== normalizeString(ocrValue);
  }

  return (
    normalizeString(currentValue).toLowerCase() !==
    normalizeString(ocrValue).toLowerCase()
  );
};

const buildOcrCandidates = (
  ocrDocumentType,
  normalized,
  rawJson,
  citizenships,
) => {
  const citizenshipId = resolveCitizenshipIdByOcrCode(
    citizenships,
    normalized.citizenship || normalized.nationality,
  );

  const common = {
    lastName: normalizeString(normalized.lastName) || null,
    firstName: normalizeString(normalized.firstName) || null,
    middleName: normalizeString(normalized.middleName) || null,
    birthDate: normalized.birthDate ? dayjs(normalized.birthDate) : null,
    gender: mapOcrSexToFormGender(normalized.sex),
    citizenshipId,
  };

  if (ocrDocumentType === "passport_rf") {
    const { seriesDigits, numberDigits } = resolvePassportNumberPartsFromOcr(
      normalized,
      rawJson,
    );

    return {
      ...common,
      passportType: "russian",
      passportNumber: formatPassportNumberForForm({
        series: seriesDigits,
        number: numberDigits,
      }),
      passportDate: normalized.passportIssuedAt
        ? dayjs(normalized.passportIssuedAt)
        : null,
      passportIssuer: normalizeString(normalized.passportIssuedBy) || null,
    };
  }

  if (ocrDocumentType === "foreign_passport") {
    return {
      ...common,
      passportType: "foreign",
      passportNumber: normalizeString(normalized.passportNumber) || null,
      passportDate: normalized.passportIssuedAt
        ? dayjs(normalized.passportIssuedAt)
        : null,
      passportIssuer: normalizeString(normalized.passportIssuedBy) || null,
      passportExpiryDate: normalized.passportExpiryDate
        ? dayjs(normalized.passportExpiryDate)
        : null,
    };
  }

  if (ocrDocumentType === "patent") {
    return {
      ...common,
      patentNumber: normalized.patentNumber
        ? formatPatentNumber(normalized.patentNumber)
        : null,
      patentIssueDate: normalized.patentIssueDate
        ? dayjs(normalized.patentIssueDate)
        : null,
    };
  }

  if (ocrDocumentType === "kig") {
    return {
      ...common,
      kig: normalized.kigNumber ? formatKig(normalized.kigNumber) : null,
      kigEndDate: normalized.kigExpiryDate
        ? dayjs(normalized.kigExpiryDate)
        : null,
    };
  }

  return common;
};

export const useEmployeeOcrFlow = ({
  visible,
  employeeId,
  form,
  message,
  passportType,
  setPassportType,
  citizenships,
  updateSelectedCitizenship,
}) => {
  const [ocrFiles, setOcrFiles] = useState([]);
  const [loadingOcrFiles, setLoadingOcrFiles] = useState(false);
  const [selectedOcrFileId, setSelectedOcrFileId] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrConflicts, setOcrConflicts] = useState([]);
  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [ocrConflictByField, setOcrConflictByField] = useState({});
  const [ocrPendingConfirmation, setOcrPendingConfirmation] = useState(null);

  const fetchOcrFiles = useCallback(async () => {
    if (!employeeId) {
      setOcrFiles([]);
      setSelectedOcrFileId(null);
      return;
    }

    setLoadingOcrFiles(true);
    try {
      const response = await employeeService.getFiles(employeeId);
      const files = response?.data || [];
      const filtered = files.filter((file) => {
        const documentType = file.documentType || file.document_type;
        if (!OCR_SUPPORTED_FILE_TYPES.includes(documentType)) {
          return false;
        }

        return String(file.mimeType || file.mime_type || "")
          .toLowerCase()
          .startsWith("image/");
      });

      setOcrFiles(filtered);
      setSelectedOcrFileId((prev) => {
        if (prev && filtered.some((item) => item.id === prev)) {
          return prev;
        }
        return filtered[0]?.id || null;
      });
    } catch (error) {
      console.error("Error loading OCR files:", error);
      message.error("Не удалось загрузить файлы для OCR");
      setOcrFiles([]);
      setSelectedOcrFileId(null);
    } finally {
      setLoadingOcrFiles(false);
    }
  }, [employeeId, message]);

  useEffect(() => {
    if (!visible) {
      setOcrFiles([]);
      setSelectedOcrFileId(null);
      setOcrRunning(false);
      setOcrConflicts([]);
      setOcrModalVisible(false);
      setOcrConflictByField({});
      setOcrPendingConfirmation(null);
      return;
    }

    if (!employeeId) {
      setOcrFiles([]);
      setSelectedOcrFileId(null);
      return;
    }

    fetchOcrFiles();
  }, [visible, employeeId, fetchOcrFiles]);

  const selectedOcrFile = useMemo(
    () => ocrFiles.find((file) => file.id === selectedOcrFileId),
    [ocrFiles, selectedOcrFileId],
  );

  const selectedFileDocumentType =
    selectedOcrFile?.documentType || selectedOcrFile?.document_type || null;

  const selectedOcrDocumentType = useMemo(
    () =>
      resolveOcrDocumentTypeByFile(
        selectedFileDocumentType,
        form.getFieldValue("passportType") || passportType,
      ),
    [form, passportType, selectedFileDocumentType],
  );

  const selectedOcrDocumentLabel = selectedOcrDocumentType
    ? OCR_DOC_TYPE_LABELS[selectedOcrDocumentType] || selectedOcrDocumentType
    : null;

  const applyOcrFieldWarnings = useCallback((conflicts = []) => {
    const nextWarnings = {};
    conflicts.forEach((item) => {
      nextWarnings[item.fieldName] = OCR_CONFLICT_HELP;
    });
    setOcrConflictByField(nextWarnings);
  }, []);

  const confirmOcrForFile = useCallback(
    async ({ fileId, provider, normalizedResult }) => {
      if (!employeeId || !fileId) {
        return;
      }

      await ocrService.confirmFileOcr({
        employeeId,
        fileId,
        provider,
        result: normalizedResult,
      });
      fetchOcrFiles();
    },
    [employeeId, fetchOcrFiles],
  );

  const handleStartDocumentOcr = useCallback(async () => {
    if (!employeeId) {
      message.warning("Сначала сохраните сотрудника");
      return;
    }

    if (!selectedOcrFileId) {
      message.warning("Выберите файл документа для OCR");
      return;
    }

    const file = ocrFiles.find((item) => item.id === selectedOcrFileId);
    if (!file) {
      message.warning("Выбранный файл не найден. Обновите список файлов.");
      return;
    }

    const fileDocumentType = file.documentType || file.document_type;
    const ocrDocumentType = resolveOcrDocumentTypeByFile(
      fileDocumentType,
      form.getFieldValue("passportType") || passportType,
    );

    if (!ocrDocumentType) {
      message.warning("Для выбранного файла OCR не поддерживается");
      return;
    }

    try {
      setOcrRunning(true);

      const response = await ocrService.recognizeDocument({
        documentType: ocrDocumentType,
        fileId: selectedOcrFileId,
      });

      const normalized =
        response?.data?.normalized ||
        response?.normalized ||
        response?.data?.data?.normalized ||
        {};

      if (!normalized.citizenship && normalized.nationality) {
        normalized.citizenship = normalized.nationality;
      }

      const provider = response?.data?.provider || null;
      const fileId = response?.data?.fileId || selectedOcrFileId;
      const rawJson = parseOcrRawJson(response);
      const candidates = buildOcrCandidates(
        ocrDocumentType,
        normalized,
        rawJson,
        citizenships,
      );
      const candidateEntries = Object.entries(candidates).filter(
        ([, value]) => !isEmptyValue(value),
      );

      if (candidateEntries.length === 0) {
        message.warning("OCR не вернул значения для автозаполнения");
        return;
      }

      const currentValues = form.getFieldsValue(
        candidateEntries.map(([fieldName]) => fieldName),
      );
      const autoFill = {};
      const conflicts = [];

      candidateEntries.forEach(([fieldName, ocrValue]) => {
        const currentValue = currentValues[fieldName];

        if (fieldName === "passportType") {
          if (isEmptyValue(currentValue)) {
            autoFill[fieldName] = ocrValue;
          }
          return;
        }

        if (isEmptyValue(currentValue)) {
          autoFill[fieldName] = ocrValue;
          return;
        }

        if (areValuesDifferent(fieldName, currentValue, ocrValue)) {
          conflicts.push({
            fieldName,
            label: getFieldLabel(fieldName),
            currentValue,
            ocrValue,
            decision: "keep",
          });
        }
      });

      if (Object.keys(autoFill).length === 0 && candidateEntries.length > 0) {
        candidateEntries.forEach(([fieldName, ocrValue]) => {
          autoFill[fieldName] = ocrValue;
        });
      }

      if (Object.keys(autoFill).length > 0) {
        form.setFieldsValue(autoFill);
        form.setFields(
          Object.entries(autoFill).map(([name, value]) => ({
            name,
            value,
          })),
        );
        setTimeout(() => {
          form.setFieldsValue(autoFill);
        }, 0);

        const appliedValues = form.getFieldsValue(Object.keys(autoFill));
        const missingKeys = Object.keys(autoFill).filter((key) =>
          isEmptyValue(appliedValues[key]),
        );

        if (missingKeys.length > 0) {
          missingKeys.forEach((key) => {
            if (typeof form.setFieldValue === "function") {
              form.setFieldValue(key, autoFill[key]);
            }
          });
          form.setFieldsValue(
            missingKeys.reduce((accumulator, key) => {
              accumulator[key] = autoFill[key];
              return accumulator;
            }, {}),
          );
        }

        if (autoFill.passportType) {
          setPassportType(autoFill.passportType);
        }
        if (autoFill.citizenshipId) {
          updateSelectedCitizenship(autoFill.citizenshipId);
        }

        message.success(`OCR: заполнено полей — ${Object.keys(autoFill).length}`);
        if (missingKeys.length > 0) {
          message.warning(`OCR: не применилось — ${missingKeys.join(", ")}`);
        }
      }

      if (conflicts.length > 0) {
        setOcrPendingConfirmation({
          fileId,
          provider,
          normalizedResult: normalized,
        });
        setOcrConflicts(conflicts);
        applyOcrFieldWarnings(conflicts);
        setOcrModalVisible(true);
        message.warning(
          `Найдено расхождений: ${conflicts.length}. Выберите Оставить/Заменить.`,
        );
        return;
      }

      await confirmOcrForFile({
        fileId,
        provider,
        normalizedResult: normalized,
      });
      setOcrConflictByField({});
      setOcrConflicts([]);
      setOcrPendingConfirmation(null);
      message.success("OCR применен. Файл отмечен как проверенный.");
    } catch (error) {
      console.error("OCR run error:", error);
      message.error(error?.userMessage || "Не удалось выполнить OCR");
    } finally {
      setOcrRunning(false);
    }
  }, [
    applyOcrFieldWarnings,
    citizenships,
    confirmOcrForFile,
    employeeId,
    form,
    message,
    ocrFiles,
    passportType,
    selectedOcrFileId,
    setPassportType,
    updateSelectedCitizenship,
  ]);

  const handleResolveConflictDecision = useCallback((fieldName, decision) => {
    setOcrConflicts((prev) =>
      prev.map((item) =>
        item.fieldName === fieldName ? { ...item, decision } : item,
      ),
    );
  }, []);

  const handleApplyOcrConflicts = useCallback(async () => {
    if (!ocrPendingConfirmation?.fileId) {
      setOcrModalVisible(false);
      return;
    }

    const replacementValues = {};
    ocrConflicts.forEach((item) => {
      if (item.decision === "replace") {
        replacementValues[item.fieldName] = item.ocrValue;
      }
    });

    if (Object.keys(replacementValues).length > 0) {
      form.setFieldsValue(replacementValues);
      if (replacementValues.passportType) {
        setPassportType(replacementValues.passportType);
      }
      if (replacementValues.citizenshipId) {
        updateSelectedCitizenship(replacementValues.citizenshipId);
      }
    }

    try {
      await confirmOcrForFile(ocrPendingConfirmation);
      message.success("Решения применены. Файл отмечен как проверенный.");
      setOcrModalVisible(false);
      setOcrConflicts([]);
      setOcrPendingConfirmation(null);
      setOcrConflictByField({});
    } catch (error) {
      console.error("Error confirming OCR:", error);
      message.error(error?.userMessage || "Не удалось подтвердить OCR");
    }
  }, [
    confirmOcrForFile,
    form,
    message,
    ocrConflicts,
    ocrPendingConfirmation,
    setPassportType,
    updateSelectedCitizenship,
  ]);

  const handleCancelOcrConflictModal = useCallback(() => {
    setOcrModalVisible(false);
    setOcrConflicts([]);
    setOcrPendingConfirmation(null);
    setOcrConflictByField({});
  }, []);

  return {
    ocrFiles,
    loadingOcrFiles,
    selectedOcrFileId,
    setSelectedOcrFileId,
    ocrRunning,
    ocrConflicts,
    ocrModalVisible,
    ocrConflictByField,
    setOcrConflictByField,
    selectedOcrDocumentType,
    selectedOcrDocumentLabel,
    fetchOcrFiles,
    handleStartDocumentOcr,
    handleResolveConflictDecision,
    handleApplyOcrConflicts,
    handleCancelOcrConflictModal,
  };
};
