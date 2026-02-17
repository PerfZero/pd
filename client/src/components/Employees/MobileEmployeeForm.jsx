import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Collapse,
  App,
  Popconfirm,
  Radio,
} from "antd";
import {
  SaveOutlined,
  CaretRightOutlined,
  FileOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useEmployeeForm } from "./useEmployeeForm";
import { employeeStatusService } from "../../services/employeeStatusService";
import { counterpartyService } from "../../services/counterpartyService";
import ocrService from "../../services/ocrService";
import { invalidateCache } from "../../utils/requestCache";
import {
  capitalizeFirstLetter,
  filterCyrillicOnly,
} from "../../utils/formatters";
import MaskedDateInput from "../../shared/ui/MaskedDateInput";
import { buildMobileDocumentSections } from "./MobileEmployeeDocumentSections";
import dayjs from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const DATE_FORMAT = "DD.MM.YYYY";

// Общие пропсы для отключения автозаполнения браузера
const noAutoFillProps = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-form-type": "other",
  "data-lpignore": "true",
  onFocus: (e) => {
    // Убираем readonly с небольшой задержкой
    if (e.target.hasAttribute("readonly")) {
      setTimeout(() => {
        e.target.removeAttribute("readonly");
      }, 120);
    }
  },
  readOnly: true, // Начинаем с readonly чтобы предотвратить автозаполнение
};

const createAntiAutofillIds = () => ({
  lastName: `employee_last_${Math.random().toString(36).slice(2, 9)}`,
  firstName: `employee_first_${Math.random().toString(36).slice(2, 9)}`,
  middleName: `employee_middle_${Math.random().toString(36).slice(2, 9)}`,
  phone: `employee_phone_${Math.random().toString(36).slice(2, 9)}`,
  registrationAddress: `employee_reg_addr_${Math.random().toString(36).slice(2, 9)}`,
});

// Маска для российского паспорта: форматирует ввод в 1234 №567890 (4 цифры, пробел, №, 6 цифр)
const formatRussianPassportNumber = (value) => {
  if (!value) return value;

  // Убираем все символы кроме цифр и №
  const cleaned = value.replace(/[^\d№]/g, "");

  // Убираем все символы №, чтобы потом добавить один
  const numbersOnly = cleaned.replace(/№/g, "");

  // Ограничиваем длину до 10 цифр (4 серия + 6 номер)
  const limited = numbersOnly.slice(0, 10);

  // Если введено меньше 4 символов, просто возвращаем
  if (limited.length <= 4) {
    return limited;
  }

  // Форматируем: XXXX №XXXXXX
  return `${limited.slice(0, 4)} №${limited.slice(4)}`;
};

const normalizeString = (value) => String(value || "").trim();

const isEmptyFormValue = (value) =>
  value === null || value === undefined || normalizeString(value) === "";

const toDisplayName = (value) => {
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

const mapOcrSexToFormGender = (ocrValue) => {
  const normalized = normalizeString(ocrValue).toUpperCase();
  if (normalized === "M") return "male";
  if (normalized === "F") return "female";
  return null;
};

const resolveCitizenshipIdByOcrCode = (citizenships = [], ocrValue = "") => {
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
  return null;
};

const parseOcrRawJson = (response = {}) => {
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

const resolvePassportNumberPartsFromOcr = (normalized = {}, rawJson = {}) => {
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

const formatDateForMobileForm = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const parsed = dayjs(normalized);
    return parsed.isValid() ? parsed.format(DATE_FORMAT) : null;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(normalized)) {
    return normalized;
  }

  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : null;
};

const formatPassportNumberForMobileForm = ({ series, number }) => {
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

const OCR_DOC_TYPE_LABELS = {
  passport_rf: "паспорт РФ",
  foreign_passport: "иностранный паспорт",
  patent: "патент",
  kig: "КИГ",
  visa: "виза",
};

/**
 * Мобильная форма сотрудника
 * Все поля в один столбец, блоки вместо вкладок
 */
const MobileEmployeeForm = ({ employee, onSuccess, onCancel, onCheckInn }) => {
  const { modal, message: messageApi } = App.useApp();
  const {
    form,
    loading,
    loadingReferences,
    citizenships,
    positions,
    requiresPatent,
    defaultCounterpartyId,
    user,
    handleCitizenshipChange,
    handleSave,
    handleSaveDraft,
    initializeEmployeeData,
    formatPhoneNumber,
    formatSnils,
    formatKig,
    formatInn,
    formatPatentNumber,
    formatBlankNumber,
    getFieldProps,
  } = useEmployeeForm(employee, true, onSuccess);
  const antiAutofillIds = useMemo(() => createAntiAutofillIds(), []);

  // Состояние для открытых панелей (по умолчанию все открыны)
  const [activeKeys, setActiveKeys] = useState([
    "personal",
    "documents",
    "patent",
    "statuses",
    "counterparty",
  ]);
  const [employeeIdOnLoad, setEmployeeIdOnLoad] = useState(null); // Отслеживаем id сотрудника при загрузке
  const [fireLoading, setFireLoading] = useState(false); // Состояние загрузки для увольнения
  const innCheckTimeoutRef = useRef(null); // Ref для хранения таймера проверки ИНН
  const [activateLoading, setActivateLoading] = useState(false); // Состояние загрузки для активации
  const [passportType, setPassportType] = useState(null); // Отслеживаем тип паспорта
  const [latinInputError, setLatinInputError] = useState(null); // Поле, где был введен латинский символ
  const latinErrorTimeoutRef = useRef(null); // Ref для таймера очистки ошибки
  const isFormResetRef = useRef(false); // 🎯 Флаг для предотвращения проверки ИНН при сбросе формы
  const autoSaveTimeoutRef = useRef(null); // Ref для debounce автосохранения
  const autoSavingRef = useRef(false); // Флаг выполнения автосохранения
  const lastAutoSavedHashRef = useRef(null); // Хеш последнего автосохранения
  const canSaveTimeoutRef = useRef(null); // Ref для debounce проверки валидности
  const [canSave, setCanSave] = useState(false); // Доступность кнопки "Сохранить"
  const lastSavedSnapshotRef = useRef(null); // Снимок формы после последнего сохранения
  const [availableCounterparties, setAvailableCounterparties] = useState([]); // Доступные контрагенты
  const [loadingCounterparties, setLoadingCounterparties] = useState(false); // Загрузка контрагентов
  const [mobileOcrState, setMobileOcrState] = useState({
    status: "idle",
    message: "",
    details: "",
    appliedFields: [],
  });

  // Инициализируем данные формы при изменении сотрудника или справочников
  useEffect(() => {
    if (citizenships.length && positions.length) {
      // Если это новый сотрудник (id изменился)
      if (employee?.id !== employeeIdOnLoad) {
        const formData = initializeEmployeeData(true);
        if (formData) {
          form.setFieldsValue(formData);
          lastSavedSnapshotRef.current = JSON.stringify(
            form.getFieldsValue(true),
          );

          // Устанавливаем тип паспорта в state
          if (formData.passportType) {
            setPassportType(formData.passportType);
          }

          // Проверяем гражданство
          if (employee?.citizenshipId) {
            handleCitizenshipChange(employee.citizenshipId);
          }
        } else {
          // Новый сотрудник - очищаем форму
          form.resetFields();
          setPassportType(null);
          lastSavedSnapshotRef.current = JSON.stringify(
            form.getFieldsValue(true),
          );
        }
        setEmployeeIdOnLoad(employee?.id);
      }
    }
  }, [
    employee?.id,
    employee?.citizenshipId,
    employeeIdOnLoad,
    citizenships.length,
    positions.length,
    form,
    handleCitizenshipChange,
    initializeEmployeeData,
  ]);

  // Загружаем доступные контрагенты
  useEffect(() => {
    const loadCounterparties = async () => {
      setLoadingCounterparties(true);
      try {
        const response = await counterpartyService.getAvailable();
        if (response.data.success) {
          setAvailableCounterparties(response.data.data);

          // Если это новый сотрудник и контрагент еще не задан, устанавливаем контрагент текущего пользователя
          if (
            !employee?.id &&
            user?.counterpartyId &&
            !form.getFieldValue("counterpartyId")
          ) {
            form.setFieldsValue({ counterpartyId: user.counterpartyId });
          }
        }
      } catch (error) {
        console.error("Error loading counterparties:", error);
      } finally {
        setLoadingCounterparties(false);
      }
    };

    if (user?.counterpartyId) {
      loadCounterparties();
    }
  }, [form, user?.counterpartyId, employee?.id]);

  // 🎯 Обертки для обработки сохранения с очисткой таймера ИНН
  const handleSaveWithReset = async () => {
    // Очищаем таймер проверки ИНН ДО сброса
    if (innCheckTimeoutRef.current) {
      clearTimeout(innCheckTimeoutRef.current);
    }
    isFormResetRef.current = true;
    await handleSave();
    lastSavedSnapshotRef.current = JSON.stringify(form.getFieldsValue(true));
  };

  const handleSaveDraftWithReset = async () => {
    // Очищаем таймер проверки ИНН ДО сброса
    if (innCheckTimeoutRef.current) {
      clearTimeout(innCheckTimeoutRef.current);
    }
    isFormResetRef.current = true;
    const saved = await handleSaveDraft();
    lastSavedSnapshotRef.current = JSON.stringify(form.getFieldsValue(true));
    return saved;
  };

  const ensureEmployeeId = async () => {
    if (employee?.id) {
      return employee.id;
    }
    try {
      const savedEmployee = await handleSaveDraftWithReset();
      return savedEmployee?.id || null;
    } catch (error) {
      return null;
    }
  };

  const buildMobileOcrCandidates = useCallback(
    (ocrDocumentType, normalized = {}, rawJson = {}) => {
      const citizenshipId = resolveCitizenshipIdByOcrCode(
        citizenships,
        normalized.citizenship || normalized.nationality,
      );

      const common = {
        lastName: toDisplayName(normalized.lastName),
        firstName: toDisplayName(normalized.firstName),
        middleName: toDisplayName(normalized.middleName),
        birthDate: formatDateForMobileForm(normalized.birthDate),
        gender: mapOcrSexToFormGender(normalized.sex),
        citizenshipId,
      };

      if (ocrDocumentType === "passport_rf") {
        const { seriesDigits, numberDigits } =
          resolvePassportNumberPartsFromOcr(normalized, rawJson);
        return {
          ...common,
          passportType: "russian",
          passportNumber: formatPassportNumberForMobileForm({
            series: seriesDigits,
            number: numberDigits,
          }),
          passportDate: formatDateForMobileForm(normalized.passportIssuedAt),
          passportIssuer: normalizeString(normalized.passportIssuedBy) || null,
        };
      }

      if (ocrDocumentType === "foreign_passport") {
        return {
          ...common,
          passportType: "foreign",
          passportNumber: normalizeString(normalized.passportNumber) || null,
          passportDate: formatDateForMobileForm(normalized.passportIssuedAt),
          passportIssuer: normalizeString(normalized.passportIssuedBy) || null,
          passportExpiryDate: formatDateForMobileForm(
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
          patentIssueDate: formatDateForMobileForm(normalized.patentIssueDate),
        };
      }

      if (ocrDocumentType === "kig") {
        return {
          ...common,
          kig: normalized.kigNumber ? formatKig(normalized.kigNumber) : null,
          kigEndDate: formatDateForMobileForm(normalized.kigExpiryDate),
        };
      }

      if (ocrDocumentType === "visa") {
        return {
          ...common,
        };
      }

      return common;
    },
    [citizenships, formatKig, formatPatentNumber],
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
          details:
            "После съемки не удалось получить fileId загруженного файла.",
          appliedFields: [],
        });
        return;
      }

      const currentPassportType =
        form.getFieldValue("passportType") || passportType;
      let ocrDocumentType = null;

      if (documentType === "passport") {
        ocrDocumentType =
          currentPassportType === "foreign"
            ? "foreign_passport"
            : "passport_rf";
      } else if (
        documentType === "patent_front" ||
        documentType === "patent_back"
      ) {
        ocrDocumentType = "patent";
      } else if (documentType === "kig") {
        ocrDocumentType = "kig";
      } else if (documentType === "visa") {
        ocrDocumentType = "visa";
      }

      if (!ocrDocumentType) {
        return;
      }

      const ocrDocLabel =
        OCR_DOC_TYPE_LABELS[ocrDocumentType] || ocrDocumentType;
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

        const rawJson = parseOcrRawJson(response);
        const candidates = buildMobileOcrCandidates(
          ocrDocumentType,
          normalized,
          rawJson,
        );
        const candidateEntries = Object.entries(candidates).filter(
          ([, value]) => !isEmptyFormValue(value),
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
            details:
              "Проверьте качество снимка и попробуйте переснять документ.",
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
          if (isEmptyFormValue(currentValues[fieldName])) {
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
      passportType,
    ],
  );

  const scheduleAutoSaveDraft = () => {
    if (employee?.id || isFormResetRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (autoSavingRef.current || employee?.id) {
        return;
      }

      const values = form.getFieldsValue(["inn", "firstName", "lastName"]);
      const rawInn = values?.inn ? values.inn.replace(/[^\d]/g, "") : "";
      const hasMinFields =
        rawInn &&
        (rawInn.length === 10 || rawInn.length === 12) &&
        values?.firstName &&
        values?.lastName;

      if (!hasMinFields) {
        return;
      }

      const hash = `${rawInn}|${values.firstName}|${values.lastName}`;
      if (lastAutoSavedHashRef.current === hash) {
        return;
      }

      autoSavingRef.current = true;
      try {
        const savedEmployee = await handleSaveDraftWithReset();
        if (savedEmployee?.id) {
          lastAutoSavedHashRef.current = hash;
        }
      } finally {
        autoSavingRef.current = false;
      }
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (canSaveTimeoutRef.current) {
        clearTimeout(canSaveTimeoutRef.current);
      }
    };
  }, []);

  // Функция для обработки отмены с подтверждением
  const handleCancelWithConfirm = () => {
    const currentSnapshot = JSON.stringify(form.getFieldsValue(true));
    const isDirty =
      form.isFieldsTouched(true) &&
      currentSnapshot !== lastSavedSnapshotRef.current;

    if (!isDirty) {
      onCancel();
      return;
    }

    modal.confirm({
      title: "Вы уверены?",
      icon: <ExclamationCircleOutlined />,
      content: "Все несохраненные данные будут потеряны. Вы хотите выйти?",
      okText: "Да, выйти",
      okType: "danger",
      cancelText: "Остаться",
      onOk() {
        onCancel();
      },
    });
  };

  // Обработчик потери фокуса на поле ИНН
  const handleInnBlur = async () => {
    // Не проверяем ИНН при редактировании сотрудника или при сбросе формы
    if (employee || !onCheckInn || isFormResetRef.current) {
      return;
    }

    const innValue = form.getFieldValue("inn");
    const normalized = innValue ? innValue.replace(/[^\d]/g, "") : "";

    // Проверяем только если ИНН полностью заполнен (10 или 12 цифр)
    if ((normalized.length === 10 || normalized.length === 12) && innValue) {
      scheduleAutoSaveDraft();
      try {
        await onCheckInn(innValue);
      } catch (error) {
        // 🎯 Обработка ошибок проверки ИНН (409, 404 и т.д.)
        if (error.response?.status === 409) {
          // Сотрудник найден в другом контрагенте
          messageApi.error(
            error.response?.data?.message ||
              "Сотрудник с таким ИНН уже существует. Обратитесь к администратору.",
          );
        } else if (error.response?.status !== 404) {
          // 404 это нормально (сотрудник не найден)
          console.error("Ошибка при проверке ИНН:", error);
        }
      }
    }
  };

  // Обработчик onChange для капитализации ФИО
  const handleFullNameChange = (fieldName, value) => {
    // Проверяем, был ли введен латинский символ
    const hasLatin = /[a-zA-Z]/.test(value);

    if (hasLatin) {
      // Показываем ошибку для текущего поля
      setLatinInputError(fieldName);

      // Очищаем предыдущий таймер если есть
      if (latinErrorTimeoutRef.current) {
        clearTimeout(latinErrorTimeoutRef.current);
      }

      // Очищаем ошибку через 3 секунды
      latinErrorTimeoutRef.current = setTimeout(() => {
        setLatinInputError(null);
      }, 3000);
    }

    // Фильтруем латиницу - оставляем только кириллицу
    const filtered = filterCyrillicOnly(value);
    // Капитализируем первую букву и обновляем значение в форме
    const capitalizedValue = capitalizeFirstLetter(filtered);
    form.setFieldValue(fieldName, capitalizedValue);
    scheduleAutoSaveDraft();
  };

  // Формируем items для Collapse
  const collapseItems = [];

  // Блок 0: Статусы (если редактирование) - ДО Личной информации
  if (employee?.id) {
    const isFired =
      employee.statusMappings?.find((m) => m.statusGroup === "status_active")
        ?.status?.name === "status_active_fired";
    const isInactive =
      employee.statusMappings?.find((m) => m.statusGroup === "status_active")
        ?.status?.name === "status_active_inactive";

    const handleFire = async () => {
      try {
        setFireLoading(true);
        await employeeStatusService.fireEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(
          `Сотрудник ${employee.lastName} ${employee.firstName} уволен`,
        );
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error("Error firing employee:", error);
        messageApi.error("Ошибка при увольнении сотрудника");
      } finally {
        setFireLoading(false);
      }
    };

    const handleReinstate = async () => {
      try {
        setActivateLoading(true);
        await employeeStatusService.reinstateEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(
          `Сотрудник ${employee.lastName} ${employee.firstName} восстановлен`,
        );
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error("Error reinstating employee:", error);
        messageApi.error("Ошибка при восстановлении сотрудника");
      } finally {
        setActivateLoading(false);
      }
    };

    const handleDeactivate = async () => {
      try {
        setFireLoading(true);
        await employeeStatusService.deactivateEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(
          `Сотрудник ${employee.lastName} ${employee.firstName} деактивирован`,
        );
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error("Error deactivating employee:", error);
        messageApi.error("Ошибка при деактивации сотрудника");
      } finally {
        setFireLoading(false);
      }
    };

    const handleActivate = async () => {
      try {
        setActivateLoading(true);
        await employeeStatusService.activateEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(
          `Сотрудник ${employee.lastName} ${employee.firstName} активирован`,
        );
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error("Error activating employee:", error);
        messageApi.error("Ошибка при активации сотрудника");
      } finally {
        setActivateLoading(false);
      }
    };

    collapseItems.push({
      key: "statuses",
      label: (
        <Title level={5} style={{ margin: 0 }}>
          ⚙️ Статусы
        </Title>
      ),
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          {isFired ? (
            <Popconfirm
              title="Восстановить сотрудника?"
              description={`Вы уверены, что ${employee.lastName} ${employee.firstName} восстанавливается?`}
              onConfirm={handleReinstate}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="primary" danger block loading={activateLoading}>
                Принять уволенного
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Уволить сотрудника?"
              description={`Вы уверены, что ${employee.lastName} ${employee.firstName} увольняется?`}
              onConfirm={handleFire}
              okText="Да"
              cancelText="Нет"
            >
              <Button danger block loading={fireLoading}>
                Уволить
              </Button>
            </Popconfirm>
          )}

          {isInactive ? (
            <Popconfirm
              title="Активировать сотрудника?"
              description={`Вы уверены, что ${employee.lastName} ${employee.firstName} активируется?`}
              onConfirm={handleActivate}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="primary" block loading={activateLoading}>
                Активировать
              </Button>
            </Popconfirm>
          ) : (
            // Скрываем кнопку для пользователей контрагента default
            user?.counterpartyId !== defaultCounterpartyId && (
              <Popconfirm
                title="Сотрудник не работает на объектах СУ-10?"
                description={`Вы уверены, что ${employee.lastName} ${employee.firstName} не работает на объектах СУ-10?`}
                onConfirm={handleDeactivate}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="default" block loading={fireLoading}>
                  Не работает на объектах СУ-10
                </Button>
              </Popconfirm>
            )
          )}
        </Space>
      ),
    });
  }

  // Блок 1: Личная информация
  collapseItems.push({
    key: "personal",
    label: (
      <Title level={5} style={{ margin: 0 }}>
        📋 Личная информация
      </Title>
    ),
    children: (
      <>
        {!getFieldProps("inn").hidden && (
          <Form.Item
            label="ИНН"
            name="inn"
            required={getFieldProps("inn").required}
            rules={[
              ...getFieldProps("inn").rules,
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const digits = value.replace(/[^\d]/g, "");
                  if (digits.length === 10 || digits.length === 12)
                    return Promise.resolve();
                  return Promise.reject(
                    new Error("ИНН должен содержать 10 или 12 цифр"),
                  );
                },
              },
            ]}
            getValueFromEvent={(e) => formatInn(e.target.value)}
          >
            <Input
              placeholder="1234-567890-12"
              size="large"
              onBlur={handleInnBlur}
              {...noAutoFillProps}
            />
          </Form.Item>
        )}

        {!getFieldProps("gender").hidden && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
              gap: "12px",
            }}
          >
            <label
              style={{ marginBottom: 0, minWidth: "70px", fontWeight: 500 }}
            >
              Пол{" "}
              {getFieldProps("gender").required && (
                <span style={{ color: "#ff4d4f" }}>*</span>
              )}
            </label>
            <Form.Item
              name="gender"
              rules={getFieldProps("gender").rules}
              style={{ marginBottom: 0 }}
            >
              <Radio.Group style={{ display: "flex", gap: "16px" }}>
                <Radio value="male">Муж</Radio>
                <Radio value="female">Жен</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
        )}

        {!getFieldProps("lastName").hidden && (
          <Form.Item
            label="Фамилия"
            name="lastName"
            required={getFieldProps("lastName").required}
            rules={getFieldProps("lastName").rules}
            validateStatus={latinInputError === "lastName" ? "error" : ""}
            help={
              latinInputError === "lastName" ? "Ввод только на кириллице" : ""
            }
          >
            <Input
              id={antiAutofillIds.lastName}
              name={antiAutofillIds.lastName}
              placeholder="Иванов"
              size="large"
              {...noAutoFillProps}
              onChange={(e) => handleFullNameChange("lastName", e.target.value)}
            />
          </Form.Item>
        )}

        {!getFieldProps("firstName").hidden && (
          <Form.Item
            label="Имя"
            name="firstName"
            required={getFieldProps("firstName").required}
            rules={getFieldProps("firstName").rules}
            validateStatus={latinInputError === "firstName" ? "error" : ""}
            help={
              latinInputError === "firstName" ? "Ввод только на кириллице" : ""
            }
          >
            <Input
              id={antiAutofillIds.firstName}
              name={antiAutofillIds.firstName}
              placeholder="Иван"
              size="large"
              {...noAutoFillProps}
              onChange={(e) =>
                handleFullNameChange("firstName", e.target.value)
              }
            />
          </Form.Item>
        )}

        {!getFieldProps("middleName").hidden && (
          <Form.Item
            label="Отчество"
            name="middleName"
            required={getFieldProps("middleName").required}
            rules={getFieldProps("middleName").rules}
            validateStatus={latinInputError === "middleName" ? "error" : ""}
            help={
              latinInputError === "middleName" ? "Ввод только на кириллице" : ""
            }
          >
            <Input
              id={antiAutofillIds.middleName}
              name={antiAutofillIds.middleName}
              placeholder="Иванович"
              size="large"
              {...noAutoFillProps}
              onChange={(e) =>
                handleFullNameChange("middleName", e.target.value)
              }
            />
          </Form.Item>
        )}

        {!getFieldProps("positionId").hidden && (
          <Form.Item
            label="Должность"
            name="positionId"
            required={getFieldProps("positionId").required}
            rules={getFieldProps("positionId").rules}
          >
            <Select
              placeholder="Выберите должность"
              size="large"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              virtual={false}
              listHeight={400}
              loading={loadingReferences}
              disabled={loadingReferences || positions.length === 0}
              autoComplete="off"
            >
              {positions.map((pos) => (
                <Option key={pos.id} value={pos.id}>
                  {pos.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {!getFieldProps("citizenshipId").hidden && (
          <Form.Item
            label="Гражданство"
            name="citizenshipId"
            required={getFieldProps("citizenshipId").required}
            rules={getFieldProps("citizenshipId").rules}
          >
            <Select
              placeholder="Выберите гражданство"
              size="large"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              virtual={false}
              onChange={handleCitizenshipChange}
              loading={loadingReferences}
              disabled={loadingReferences || citizenships.length === 0}
              autoComplete="off"
            >
              {citizenships.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {!getFieldProps("birthDate").hidden && (
          <Form.Item
            label="Дата рождения"
            name="birthDate"
            required={getFieldProps("birthDate").required}
            rules={[
              ...getFieldProps("birthDate").rules,
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
                    const age = dayjs().diff(dateObj, "year");
                    if (age < 18) {
                      return Promise.reject(
                        new Error(
                          "Возраст сотрудника должен быть не менее 18 лет",
                        ),
                      );
                    }
                    if (age > 80) {
                      return Promise.reject(
                        new Error(
                          "Возраст сотрудника должен быть не более 80 лет",
                        ),
                      );
                    }
                  } catch (e) {
                    return Promise.reject(new Error("Некорректная дата"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            normalize={(value) => {
              if (!value) return value;
              // Если это строка, возвращаем как есть
              if (typeof value === "string") return value;
              // Если это dayjs объект, форматируем в строку
              if (value && value.format) return value.format(DATE_FORMAT);
              return value;
            }}
          >
            <MaskedDateInput format={DATE_FORMAT} size="large" />
          </Form.Item>
        )}

        {!getFieldProps("birthCountryId").hidden && (
          <Form.Item
            label="Страна рождения"
            name="birthCountryId"
            required={getFieldProps("birthCountryId").required}
            rules={getFieldProps("birthCountryId").rules}
          >
            <Select
              popupMatchSelectWidth
              placeholder="Выберите страну рождения"
              size="large"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              virtual={false}
              loading={loadingReferences}
              disabled={loadingReferences || citizenships.length === 0}
              autoComplete="off"
            >
              {citizenships.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {!getFieldProps("registrationAddress").hidden && (
          <Form.Item
            label="Адрес регистрации"
            name="registrationAddress"
            required={getFieldProps("registrationAddress").required}
            rules={getFieldProps("registrationAddress").rules}
          >
            <TextArea
              id={antiAutofillIds.registrationAddress}
              name={antiAutofillIds.registrationAddress}
              placeholder="г. Москва, ул. Ленина, д. 1"
              rows={3}
              size="large"
              {...noAutoFillProps}
            />
          </Form.Item>
        )}

        {!getFieldProps("phone").hidden && (
          <Form.Item
            label="Телефон"
            name="phone"
            required={getFieldProps("phone").required}
            rules={[
              ...getFieldProps("phone").rules,
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const digits = value.replace(/[^\d]/g, "");
                  if (digits.length === 11) return Promise.resolve();
                  return Promise.reject(
                    new Error("Телефон должен содержать 11 цифр"),
                  );
                },
              },
            ]}
            getValueFromEvent={(e) => formatPhoneNumber(e.target.value)}
          >
            <Input
              id={antiAutofillIds.phone}
              name={antiAutofillIds.phone}
              placeholder="+7 (___) ___-__-__"
              size="large"
              {...noAutoFillProps}
            />
          </Form.Item>
        )}

        {!getFieldProps("notes").hidden && (
          <Form.Item
            label="Примечание"
            name="notes"
            required={getFieldProps("notes").required}
            rules={getFieldProps("notes").rules}
          >
            <TextArea
              rows={2}
              placeholder="Дополнительная информация"
              size="large"
              {...noAutoFillProps}
            />
          </Form.Item>
        )}
      </>
    ),
  });

  collapseItems.push(
    ...buildMobileDocumentSections({
      getFieldProps,
      requiresPatent,
      formatSnils,
      formatKig,
      passportType,
      setPassportType,
      formatRussianPassportNumber,
      noAutoFillProps,
      mobileOcrState,
      employee,
      ensureEmployeeId,
      handleDocumentUploadComplete,
      formatPatentNumber,
      formatBlankNumber,
      loadingCounterparties,
      availableCounterparties,
    }),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Скролируемая область с формой */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          paddingBottom: 80,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 16,
        }}
      >
        {/* Скрытые поля-ловушки для автозаполнения браузера */}
        <div style={{ display: "none" }} aria-hidden="true">
          <input
            type="text"
            name="fakeusernameremember"
            autoComplete="username"
          />
          <input type="text" name="fakefirstname" autoComplete="given-name" />
          <input type="text" name="fakelastname" autoComplete="family-name" />
          <input type="text" name="fakeaddress" autoComplete="street-address" />
          <input type="text" name="fakecountry" autoComplete="country-name" />
          <input type="tel" name="fakephone" autoComplete="tel" />
          <input type="email" name="fakeemail" autoComplete="email" />
          <input
            type="password"
            name="fakepasswordremember"
            autoComplete="current-password"
          />
        </div>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ gender: "male" }}
          autoComplete="off"
          onFieldsChange={(_changedFields) => {
            // Сбрасываем флаг после обработки
            isFormResetRef.current = false;
            if (canSaveTimeoutRef.current) {
              clearTimeout(canSaveTimeoutRef.current);
            }
            canSaveTimeoutRef.current = setTimeout(async () => {
              try {
                await form.validateFields({ validateOnly: true });
                setCanSave(true);
              } catch (error) {
                setCanSave(false);
              }
            }, 200);
          }}
          requiredMark={(label, { required }) => (
            <>
              {label}
              {required && (
                <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>
              )}
            </>
          )}
        >
          <Collapse
            activeKey={activeKeys}
            onChange={setActiveKeys}
            expandIcon={({ isActive }) => (
              <CaretRightOutlined rotate={isActive ? 90 : 0} />
            )}
            expandIconPosition="start"
            ghost
            items={collapseItems}
          />
        </Form>
      </div>

      {/* Нижняя панель с кнопками (фиксированная) */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "8px 12px",
          background: "#fff",
          borderTop: "1px solid #f0f0f0",
          zIndex: 1000,
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Кнопка "Сохранить черновик" */}
        <Button
          size="small"
          block
          icon={<FileOutlined />}
          onClick={handleSaveDraftWithReset}
          loading={loading}
        >
          Черновик
        </Button>

        {/* Кнопки "Сохранить" и "Отмена" в одном ряду */}
        <div style={{ display: "flex", gap: 6 }}>
          <Button
            type="primary"
            size="small"
            style={{ flex: 1 }}
            icon={<SaveOutlined />}
            onClick={handleSaveWithReset}
            loading={loading}
            disabled={!canSave}
          >
            Сохранить
          </Button>
          <Button
            size="small"
            style={{
              flex: 1,
              borderColor: "#ff4d4f",
              color: "#ff4d4f",
            }}
            onClick={handleCancelWithConfirm}
            disabled={loading}
          >
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileEmployeeForm;
