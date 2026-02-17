import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Modal,
  Form,
  App,
  Tabs,
  Button,
  Space,
  Alert,
  Select,
  Input,
  List,
  Radio,
  Typography,
} from "antd";
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  FileSearchOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { constructionSiteService } from "../../services/constructionSiteService";
import {
  capitalizeFirstLetter,
  filterCyrillicOnly,
} from "../../utils/formatters";
import {
  createAntiAutofillIds,
  formatBlankNumber,
  formatInn,
  formatKig,
  formatPatentNumber,
  formatPhoneNumber,
  formatSnils,
  normalizeKig,
  normalizePatentNumber,
  normalizePhoneNumber,
  normalizeRussianPassportNumber,
} from "./employeeFormUtils";
import { useAuthStore } from "../../store/authStore";
import { useReferencesStore } from "../../store/referencesStore";
import { DEFAULT_FORM_CONFIG } from "../../shared/config/employeeFields";
import EmployeeBasicInfoTab from "./EmployeeBasicInfoTab.jsx";
import EmployeeDocumentsTab from "./EmployeeDocumentsTab.jsx";
import EmployeePatentTab from "./EmployeePatentTab.jsx";
import EmployeeCounterpartyTab from "./EmployeeCounterpartyTab.jsx";
import EmployeeFilesTab from "./EmployeeFilesTab.jsx";
import TransferEmployeeModal from "./TransferEmployeeModal.jsx";
import ocrService from "../../services/ocrService";
import mvdService from "../../services/mvdService";
import {
  applyLinkingModePayload,
  getInitialLinkingMode,
  shouldStayOpenAfterSave,
} from "./useEmployeeLinkingMode";
import useEmployeeReferences from "./useEmployeeReferences";
import useEmployeeTabsValidation from "./useEmployeeTabsValidation";
import dayjs from "dayjs";
import { employeeService } from "../../services/employeeService";
import {
  DATE_FORMAT,
  OCR_CONFLICT_HELP,
  OCR_DEBUG_PREFIX,
  OCR_SUPPORTED_FILE_TYPES,
  OCR_FILE_TYPE_LABELS,
  OCR_DOC_TYPE_LABELS,
  MVD_TYPE_LABELS,
  MVD_PARAM_LABELS,
  MVD_PARAM_PLACEHOLDERS,
  normalizeString,
  isEmptyValue,
  normalizeDateForCompare,
  normalizeGenderForCompare,
  normalizePassportNumberForCompare,
  formatPassportNumberForForm,
  formatFieldValueForDisplay,
  toDebugValue,
  toDebugObject,
  mapOcrSexToFormGender,
  resolveCitizenshipIdByOcrCode,
  parseOcrRawJson,
  resolvePassportNumberPartsFromOcr,
  resolveOcrDocumentTypeByFile,
  buildMvdPrefillValues,
} from "./employeeFormModalUtils";

const EmployeeFormModal = ({
  visible,
  employee,
  onCancel,
  onSuccess,
  onCheckInn,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [mvdForm] = Form.useForm();
  const antiAutofillIds = useMemo(() => createAntiAutofillIds(), []);
  const [citizenships, setCitizenships] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingCitizenship, setCheckingCitizenship] = useState(false); // Флаг проверки гражданства
  const [dataLoaded, setDataLoaded] = useState(false); // Новый флаг: данные полностью загружены
  const [activeTab, setActiveTab] = useState("1");
  const [tabsValidation, setTabsValidation] = useState({
    1: false, // Личная информация
    2: false, // Документы
    3: false, // Патент
  });
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const [passportType, setPassportType] = useState(null); // Состояние для типа паспорта
  const [linkingMode, setLinkingMode] = useState(false); // 🎯 Режим привязки существующего сотрудника
  const innCheckTimeoutRef = useRef(null); // Ref для хранения таймера проверки ИНН
  const isFormResetRef = useRef(false); // 🎯 Флаг для предотвращения проверки ИНН при сбросе формы
  const autoSaveTimeoutRef = useRef(null); // Ref для debounce автосохранения
  const autoSavingRef = useRef(false); // Флаг выполнения автосохранения
  const lastAutoSavedHashRef = useRef(null); // Хеш последнего автосохранения
  const [latinInputError, setLatinInputError] = useState(null); // Поле, где был введен латинский символ
  const latinErrorTimeoutRef = useRef(null); // Ref для таймера очистки ошибки
  const validationTimeoutRef = useRef(null);
  const { user } = useAuthStore();
  const { formConfigDefault, formConfigExternal } = useReferencesStore();
  const [transferModalVisible, setTransferModalVisible] = useState(false); // Модальное окно перевода сотрудника
  const [activeConfig, setActiveConfig] = useState(DEFAULT_FORM_CONFIG);
  const [availableCounterparties, setAvailableCounterparties] = useState([]); // Доступные контрагенты
  const [loadingCounterparties, setLoadingCounterparties] = useState(false); // Загрузка контрагентов
  const [ocrFiles, setOcrFiles] = useState([]);
  const [loadingOcrFiles, setLoadingOcrFiles] = useState(false);
  const [selectedOcrFileId, setSelectedOcrFileId] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrConflicts, setOcrConflicts] = useState([]);
  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [ocrConflictByField, setOcrConflictByField] = useState({});
  const [ocrPendingConfirmation, setOcrPendingConfirmation] = useState(null);
  const [mvdModalVisible, setMvdModalVisible] = useState(false);
  const [mvdMetaLoading, setMvdMetaLoading] = useState(false);
  const [mvdCheckLoading, setMvdCheckLoading] = useState(false);
  const [mvdSupportedTypes, setMvdSupportedTypes] = useState([]);
  const [mvdSelectedType, setMvdSelectedType] = useState(null);
  const [mvdResult, setMvdResult] = useState(null);
  const [mvdErrorText, setMvdErrorText] = useState("");

  // Определяем активный конфиг
  const fetchConstructionSites = useCallback(async () => {
    try {
      if (!user?.counterpartyId || !defaultCounterpartyId) {
        return [];
      }

      let loadedSites = [];
      if (user.counterpartyId === defaultCounterpartyId) {
        // Для default контрагента - все объекты
        const { data } = await constructionSiteService.getAll();
        loadedSites = data.data.constructionSites || [];
      } else {
        // Для остальных контрагентов - только назначенные объекты
        const { data } = await constructionSiteService.getCounterpartyObjects(
          user.counterpartyId,
        );
        loadedSites = data.data || [];
      }

      return loadedSites;
    } catch (error) {
      console.error("Error loading construction sites:", error);
      // Не показываем ошибку, просто возвращаем пустой массив
      return [];
    }
  }, [defaultCounterpartyId, user?.counterpartyId]);

  const {
    fetchCitizenships,
    fetchPositions,
    fetchDefaultCounterparty,
    fetchCounterparties,
  } = useEmployeeReferences({
    setCitizenships,
    setPositions,
    setDefaultCounterpartyId,
    setAvailableCounterparties,
    setLoadingCounterparties,
  });

  useEffect(() => {
    const isDefault = user?.counterpartyId === defaultCounterpartyId;
    const config = isDefault
      ? formConfigDefault || DEFAULT_FORM_CONFIG
      : formConfigExternal || DEFAULT_FORM_CONFIG;
    setActiveConfig(config);
  }, [user, defaultCounterpartyId, formConfigDefault, formConfigExternal]);

  // Хелпер для получения настроек поля
  const getFieldProps = useCallback(
    (fieldName) => {
      const fieldConfig = activeConfig[fieldName] || {
        visible: true,
        required: false,
      };

      // Базовые правила (например, паттерны)
      let rules = [];
      if (fieldConfig.required) {
        rules.push({ required: true, message: `Заполните поле` });
      }

      return {
        hidden: !fieldConfig.visible,
        required: fieldConfig.required,
        rules, // Это базовые правила, специфичные добавляются в самом Form.Item
      };
    },
    [activeConfig],
  );

  // Обработчик для обновления при изменении файлов
  // filesCount - количество файлов (используется только для информации)
  const handleFilesChange = (_filesCount) => {
    if (employee?.id) {
      fetchOcrFiles();
    }
  };

  const fetchOcrFiles = useCallback(async () => {
    if (!employee?.id) {
      setOcrFiles([]);
      setSelectedOcrFileId(null);
      return;
    }

    setLoadingOcrFiles(true);
    try {
      const response = await employeeService.getFiles(employee.id);
      const files = response?.data || [];
      const filtered = files.filter((file) => {
        const documentType = file.documentType || file.document_type;
        if (!OCR_SUPPORTED_FILE_TYPES.includes(documentType)) return false;
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
  }, [employee?.id, message]);

  useEffect(() => {
    if (!visible) return;
    if (!employee?.id) {
      setOcrFiles([]);
      setSelectedOcrFileId(null);
      return;
    }
    fetchOcrFiles();
  }, [visible, employee?.id, fetchOcrFiles]);

  const { requiredFieldsByTab, computeValidation, requiresPatent } =
    useEmployeeTabsValidation({
      form,
      getFieldProps,
      passportType,
      selectedCitizenship,
    });
  const computeValidationRef = useRef(computeValidation);

  useEffect(() => {
    computeValidationRef.current = computeValidation;
  }, [computeValidation]);

  const scheduleValidation = useCallback(() => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        const validation = computeValidation();
        setTabsValidation(validation);
      });
      return;
    }
    const validation = computeValidation();
    setTabsValidation(validation);
  }, [computeValidation]);

  useEffect(() => {
    const abortController = new AbortController();

    const initializeModal = async () => {
      if (!visible) {
        // Сбрасываем состояние при закрытии
        setDataLoaded(false);
        setCheckingCitizenship(false);
        setSelectedCitizenship(null);
        setPassportType(null);
        setOcrFiles([]);
        setSelectedOcrFileId(null);
        setOcrRunning(false);
        setOcrConflicts([]);
        setOcrModalVisible(false);
        setOcrConflictByField({});
        setOcrPendingConfirmation(null);
        setMvdModalVisible(false);
        setMvdCheckLoading(false);
        setMvdResult(null);
        setMvdErrorText("");
        setMvdSelectedType(null);
        mvdForm.resetFields();
        return;
      }

      setDataLoaded(false);
      setActiveTab("1");

      try {
        // Загружаем справочники параллельно и получаем загруженные данные напрямую
        const [loadedCitizenships] = await Promise.all([
          fetchCitizenships(),
          fetchConstructionSites(),
          fetchPositions(),
          fetchDefaultCounterparty(),
          fetchCounterparties(),
        ]);

        // Проверяем, не был ли запрос отменен
        if (abortController.signal.aborted) {
          return;
        }

        if (employee) {
          setLinkingMode(getInitialLinkingMode(employee));

          // Сразу устанавливаем данные сотрудника в форму
          const mapping = employee.employeeCounterpartyMappings?.[0];

          // Определяем текущие статусы из маппинга
          let isFired = false;
          let isInactive = false;

          if (
            employee.statusMappings &&
            Array.isArray(employee.statusMappings)
          ) {
            const statusMapping = employee.statusMappings.find((m) => {
              const mappingGroup = m.statusGroup || m.status_group;
              return mappingGroup === "status_active";
            });
            if (statusMapping) {
              const statusObj = statusMapping.status || statusMapping.Status;
              const statusName = statusObj?.name;
              if (
                statusName === "status_active_fired" ||
                statusName === "status_active_fired_compl"
              ) {
                isFired = true;
              } else if (statusName === "status_active_inactive") {
                isInactive = true;
              }
            }
          }

          const formData = {
            ...employee,
            birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
            passportDate: employee.passportDate
              ? dayjs(employee.passportDate)
              : null,
            passportExpiryDate: employee.passportExpiryDate
              ? dayjs(employee.passportExpiryDate)
              : null,
            patentIssueDate: employee.patentIssueDate
              ? dayjs(employee.patentIssueDate)
              : null,
            kigEndDate: employee.kigEndDate ? dayjs(employee.kigEndDate) : null,
            constructionSiteId: mapping?.constructionSiteId || null,
            counterpartyId: mapping?.counterpartyId || null, // Контрагент из маппинга
            birthCountryId: employee.birthCountryId || null,
            isFired: isFired,
            isInactive: isInactive,
            // Форматируем ИНН, СНИЛС, телефон, КИГ, номер патента и номер бланка при загрузке
            inn: employee.inn ? formatInn(employee.inn) : null,
            snils: employee.snils ? formatSnils(employee.snils) : null,
            phone: employee.phone ? formatPhoneNumber(employee.phone) : null,
            kig: employee.kig ? formatKig(employee.kig) : null,
            patentNumber: employee.patentNumber
              ? formatPatentNumber(employee.patentNumber)
              : null,
            blankNumber: employee.blankNumber
              ? formatBlankNumber(employee.blankNumber)
              : null,
          };

          form.setFieldsValue(formData);

          // Инициализируем тип паспорта
          setPassportType(employee.passportType || null);

          // Определяем гражданство используя загруженные данные напрямую
          setCheckingCitizenship(true);

          if (employee.citizenshipId && loadedCitizenships.length > 0) {
            const citizenship = loadedCitizenships.find(
              (c) => c.id === employee.citizenshipId,
            );

            if (citizenship) {
              setSelectedCitizenship(citizenship);
              // Запускаем валидацию с учетом гражданства
              const validation = computeValidationRef.current(citizenship);
              setTabsValidation(validation);
            }
          }

          setCheckingCitizenship(false);
          setDataLoaded(true);
        } else {
          // Для нового сотрудника просто загружаем справочники
          form.resetFields();

          // Устанавливаем counterpartyId по умолчанию - контрагента текущего пользователя
          if (user?.counterpartyId) {
            form.setFieldsValue({ counterpartyId: user.counterpartyId });
          }

          setActiveTab("1");
          setTabsValidation({ 1: false, 2: false, 3: false });
          setSelectedCitizenship(null);
          setDataLoaded(true);
        }
      } catch (error) {
        // Игнорируем ошибки отмены запроса
        if (error.name === "AbortError" || error.name === "CanceledError") {
          return;
        }
        console.error("❌ EmployeeFormModal: initialization error", error);
        if (!abortController.signal.aborted) {
          setCheckingCitizenship(false);
          setDataLoaded(true);
        }
      }
    };

    initializeModal();

    // Cleanup: отменяем запросы при размонтировании или изменении visible/employee
    return () => {
      abortController.abort();
    };
  }, [
    visible,
    employee,
    fetchCitizenships,
    fetchPositions,
    fetchDefaultCounterparty,
    fetchCounterparties,
    fetchConstructionSites,
    form,
    mvdForm,
    user?.counterpartyId,
  ]);

  // Обновляем валидацию при изменении requiresPatent
  useEffect(() => {
    // Не запускаем во время проверки гражданства
    if (checkingCitizenship) return;

    if (!requiresPatent && activeTab === "3") {
      // Если патент больше не требуется и мы на вкладке "Патент", переключаемся на первую вкладку
      setActiveTab("1");
    }
  }, [requiresPatent, activeTab, checkingCitizenship, visible]);

  const updateSelectedCitizenship = useCallback(
    (citizenshipId) => {
      const citizenship = citizenships.find((c) => c.id === citizenshipId);
      setSelectedCitizenship(citizenship || null);
    },
    [citizenships],
  );

  const handleCitizenshipChange = useCallback(
    (citizenshipId) => {
      updateSelectedCitizenship(citizenshipId);
      // Валидация запустится автоматически через handleFieldsChange
    },
    [updateSelectedCitizenship],
  );

  // Проверяем, заполнены ли все обязательные поля на вкладке
  // Проверяем, все ли вкладки валидны
  const allTabsValid = () => {
    // Проверяем только те вкладки, которые существуют в requiredFieldsByTab
    const requiredTabs = Object.keys(requiredFieldsByTab);
    return requiredTabs.every((tabKey) => tabsValidation[tabKey] === true);
  };

  const buildOcrCandidates = useCallback(
    (ocrDocumentType, normalized = {}, rawJson = {}) => {
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
        const {
          seriesDigits: passportSeriesDigits,
          numberDigits: passportNumberDigits,
        } = resolvePassportNumberPartsFromOcr(normalized, rawJson);
        const passportNumberForForm = formatPassportNumberForForm({
          series: passportSeriesDigits,
          number: passportNumberDigits,
        });

        return {
          ...common,
          passportType: "russian",
          passportNumber: passportNumberForForm,
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

      if (ocrDocumentType === "visa") {
        return {
          ...common,
        };
      }

      return common;
    },
    [citizenships],
  );

  const areValuesDifferent = useCallback(
    (fieldName, currentValue, ocrValue) => {
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
    },
    [],
  );

  const getFieldLabel = useCallback((fieldName) => {
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
  }, []);

  const applyOcrFieldWarnings = useCallback((conflicts = []) => {
    const nextWarnings = {};
    conflicts.forEach((item) => {
      nextWarnings[item.fieldName] = OCR_CONFLICT_HELP;
    });
    setOcrConflictByField(nextWarnings);
  }, []);

  const confirmOcrForFile = useCallback(
    async ({ fileId, provider, normalizedResult }) => {
      if (!employee?.id || !fileId) return;
      await ocrService.confirmFileOcr({
        employeeId: employee.id,
        fileId,
        provider,
        result: normalizedResult,
      });
      fetchOcrFiles();
    },
    [employee?.id, fetchOcrFiles],
  );

  const handleStartDocumentOcr = useCallback(async () => {
    if (!employee?.id) {
      message.warning("Сначала сохраните сотрудника");
      return;
    }

    if (!selectedOcrFileId) {
      message.warning("Выберите файл документа для OCR");
      return;
    }

    const selectedOcrFile = ocrFiles.find(
      (item) => item.id === selectedOcrFileId,
    );
    if (!selectedOcrFile) {
      message.warning("Выбранный файл не найден. Обновите список файлов.");
      return;
    }

    const selectedFileDocumentType =
      selectedOcrFile.documentType || selectedOcrFile.document_type;
    const currentPassportType =
      form.getFieldValue("passportType") || passportType;
    const ocrDocumentType = resolveOcrDocumentTypeByFile(
      selectedFileDocumentType,
      currentPassportType,
    );

    if (!ocrDocumentType) {
      message.warning("Для выбранного файла OCR не поддерживается");
      return;
    }

    try {
      setOcrRunning(true);
      console.groupCollapsed(
        `${OCR_DEBUG_PREFIX} start employeeId=${employee?.id || "n/a"} fileId=${selectedOcrFileId || "n/a"} docType=${ocrDocumentType}`,
      );

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
      );
      const candidateEntries = Object.entries(candidates).filter(
        ([, value]) => !isEmptyValue(value),
      );

      console.log(`${OCR_DEBUG_PREFIX} response`, response);
      console.log(`${OCR_DEBUG_PREFIX} normalized`, normalized);
      console.log(`${OCR_DEBUG_PREFIX} rawJson`, rawJson);
      console.log(`${OCR_DEBUG_PREFIX} candidates`, toDebugObject(candidates));
      console.log(
        `${OCR_DEBUG_PREFIX} candidateEntries`,
        candidateEntries.map(([fieldName, value]) => ({
          fieldName,
          value: toDebugValue(value),
        })),
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
      const decisionLog = [];

      console.log(
        `${OCR_DEBUG_PREFIX} currentValues before apply`,
        toDebugObject(currentValues),
      );

      candidateEntries.forEach(([fieldName, ocrValue]) => {
        const currentValue = currentValues[fieldName];

        if (fieldName === "passportType") {
          if (isEmptyValue(currentValue)) {
            autoFill[fieldName] = ocrValue;
            decisionLog.push({
              fieldName,
              decision: "autofill_empty_passportType",
              currentValue: toDebugValue(currentValue),
              ocrValue: toDebugValue(ocrValue),
            });
          } else {
            decisionLog.push({
              fieldName,
              decision: "skip_passportType_existing",
              currentValue: toDebugValue(currentValue),
              ocrValue: toDebugValue(ocrValue),
            });
          }
          return;
        }

        if (isEmptyValue(currentValue)) {
          autoFill[fieldName] = ocrValue;
          decisionLog.push({
            fieldName,
            decision: "autofill_empty",
            currentValue: toDebugValue(currentValue),
            ocrValue: toDebugValue(ocrValue),
          });
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
          decisionLog.push({
            fieldName,
            decision: "conflict",
            currentValue: toDebugValue(currentValue),
            ocrValue: toDebugValue(ocrValue),
          });
          return;
        }

        decisionLog.push({
          fieldName,
          decision: "same_value_skip",
          currentValue: toDebugValue(currentValue),
          ocrValue: toDebugValue(ocrValue),
        });
      });

      console.table(decisionLog);

      if (Object.keys(autoFill).length === 0 && candidateEntries.length > 0) {
        candidateEntries.forEach(([fieldName, ocrValue]) => {
          autoFill[fieldName] = ocrValue;
        });
        console.log(
          `${OCR_DEBUG_PREFIX} fallback: autoFill был пуст, применяем все candidateEntries`,
        );
      }

      if (Object.keys(autoFill).length > 0) {
        console.log(
          `${OCR_DEBUG_PREFIX} autoFill before apply`,
          toDebugObject(autoFill),
        );
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
        console.log(
          `${OCR_DEBUG_PREFIX} appliedValues immediate`,
          toDebugObject(appliedValues),
        );
        if (missingKeys.length > 0) {
          console.warn(`${OCR_DEBUG_PREFIX} missingKeys`, missingKeys);
          missingKeys.forEach((key) => {
            if (typeof form.setFieldValue === "function") {
              form.setFieldValue(key, autoFill[key]);
            }
          });
          form.setFieldsValue(
            missingKeys.reduce((acc, key) => {
              acc[key] = autoFill[key];
              return acc;
            }, {}),
          );
        }
        setTimeout(() => {
          const postTickValues = form.getFieldsValue(Object.keys(autoFill));
          console.log(
            `${OCR_DEBUG_PREFIX} appliedValues postTick`,
            toDebugObject(postTickValues),
          );
        }, 0);
        if (autoFill.passportType) {
          setPassportType(autoFill.passportType);
        }
        if (autoFill.citizenshipId) {
          updateSelectedCitizenship(autoFill.citizenshipId);
        }
        message.success(
          `OCR: заполнено полей — ${Object.keys(autoFill).length}`,
        );
        if (missingKeys.length > 0) {
          message.warning(`OCR: не применилось — ${missingKeys.join(", ")}`);
        }
      } else {
        console.log(`${OCR_DEBUG_PREFIX} autoFill is empty`);
      }

      if (conflicts.length > 0) {
        console.log(
          `${OCR_DEBUG_PREFIX} conflicts`,
          conflicts.map((item) => ({
            fieldName: item.fieldName,
            label: item.label,
            currentValue: toDebugValue(item.currentValue),
            ocrValue: toDebugValue(item.ocrValue),
          })),
        );
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

      console.log(`${OCR_DEBUG_PREFIX} no conflicts, confirming OCR file`, {
        fileId,
        provider,
      });
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
      console.error(`${OCR_DEBUG_PREFIX} run error`, error);
      message.error(error?.userMessage || "Не удалось выполнить OCR");
    } finally {
      console.groupEnd();
      setOcrRunning(false);
    }
  }, [
    applyOcrFieldWarnings,
    areValuesDifferent,
    buildOcrCandidates,
    confirmOcrForFile,
    employee?.id,
    form,
    getFieldLabel,
    message,
    ocrFiles,
    passportType,
    selectedOcrFileId,
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
      console.log(
        `${OCR_DEBUG_PREFIX} apply conflict decisions`,
        toDebugObject(replacementValues),
      );
      form.setFieldsValue(replacementValues);
      if (replacementValues.passportType) {
        setPassportType(replacementValues.passportType);
      }
      if (replacementValues.citizenshipId) {
        updateSelectedCitizenship(replacementValues.citizenshipId);
      }
      const appliedValues = form.getFieldsValue(Object.keys(replacementValues));
      console.log(
        `${OCR_DEBUG_PREFIX} conflict decisions appliedValues`,
        toDebugObject(appliedValues),
      );
    } else {
      console.log(
        `${OCR_DEBUG_PREFIX} apply conflict decisions: no replacements selected`,
      );
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
    updateSelectedCitizenship,
  ]);

  const handleCancelOcrConflictModal = useCallback(() => {
    setOcrModalVisible(false);
    setOcrConflicts([]);
    setOcrPendingConfirmation(null);
    setOcrConflictByField({});
  }, []);

  const fetchMvdMeta = useCallback(async () => {
    setMvdMetaLoading(true);
    try {
      const response = await mvdService.getMeta();
      const supportedTypes = response?.data?.supportedTypes || [];
      setMvdSupportedTypes(supportedTypes);
      return supportedTypes;
    } catch (error) {
      console.error("Error loading MVD meta:", error);
      message.error(
        error?.userMessage || "Не удалось загрузить типы проверок МВД",
      );
      return [];
    } finally {
      setMvdMetaLoading(false);
    }
  }, [message]);

  const handleMvdTypeChange = useCallback(
    (nextType) => {
      setMvdSelectedType(nextType);
      setMvdResult(null);
      setMvdErrorText("");
      mvdForm.resetFields();
      const prefill = buildMvdPrefillValues(
        nextType,
        form.getFieldsValue(true),
      );
      mvdForm.setFieldsValue(prefill);
    },
    [form, mvdForm],
  );

  const handleOpenMvdModal = useCallback(async () => {
    setMvdModalVisible(true);
    setMvdResult(null);
    setMvdErrorText("");

    let types = mvdSupportedTypes;
    if (types.length === 0) {
      types = await fetchMvdMeta();
    }

    const initialType = mvdSelectedType || types[0]?.type || null;
    if (initialType) {
      handleMvdTypeChange(initialType);
    }
  }, [fetchMvdMeta, handleMvdTypeChange, mvdSelectedType, mvdSupportedTypes]);

  const handleRunMvdCheck = useCallback(async () => {
    if (!mvdSelectedType) {
      message.warning("Выберите тип проверки МВД");
      return;
    }

    const selectedTypeMeta = mvdSupportedTypes.find(
      (item) => item.type === mvdSelectedType,
    );
    const requiredParams = selectedTypeMeta?.requiredParams || [];

    try {
      setMvdCheckLoading(true);
      setMvdErrorText("");

      await mvdForm.validateFields(requiredParams);
      const formValues = mvdForm.getFieldsValue(requiredParams);
      const params = {};
      requiredParams.forEach((key) => {
        const value = normalizeString(formValues[key]);
        if (value) {
          params[key] = value;
        }
      });

      const response = await mvdService.check({
        type: mvdSelectedType,
        params,
      });

      setMvdResult(response?.data || response || null);
      message.success("Проверка МВД выполнена");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      console.error("MVD check error:", error);
      const errorText =
        error?.userMessage || "Не удалось выполнить проверку МВД";
      setMvdErrorText(errorText);
      message.error(errorText);
    } finally {
      setMvdCheckLoading(false);
    }
  }, [message, mvdForm, mvdSelectedType, mvdSupportedTypes]);

  const handleCloseMvdModal = useCallback(() => {
    setMvdModalVisible(false);
  }, []);

  // Обработчик изменения полей формы
  const handleFieldsChange = (changedFields) => {
    if (!dataLoaded) {
      return; // Не запускаем валидацию, пока данные не загружены
    }

    if (Array.isArray(changedFields) && changedFields.length > 0) {
      setOcrConflictByField((prev) => {
        if (!prev || Object.keys(prev).length === 0) {
          return prev;
        }

        const next = { ...prev };
        let changed = false;

        changedFields.forEach((item) => {
          const fieldName = Array.isArray(item?.name) ? item.name[0] : null;
          if (fieldName && next[fieldName]) {
            delete next[fieldName];
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }

    // Обновляем тип паспорта
    const currentPassportType = form.getFieldValue("passportType");
    if (currentPassportType !== passportType) {
      setPassportType(currentPassportType);
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = setTimeout(() => {
      scheduleValidation();
    }, 100);

    scheduleAutoSaveDraft();

    // Сбрасываем флаг после обработки
    isFormResetRef.current = false;
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
          message.error(
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
  };

  // Переход на следующую вкладку
  const handleNext = () => {
    // Определяем доступные вкладки в зависимости от requiresPatent
    const tabOrder = requiresPatent ? ["1", "2", "3"] : ["1", "2"];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  // Сохранение как черновик
  const saveDraft = useCallback(
    async ({ silent = false, preserveForm = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        // Получаем ВСЕ значения, включая скрытые поля
        const values = form.getFieldsValue(true);

        let formattedValues = {};
        const uuidFields = ["positionId", "citizenshipId"]; // UUID поля требуют null вместо пустых строк

        Object.keys(values).forEach((key) => {
          // constructionSiteId обрабатывается отдельно
          if (key === "constructionSiteId") {
            return;
          }

          const value = values[key];

          // Обрабатываем чекбоксы статусов отдельно - отправляем как boolean
          if (key === "isFired" || key === "isInactive") {
            formattedValues[key] = !!value;
            return;
          }

          if (value === "" || value === undefined || value === null) {
            formattedValues[key] = null;
          } else if (
            key === "birthDate" ||
            key === "passportDate" ||
            key === "patentIssueDate" ||
            key === "kigEndDate" ||
            key === "passportExpiryDate"
          ) {
            // Проверяем что это dayjs объект (имеет метод format), а не строка
            formattedValues[key] =
              value && value.format ? value.format("YYYY-MM-DD") : null;
          } else if (key === "phone") {
            // Убираем форматирование телефона и добавляем + в начало
            formattedValues[key] = normalizePhoneNumber(value);
          } else if (key === "kig") {
            // Убираем пробел из КИГ (АА 1234567 → АА1234567)
            formattedValues[key] = normalizeKig(value);
          } else if (key === "patentNumber") {
            // Убираем пробел из номера патента (01 №1234567890 → 01№1234567890)
            formattedValues[key] = normalizePatentNumber(value);
          } else if (key === "inn" || key === "snils") {
            // Убираем дефисы и пробелы из ИНН и СНИЛС (оставляем только цифры)
            formattedValues[key] = value ? value.replace(/[^\d]/g, "") : null;
          } else if (key === "passportNumber") {
            // Обработка номера паспорта в зависимости от типа
            if (values.passportType === "russian") {
              // Для российского паспорта: убираем пробелы и символ №, оставляем только цифры
              formattedValues[key] = normalizeRussianPassportNumber(value);
            } else {
              // Для иностранного паспорта: оставляем как есть
              formattedValues[key] = value;
            }
          } else if (uuidFields.includes(key)) {
            // Для UUID полей - убеждаемся что пустые строки становятся null
            formattedValues[key] = value && String(value).trim() ? value : null;
          } else {
            formattedValues[key] = value;
          }
        });

        formattedValues.isDraft = true; // Флаг для фронтенда
        await onSuccess(formattedValues);

        // При сохранении черновика модальное окно НЕ закрывается
        // Если это добавление нового сотрудника - сбрасываем форму
        if (!employee && !preserveForm) {
          // 🎯 ВАЖНО: очищаем таймер проверки ИНН ДО сброса формы
          if (innCheckTimeoutRef.current) {
            clearTimeout(innCheckTimeoutRef.current);
          }
          isFormResetRef.current = true;
          form.resetFields();
          setActiveTab("1");
          setTabsValidation({ 1: false, 2: false, 3: false });
          setSelectedCitizenship(null);
          setPassportType(null);
        }
        // Если это редактирование - оставляем окно открытым с загруженными данными
      } catch (error) {
        console.error("Save draft error:", error);
        // Ошибка уже показана в родительском компоненте через message.error
        // Не закрываем модальное окно
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [employee, form, onSuccess],
  );

  const handleSaveDraft = async () => {
    await saveDraft({ silent: false, preserveForm: false });
  };

  const scheduleAutoSaveDraft = useCallback(() => {
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
        await saveDraft({ silent: true, preserveForm: true });
        lastAutoSavedHashRef.current = hash;
      } finally {
        autoSavingRef.current = false;
      }
    }, 600);
  }, [employee?.id, form, saveDraft]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Полное сохранение
  const handleSave = async () => {
    try {
      setLoading(true);
      // Сначала валидируем видимые поля
      await form.validateFields();

      // Получаем ВСЕ значения для отправки, включая скрытые
      const values = form.getFieldsValue(true);

      const formattedValues = {};
      const uuidFields = ["positionId", "citizenshipId"]; // UUID поля требуют null вместо пустых строк

      Object.keys(values).forEach((key) => {
        // constructionSiteId обрабатывается отдельно
        if (key === "constructionSiteId") {
          return;
        }

        const value = values[key];

        // Обрабатываем чекбоксы статусов отдельно - отправляем как boolean
        if (key === "isFired" || key === "isInactive") {
          formattedValues[key] = !!value;
          return;
        }

        if (value === "" || value === undefined || value === null) {
          formattedValues[key] = null;
        } else if (
          key === "birthDate" ||
          key === "passportDate" ||
          key === "patentIssueDate" ||
          key === "kigEndDate" ||
          key === "passportExpiryDate"
        ) {
          // Проверяем что это dayjs объект (имеет метод format), а не строка
          formattedValues[key] =
            value && value.format ? value.format("YYYY-MM-DD") : null;
        } else if (key === "phone") {
          // Убираем форматирование телефона и добавляем + в начало
          formattedValues[key] = normalizePhoneNumber(value);
        } else if (key === "kig") {
          // Убираем пробел из КИГ (АА 1234567 → АА1234567)
          formattedValues[key] = normalizeKig(value);
        } else if (key === "patentNumber") {
          // Убираем пробел из номера патента (01 №1234567890 → 01№1234567890)
          formattedValues[key] = normalizePatentNumber(value);
        } else if (key === "inn" || key === "snils") {
          // Убираем дефисы и пробелы из ИНН и СНИЛС (оставляем только цифры)
          formattedValues[key] = value ? value.replace(/[^\d]/g, "") : null;
        } else if (key === "passportNumber") {
          // Обработка номера паспорта в зависимости от типа
          if (values.passportType === "russian") {
            // Для российского паспорта: убираем пробелы и символ №, оставляем только цифры
            formattedValues[key] = normalizeRussianPassportNumber(value);
          } else {
            // Для иностранного паспорта: оставляем как есть
            formattedValues[key] = value;
          }
        } else if (uuidFields.includes(key)) {
          // Для UUID полей - убеждаемся что пустые строки становятся null
          formattedValues[key] = value && String(value).trim() ? value : null;
        } else {
          formattedValues[key] = value;
        }
      });

      formattedValues.isDraft = false; // Флаг для бэкенда

      // Режим привязки: отправляем ID сотрудника вместо его данных
      const payload = applyLinkingModePayload(
        formattedValues,
        employee,
        linkingMode,
      );

      await onSuccess(payload);

      // 🎯 Если это режим привязки - остаемся на странице с сообщением
      if (shouldStayOpenAfterSave(linkingMode)) {
        message.success("Сотрудник успешно привязан к вашему профилю");
        // 🎯 ВАЖНО: очищаем таймер проверки ИНН ДО сброса формы
        if (innCheckTimeoutRef.current) {
          clearTimeout(innCheckTimeoutRef.current);
        }
        // Сбрасываем форму и режим привязки
        isFormResetRef.current = true;
        form.resetFields();
        setActiveTab("1");
        setTabsValidation({ 1: false, 2: false, 3: false });
        setSelectedCitizenship(null);
        setPassportType(null);
        setLinkingMode(false);
      } else if (!employee) {
        // Если это добавление нового сотрудника - НЕ закрываем окно
        // 🎯 ВАЖНО: очищаем таймер проверки ИНН ДО сброса формы
        if (innCheckTimeoutRef.current) {
          clearTimeout(innCheckTimeoutRef.current);
        }
        // Сбрасываем форму для добавления следующего сотрудника
        isFormResetRef.current = true;
        form.resetFields();
        setActiveTab("1");
        setTabsValidation({ 1: false, 2: false, 3: false });
        setSelectedCitizenship(null);
        setPassportType(null);
      } else {
        // Если это редактирование своего сотрудника - закрываем окно
        onCancel();
      }
    } catch (error) {
      console.error("Validation or save error:", error);
      // Если это ошибка валидации формы, показываем сообщение
      if (error.errorFields) {
        message.error("Пожалуйста, заполните все обязательные поля");
      }
      // Если это ошибка сохранения (дубликат ИНН и т.д.), сообщение уже показано в родителе
      // Не закрываем модальное окно
    } finally {
      setLoading(false);
    }
  };

  // Обработчик закрытия модального окна
  const handleModalCancel = () => {
    onCancel();
  };

  // Определяем стиль вкладки (обычный черный текст)
  const getTabStyle = () => {
    return {};
  };

  // Рендерим иконку статуса вкладки
  const getTabIcon = (tabKey) => {
    if (tabsValidation[tabKey]) {
      return (
        <CheckCircleFilled
          style={{ color: "#52c41a", fontSize: 16, marginRight: 8 }}
        />
      );
    }
    return (
      <CheckCircleOutlined
        style={{ color: "#d9d9d9", fontSize: 16, marginRight: 8 }}
      />
    );
  };

  const selectedOcrFile = ocrFiles.find(
    (file) => file.id === selectedOcrFileId,
  );
  const selectedFileDocumentType =
    selectedOcrFile?.documentType || selectedOcrFile?.document_type || null;
  const selectedOcrDocumentType = resolveOcrDocumentTypeByFile(
    selectedFileDocumentType,
    form.getFieldValue("passportType") || passportType,
  );
  const selectedOcrDocumentLabel = selectedOcrDocumentType
    ? OCR_DOC_TYPE_LABELS[selectedOcrDocumentType] || selectedOcrDocumentType
    : null;
  const selectedMvdTypeMeta =
    mvdSupportedTypes.find((item) => item.type === mvdSelectedType) || null;
  const selectedMvdParams = selectedMvdTypeMeta?.requiredParams || [];

  const ocrSection = (
    <div style={{ marginBottom: 16 }}>
      <Alert
        showIcon
        type="info"
        icon={<RobotOutlined />}
        message="OCR документов"
        description={
          employee?.id
            ? "Выберите загруженный документ (паспорт/патент/КИГ/виза) и запустите распознавание. Пустые поля заполнятся автоматически."
            : "OCR доступен после сохранения сотрудника и загрузки файла документа."
        }
        action={
          <Space direction="vertical" size={8} style={{ width: 420 }}>
            <Select
              value={selectedOcrFileId}
              placeholder="Выберите файл документа"
              loading={loadingOcrFiles}
              disabled={!employee?.id || loadingOcrFiles || ocrRunning}
              onChange={setSelectedOcrFileId}
              popupMatchSelectWidth={false}
              dropdownStyle={{ minWidth: 420, maxWidth: 640 }}
              optionRender={(option) => (
                <span style={{ whiteSpace: "normal" }}>
                  {option.data?.label}
                </span>
              )}
              style={{ width: "100%" }}
              options={ocrFiles.map((file) => {
                const documentType = file.documentType || file.document_type;
                const docLabel =
                  OCR_FILE_TYPE_LABELS[documentType] || documentType;
                return {
                  value: file.id,
                  label: `${docLabel}: ${file.fileName} (${new Date(file.createdAt).toLocaleDateString("ru-RU")})`,
                };
              })}
            />
            <Space>
              <Button
                type="primary"
                onClick={handleStartDocumentOcr}
                loading={ocrRunning}
                disabled={
                  !employee?.id ||
                  !selectedOcrFileId ||
                  !selectedOcrDocumentType
                }
              >
                Распознать документ
              </Button>
              <Button
                onClick={fetchOcrFiles}
                disabled={!employee?.id || loadingOcrFiles || ocrRunning}
              >
                Обновить файлы
              </Button>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {selectedOcrDocumentLabel
                ? `Выбран OCR-тип: ${selectedOcrDocumentLabel}`
                : "Для выбранного файла OCR-тип не определен"}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {employee?.id
                ? `Найдено файлов для OCR: ${ocrFiles.length}`
                : "Сначала сохраните карточку сотрудника"}
            </Typography.Text>
          </Space>
        }
      />
    </div>
  );

  const mvdSection = (
    <div style={{ marginBottom: 16 }}>
      <Alert
        showIcon
        type="info"
        icon={<FileSearchOutlined />}
        message="Проверка МВД (api-cloud.ru)"
        description="Проверка сведений сотрудника через интеграцию с API Cloud."
        action={
          <Button
            onClick={handleOpenMvdModal}
            loading={mvdMetaLoading}
            disabled={mvdCheckLoading}
          >
            Проверить в МВД
          </Button>
        }
      />
    </div>
  );

  // Генерируем items для Tabs в новом формате
  const getTabsItems = () => {
    const items = [
      // Вкладка 1: Личная информация
      {
        key: "1",
        label: (
          <span style={getTabStyle()}>
            {getTabIcon("1")}
            Личная информация
          </span>
        ),
        children: (
          <EmployeeBasicInfoTab
            employee={employee}
            messageApi={message}
            onCancel={onCancel}
            user={user}
            defaultCounterpartyId={defaultCounterpartyId}
            onTransfer={() => setTransferModalVisible(true)}
            getFieldProps={getFieldProps}
            positions={positions}
            citizenships={citizenships}
            handleCitizenshipChange={handleCitizenshipChange}
            antiAutofillIds={antiAutofillIds}
            latinInputError={latinInputError}
            handleFullNameChange={handleFullNameChange}
            handleInnBlur={handleInnBlur}
            dateFormat={DATE_FORMAT}
            ocrConflictByField={ocrConflictByField}
          />
        ),
      },
      // Вкладка 2: Документы
      {
        key: "2",
        label: (
          <span style={getTabStyle()}>
            {getTabIcon("2")}
            Документы
          </span>
        ),
        children: (
          <EmployeeDocumentsTab
            getFieldProps={getFieldProps}
            requiresPatent={requiresPatent}
            passportType={passportType}
            setPassportType={setPassportType}
            dateFormat={DATE_FORMAT}
            ocrSection={ocrSection}
            mvdSection={mvdSection}
            ocrConflictByField={ocrConflictByField}
          />
        ),
      },
    ];

    // Вкладка 3: Патент (только если требуется)
    if (requiresPatent || checkingCitizenship) {
      items.push({
        key: "3",
        label: (
          <span style={getTabStyle()}>
            {getTabIcon("3")}
            Патент
            {checkingCitizenship && " (проверка...)"}
          </span>
        ),
        disabled: checkingCitizenship,
        children: checkingCitizenship ? (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#999" }}
          >
            Проверка необходимости патента...
          </div>
        ) : (
          <EmployeePatentTab
            getFieldProps={getFieldProps}
            dateFormat={DATE_FORMAT}
          />
        ),
      });
    }

    // Вкладка 4: Файлы (только для существующих сотрудников)
    if (employee?.id) {
      items.push({
        key: "4",
        label: "Файлы",
        children: (
          <EmployeeFilesTab
            employeeId={employee.id}
            onFilesUpdated={handleFilesChange}
          />
        ),
      });
    }

    // Вкладка 5: Контрагент (без галочки, не участвует в проверке обязательных полей)
    items.push({
      key: "5",
      label: "🏢 Контрагент",
      children: (
        <EmployeeCounterpartyTab
          availableCounterparties={availableCounterparties}
          loadingCounterparties={loadingCounterparties}
        />
      ),
    });

    return items;
  };

  // Контент формы
  const formContent = (
    <>
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
        onFieldsChange={handleFieldsChange}
        validateTrigger={["onChange", "onBlur"]}
        autoComplete="off"
        requiredMark={(label, { required }) => (
          <>
            {label}
            {required && (
              <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>
            )}
          </>
        )}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            // Валидация запустится через useEffect при изменении activeTab
          }}
          style={{ marginTop: 16 }}
          destroyOnHidden={false} // Рендерим все вкладки сразу, чтобы форма видела все поля
          items={getTabsItems()}
        />
      </Form>
    </>
  );

  // Футер с кнопками
  const footer = (
    <Space>
      <Button onClick={handleModalCancel}>
        {employee ? "Закрыть" : "Отмена"}
      </Button>
      <Button onClick={handleSaveDraft} loading={loading}>
        Сохранить черновик
      </Button>
      {allTabsValid() ? (
        <Button
          type="primary"
          onClick={handleSave}
          loading={loading}
          style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
        >
          Сохранить
        </Button>
      ) : (
        <Button type="primary" onClick={handleNext}>
          Следующая
        </Button>
      )}
    </Space>
  );

  // Модальное окно
  return (
    <>
      <Modal
        title={employee ? "Редактировать сотрудника" : "Добавить сотрудника1"}
        open={visible}
        onCancel={handleModalCancel}
        maskClosable={false}
        width={1350}
        footer={footer}
        styles={{
          body: { maxHeight: "70vh", overflowY: "auto", overflowX: "hidden" },
        }}
      >
        {formContent}
      </Modal>

      <Modal
        title={`Расхождения OCR (${ocrConflicts.length})`}
        open={ocrModalVisible}
        onCancel={handleCancelOcrConflictModal}
        onOk={handleApplyOcrConflicts}
        okText="Применить решения"
        cancelText="Отмена"
        width={980}
        maskClosable={false}
      >
        <Typography.Paragraph>
          Для каждого поля выберите, какое значение сохранить.
        </Typography.Paragraph>
        <List
          dataSource={ocrConflicts}
          renderItem={(item) => (
            <List.Item key={item.fieldName}>
              <div
                style={{
                  width: "100%",
                  border: "1px solid #ffe58f",
                  borderRadius: 8,
                  background: "#fffbe6",
                  padding: 12,
                }}
              >
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Typography.Text strong>{item.label}</Typography.Text>
                  <Typography.Text>
                    Текущее:{" "}
                    {formatFieldValueForDisplay(
                      item.fieldName,
                      item.currentValue,
                      citizenships,
                    )}
                  </Typography.Text>
                  <Typography.Text>
                    OCR:{" "}
                    {formatFieldValueForDisplay(
                      item.fieldName,
                      item.ocrValue,
                      citizenships,
                    )}
                  </Typography.Text>
                  <Radio.Group
                    value={item.decision}
                    onChange={(event) =>
                      handleResolveConflictDecision(
                        item.fieldName,
                        event.target.value,
                      )
                    }
                  >
                    <Radio value="keep">Оставить текущее</Radio>
                    <Radio value="replace">Заменить на OCR</Radio>
                  </Radio.Group>
                </Space>
              </div>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="Проверка МВД"
        open={mvdModalVisible}
        onCancel={handleCloseMvdModal}
        onOk={handleRunMvdCheck}
        okText="Выполнить проверку"
        cancelText="Закрыть"
        confirmLoading={mvdCheckLoading}
        width={760}
        maskClosable={false}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Провайдер: `api-cloud.ru/mvd`.
          </Typography.Text>

          <Form layout="vertical" form={mvdForm}>
            <Form.Item
              label="Тип проверки"
              required
              validateStatus={
                !mvdSelectedType && mvdModalVisible ? "warning" : ""
              }
              help={!mvdSelectedType ? "Выберите тип проверки" : ""}
            >
              <Select
                placeholder="Выберите тип проверки МВД"
                loading={mvdMetaLoading}
                value={mvdSelectedType}
                onChange={handleMvdTypeChange}
                options={mvdSupportedTypes.map((item) => ({
                  value: item.type,
                  label: MVD_TYPE_LABELS[item.type] || item.type,
                }))}
              />
            </Form.Item>

            {selectedMvdParams.map((paramKey) => (
              <Form.Item
                key={paramKey}
                name={paramKey}
                label={MVD_PARAM_LABELS[paramKey] || paramKey}
                rules={[
                  {
                    required: true,
                    message: "Поле обязательно",
                  },
                ]}
              >
                <Input
                  placeholder={
                    MVD_PARAM_PLACEHOLDERS[paramKey] || "Введите значение"
                  }
                />
              </Form.Item>
            ))}
          </Form>

          {selectedMvdParams.length > 0 && (
            <Typography.Text type="secondary">
              Обязательные поля: {selectedMvdParams.join(", ")}
            </Typography.Text>
          )}

          {mvdErrorText ? (
            <Alert type="error" message={mvdErrorText} showIcon />
          ) : null}

          {mvdResult ? (
            <Alert
              type="success"
              showIcon
              message="Результат проверки МВД"
              description={
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 280,
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(mvdResult, null, 2)}
                </pre>
              }
            />
          ) : null}
        </Space>
      </Modal>

      {/* Модальное окно перевода сотрудника в другую компанию */}
      <TransferEmployeeModal
        visible={transferModalVisible}
        employee={employee}
        onCancel={() => setTransferModalVisible(false)}
      />
    </>
  );
};

export default EmployeeFormModal;
