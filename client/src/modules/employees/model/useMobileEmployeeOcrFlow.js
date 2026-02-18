import { useCallback, useState } from "react";
import ocrService from "@/services/ocrService";

export const useMobileEmployeeOcrFlow = ({
  form,
  messageApi,
  citizenships,
  passportType,
  setPassportType,
  handleCitizenshipChange,
  formatKig,
  formatPatentNumber,
  ocrUtils,
}) => {
  const [mobileOcrState, setMobileOcrState] = useState({
    status: "idle",
    message: "",
    details: "",
    appliedFields: [],
  });

  const buildMobileOcrCandidates = useCallback(
    (ocrDocumentType, normalized = {}, rawJson = {}) => {
      const citizenshipId = ocrUtils.resolveCitizenshipIdByOcrCode(
        citizenships,
        normalized.citizenship || normalized.nationality,
      );

      const common = {
        lastName: ocrUtils.toDisplayName(normalized.lastName),
        firstName: ocrUtils.toDisplayName(normalized.firstName),
        middleName: ocrUtils.toDisplayName(normalized.middleName),
        birthDate: ocrUtils.formatDateForMobileForm(normalized.birthDate),
        gender: ocrUtils.mapOcrSexToFormGender(normalized.sex),
        citizenshipId,
      };

      if (ocrDocumentType === "passport_rf") {
        const { seriesDigits, numberDigits } =
          ocrUtils.resolvePassportNumberPartsFromOcr(normalized, rawJson);
        return {
          ...common,
          passportType: "russian",
          passportNumber: ocrUtils.formatPassportNumberForMobileForm({
            series: seriesDigits,
            number: numberDigits,
          }),
          passportDate: ocrUtils.formatDateForMobileForm(normalized.passportIssuedAt),
          passportIssuer: ocrUtils.normalizeString(normalized.passportIssuedBy) || null,
        };
      }

      if (ocrDocumentType === "foreign_passport") {
        return {
          ...common,
          passportType: "foreign",
          passportNumber: ocrUtils.normalizeString(normalized.passportNumber) || null,
          passportDate: ocrUtils.formatDateForMobileForm(normalized.passportIssuedAt),
          passportIssuer: ocrUtils.normalizeString(normalized.passportIssuedBy) || null,
          passportExpiryDate: ocrUtils.formatDateForMobileForm(
            normalized.passportExpiryDate,
          ),
        };
      }

      if (ocrDocumentType === "patent") {
        return {
          ...common,
          patentNumber: normalized.patentNumber
            ? formatPatentNumber(normalized.patentNumber)
            : null,
          patentIssueDate: ocrUtils.formatDateForMobileForm(
            normalized.patentIssueDate,
          ),
        };
      }

      if (ocrDocumentType === "kig") {
        return {
          ...common,
          kig: normalized.kigNumber ? formatKig(normalized.kigNumber) : null,
          kigEndDate: ocrUtils.formatDateForMobileForm(normalized.kigExpiryDate),
        };
      }

      if (ocrDocumentType === "visa") {
        return {
          ...common,
        };
      }

      return common;
    },
    [citizenships, formatKig, formatPatentNumber, ocrUtils],
  );

  const handleDocumentUploadComplete = useCallback(
    async ({ employeeId, documentType, source, uploadedFiles }) => {
      const isCaptureSource =
        source === "camera_capture" || source === "native_camera_capture";
      if (!isCaptureSource) {
        return;
      }

      const uploadedFileId = uploadedFiles?.[0]?.id;
      if (!uploadedFileId) {
        setMobileOcrState({
          status: "warning",
          message: "OCR не запущен",
          details: "После съемки не удалось получить fileId загруженного файла.",
          appliedFields: [],
        });
        return;
      }

      const currentPassportType = form.getFieldValue("passportType") || passportType;
      let ocrDocumentType = ocrUtils.getOcrSourceDocumentType({ documentType });

      if (ocrDocumentType === "passport_rf" && currentPassportType === "foreign") {
        ocrDocumentType = "foreign_passport";
      }

      if (!ocrDocumentType) {
        return;
      }

      const ocrDocLabel =
        ocrUtils.OCR_DOC_TYPE_LABELS[ocrDocumentType] || ocrDocumentType;
      setMobileOcrState({
        status: "running",
        message: `Идет OCR-распознавание (${ocrDocLabel})...`,
        details: "Ожидаем ответ сервиса OCR.",
        appliedFields: [],
      });

      try {
        const response = await ocrService.recognizeDocument({
          documentType: ocrDocumentType,
          fileId: uploadedFileId,
        });
        const provider = response?.data?.provider || null;
        const recognizedFileId = response?.data?.fileId || uploadedFileId;

        const normalized =
          response?.data?.normalized ||
          response?.normalized ||
          response?.data?.data?.normalized ||
          {};

        if (!normalized.citizenship && normalized.nationality) {
          normalized.citizenship = normalized.nationality;
        }

        const rawJson = ocrUtils.parseOcrRawJson(response);
        const candidates = buildMobileOcrCandidates(
          ocrDocumentType,
          normalized,
          rawJson,
        );
        const candidateEntries = Object.entries(candidates).filter(
          ([, value]) => !ocrUtils.isEmptyFormValue(value),
        );

        const confirmOcrFile = async () => {
          if (!employeeId || !recognizedFileId) {
            return;
          }
          try {
            await ocrService.confirmFileOcr({
              employeeId,
              fileId: recognizedFileId,
              provider,
              result: normalized,
            });
          } catch (confirmError) {
            console.warn("Mobile OCR confirm warning:", confirmError);
          }
        };

        if (candidateEntries.length === 0) {
          await confirmOcrFile();
          setMobileOcrState({
            status: "warning",
            message: "OCR не вернул данных для автозаполнения",
            details: "Проверьте качество снимка и попробуйте переснять документ.",
            appliedFields: [],
          });
          messageApi.warning("OCR: нет данных для автозаполнения");
          return;
        }

        const currentValues = form.getFieldsValue(
          candidateEntries.map(([fieldName]) => fieldName),
        );

        const valuesToApply = {};
        const skippedFields = [];

        candidateEntries.forEach(([fieldName, value]) => {
          if (ocrUtils.isEmptyFormValue(currentValues[fieldName])) {
            valuesToApply[fieldName] = value;
          } else {
            skippedFields.push(fieldName);
          }
        });

        if (Object.keys(valuesToApply).length === 0) {
          await confirmOcrFile();
          setMobileOcrState({
            status: "warning",
            message: "Поля уже заполнены",
            details:
              "OCR выполнен, но новые данные не применены, так как поля уже содержат значения.",
            appliedFields: [],
          });
          messageApi.info("OCR: поля уже заполнены, автозамена не выполнена");
          return;
        }

        form.setFieldsValue(valuesToApply);

        if (valuesToApply.citizenshipId) {
          handleCitizenshipChange(valuesToApply.citizenshipId);
        }
        if (valuesToApply.passportType) {
          setPassportType(valuesToApply.passportType);
        }

        await confirmOcrFile();

        const appliedFields = Object.keys(valuesToApply);
        const skippedText =
          skippedFields.length > 0
            ? `Пропущены заполненные поля: ${skippedFields.join(", ")}`
            : "Все найденные пустые поля заполнены.";

        setMobileOcrState({
          status: "success",
          message: `OCR завершен: заполнено полей — ${appliedFields.length}`,
          details: skippedText,
          appliedFields,
        });

        messageApi.success(`OCR: заполнено полей — ${appliedFields.length}`);
      } catch (error) {
        console.error("Mobile OCR error:", error);
        const errorMessage = error?.userMessage || "Не удалось выполнить OCR";
        setMobileOcrState({
          status: "error",
          message: "Ошибка OCR",
          details: errorMessage,
          appliedFields: [],
        });
        messageApi.error(errorMessage);
      }
    },
    [
      buildMobileOcrCandidates,
      form,
      handleCitizenshipChange,
      messageApi,
      ocrUtils,
      passportType,
      setPassportType,
    ],
  );

  return {
    mobileOcrState,
    handleDocumentUploadComplete,
  };
};
