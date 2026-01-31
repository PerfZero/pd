import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Modal, Form, App, Tabs, Button, Space } from "antd";
import { CheckCircleFilled, CheckCircleOutlined } from "@ant-design/icons";
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
  noAutoFillProps,
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
import {
  applyLinkingModePayload,
  getInitialLinkingMode,
  shouldStayOpenAfterSave,
} from "./useEmployeeLinkingMode";
import useEmployeeReferences from "./useEmployeeReferences";
import useEmployeeTabsValidation from "./useEmployeeTabsValidation";
import dayjs from "dayjs";

const DATE_FORMAT = "DD.MM.YYYY";

const EmployeeFormModal = ({
  visible,
  employee,
  onCancel,
  onSuccess,
  onCheckInn,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
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
  const [latinInputError, setLatinInputError] = useState(null); // Поле, где был введен латинский символ
  const latinErrorTimeoutRef = useRef(null); // Ref для таймера очистки ошибки
  const validationTimeoutRef = useRef(null);
  const { user } = useAuthStore();
  const { formConfigDefault, formConfigExternal } = useReferencesStore();
  const [transferModalVisible, setTransferModalVisible] = useState(false); // Модальное окно перевода сотрудника
  const [activeConfig, setActiveConfig] = useState(DEFAULT_FORM_CONFIG);
  const [availableCounterparties, setAvailableCounterparties] = useState([]); // Доступные контрагенты
  const [loadingCounterparties, setLoadingCounterparties] = useState(false); // Загрузка контрагентов

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
    // При изменении файлов просто уведомляем родителя о необходимости обновления
    // Не вызываем onSuccess, так как файлы не меняют данные самого сотрудника
    // Обновление таблицы происходит в родительском компоненте автоматически
  };

  const { requiredFieldsByTab, computeValidation, requiresPatent } =
    useEmployeeTabsValidation({
      form,
      getFieldProps,
      passportType,
      selectedCitizenship,
    });

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
              const validation = computeValidation(citizenship);
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
    computeValidation,
    fetchConstructionSites,
    form,
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

  const updateSelectedCitizenship = (citizenshipId) => {
    const citizenship = citizenships.find((c) => c.id === citizenshipId);
    setSelectedCitizenship(citizenship || null);
  };

  const handleCitizenshipChange = (citizenshipId) => {
    updateSelectedCitizenship(citizenshipId);
    // Валидация запустится автоматически через handleFieldsChange
  };

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

  // Проверяем, заполнены ли все обязательные поля на вкладке
  // Проверяем, все ли вкладки валидны
  const allTabsValid = () => {
    // Проверяем только те вкладки, которые существуют в requiredFieldsByTab
    const requiredTabs = Object.keys(requiredFieldsByTab);
    return requiredTabs.every((tabKey) => tabsValidation[tabKey] === true);
  };

  // Обработчик изменения полей формы
  const handleFieldsChange = (_changedFields) => {
    if (!dataLoaded) {
      return; // Не запускаем валидацию, пока данные не загружены
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
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
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
      if (!employee) {
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
      setLoading(false);
    }
  };

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
      formattedValues = applyLinkingModePayload(
        formattedValues,
        employee,
        linkingMode,
      );

      await onSuccess(formattedValues);

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
