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
import { useEffect, useMemo, useState, useRef } from "react";
import { useEmployeeForm } from "./useEmployeeForm";
import { employeeStatusService } from "../../services/employeeStatusService";
import { counterpartyService } from "../../services/counterpartyService";
import { invalidateCache } from "../../utils/requestCache";
import {
  capitalizeFirstLetter,
  filterCyrillicOnly,
} from "../../utils/formatters";
import EmployeeDocumentUpload from "./EmployeeDocumentUpload";
import dayjs from "dayjs";

const { Title, Text } = Typography;
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

const useAntiAutofillIds = () => ({
  lastName: `employee_last_${Math.random().toString(36).slice(2, 9)}`,
  firstName: `employee_first_${Math.random().toString(36).slice(2, 9)}`,
  middleName: `employee_middle_${Math.random().toString(36).slice(2, 9)}`,
  phone: `employee_phone_${Math.random().toString(36).slice(2, 9)}`,
  registrationAddress: `employee_reg_addr_${Math.random().toString(36).slice(2, 9)}`,
});

const useSelectAutoFillBlocker = (wrapperId) => {
  useEffect(() => {
    if (!wrapperId) return;
    let inputNode = null;
    let intervalId = null;

    const setupInput = () => {
      const wrapper = document.getElementById(wrapperId);
      if (!wrapper) return false;
      const input = wrapper.querySelector(".ant-select-selection-search-input");
      if (!input) return false;
      inputNode = input;
      const handleFocus = () => {
        input.setAttribute("readonly", "readonly");
        setTimeout(() => {
          input.removeAttribute("readonly");
        }, 120);
      };
      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("data-form-type", "other");
      input.setAttribute("data-lpignore", "true");
      input.addEventListener("focus", handleFocus);

      inputNode.__cleanupAutofill = () => {
        input.removeEventListener("focus", handleFocus);
      };

      return true;
    };

    if (!setupInput()) {
      intervalId = window.setInterval(() => {
        if (setupInput()) {
          clearInterval(intervalId);
        }
      }, 150);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (inputNode && inputNode.__cleanupAutofill) {
        inputNode.__cleanupAutofill();
      }
    };
  }, [wrapperId]);
};

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

// Функция для удаления форматирования российского паспорта перед отправкой
// Возвращает формат XXXXXXXXXXXX (10 цифр без пробелов и №)
const normalizeRussianPassportNumber = (value) => {
  if (!value) return value;
  // Убираем пробелы и символ №, оставляем только цифры
  return value.replace(/[\s№]/g, "");
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
    constructionSites,
    positions,
    selectedCitizenship,
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
  const antiAutofillIds = useMemo(() => useAntiAutofillIds(), []);

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
  }, [employee?.id, citizenships.length, positions.length]);

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
  }, [user?.counterpartyId, employee?.id]);

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
            <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
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
              onChange={(value) => {
                // После выбора просто устанавливаем значение в форму
                // Form.Item сам срабатит на onChange
              }}
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

  // Блок 2: Документы
  collapseItems.push({
    key: "documents",
    label: (
      <Title level={5} style={{ margin: 0 }}>
        📄 Документы
      </Title>
    ),
    children: (
      <>
        {!getFieldProps("snils").hidden && (
          <Form.Item
            label="СНИЛС"
            name="snils"
            required={getFieldProps("snils").required}
            rules={[
              ...getFieldProps("snils").rules,
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const digits = value.replace(/[^\d]/g, "");
                  if (digits.length === 11) return Promise.resolve();
                  return Promise.reject(
                    new Error("СНИЛС должен содержать 11 цифр"),
                  );
                },
              },
            ]}
            getValueFromEvent={(e) => formatSnils(e.target.value)}
          >
            <Input
              placeholder="123-456-789 00"
              size="large"
              {...noAutoFillProps}
            />
          </Form.Item>
        )}

        {requiresPatent && !getFieldProps("kig").hidden && (
          <Form.Item
            label="КИГ (Карта иностранного гражданина)"
            name="kig"
            required={getFieldProps("kig").required}
            rules={[
              ...getFieldProps("kig").rules,
              {
                pattern: /^[A-Z]{2}\s?\d{7}$/i,
                message: "КИГ должен быть в формате: AF 1234567",
              },
            ]}
            getValueFromEvent={(e) => formatKig(e.target.value)}
          >
            <Input
              placeholder="AF 1234567"
              size="large"
              maxLength={10}
              {...noAutoFillProps}
            />
          </Form.Item>
        )}

        {requiresPatent && !getFieldProps("kigEndDate").hidden && (
          <Form.Item
            label="Дата окончания КИГ"
            name="kigEndDate"
            required={getFieldProps("kigEndDate").required}
            rules={[
              ...getFieldProps("kigEndDate").rules,
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
                  } catch (e) {
                    return Promise.reject(new Error("Некорректная дата"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            normalize={(value) => {
              if (!value) return value;
              if (typeof value === "string") return value;
              if (value && value.format) return value.format(DATE_FORMAT);
              return value;
            }}
          >
            <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
          </Form.Item>
        )}

        {!getFieldProps("passportType").hidden && (
          <Form.Item
            label="Тип паспорта"
            name="passportType"
            required={getFieldProps("passportType").required}
            rules={getFieldProps("passportType").rules}
          >
            <Select
              placeholder="Выберите тип паспорта"
              size="large"
              onChange={(value) => setPassportType(value)}
              autoComplete="off"
            >
              <Option value="russian">Российский</Option>
              <Option value="foreign">Иностранного гражданина</Option>
            </Select>
          </Form.Item>
        )}

        {!getFieldProps("passportNumber").hidden && (
          <Form.Item
            label="Паспорт (серия и номер)"
            name="passportNumber"
            required={getFieldProps("passportNumber").required}
            rules={getFieldProps("passportNumber").rules}
            getValueFromEvent={(e) => {
              if (passportType === "russian") {
                return formatRussianPassportNumber(e.target.value);
              }
              return e.target.value;
            }}
          >
            <Input
              placeholder={
                passportType === "russian" ? "1234 №123456" : "Номер паспорта"
              }
              size="large"
              maxLength={passportType === "russian" ? 13 : undefined}
              {...noAutoFillProps}
            />
          </Form.Item>
        )}

        {!getFieldProps("passportDate").hidden && (
          <Form.Item
            label="Дата выдачи паспорта"
            name="passportDate"
            required={getFieldProps("passportDate").required}
            rules={[
              ...getFieldProps("passportDate").rules,
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
                  } catch (e) {
                    return Promise.reject(new Error("Некорректная дата"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            normalize={(value) => {
              if (!value) return value;
              if (typeof value === "string") return value;
              if (value && value.format) return value.format(DATE_FORMAT);
              return value;
            }}
          >
            <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
          </Form.Item>
        )}

        {passportType === "foreign" &&
          !getFieldProps("passportExpiryDate").hidden && (
            <Form.Item
              label="Дата окончания паспорта"
              name="passportExpiryDate"
              required={getFieldProps("passportExpiryDate").required}
              rules={getFieldProps("passportExpiryDate").rules}
            >
              <Input
                placeholder="ДД.ММ.ГГГГ"
                size="large"
                {...noAutoFillProps}
              />
            </Form.Item>
          )}

        {!getFieldProps("passportIssuer").hidden && (
          <Form.Item
            label="Кем выдан паспорт"
            name="passportIssuer"
            required={getFieldProps("passportIssuer").required}
            rules={getFieldProps("passportIssuer").rules}
          >
            <TextArea
              placeholder="Наименование органа выдачи"
              rows={3}
              size="large"
              {...noAutoFillProps}
            />
          </Form.Item>
        )}

        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <Text strong>Фото и файлы документов</Text>
        </div>

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="passport"
          label="Паспорт"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="consent"
          label="Согласие на обработку персональных данных"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="biometric_consent"
          label="Согласие на перс.дан. Генподряд"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="biometric_consent_developer"
          label="Согласие на перс.дан. Застройщ"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="bank_details"
          label="Реквизиты счета"
          readonly={false}
          multiple={true}
        />

        {requiresPatent && (
          <>
            <EmployeeDocumentUpload
              employeeId={employee?.id}
              ensureEmployeeId={ensureEmployeeId}
              documentType="kig"
              label="КИГ (Карта иностранного гражданина)"
              readonly={false}
              multiple={true}
            />

            <EmployeeDocumentUpload
              employeeId={employee?.id}
              ensureEmployeeId={ensureEmployeeId}
              documentType="patent_front"
              label="Патент лицевая сторона (с фото)"
              readonly={false}
              multiple={false}
            />

            <EmployeeDocumentUpload
              employeeId={employee?.id}
              ensureEmployeeId={ensureEmployeeId}
              documentType="patent_back"
              label="Патент задняя сторона"
              readonly={false}
              multiple={false}
            />

            <EmployeeDocumentUpload
              employeeId={employee?.id}
              ensureEmployeeId={ensureEmployeeId}
              documentType="patent_payment_receipt"
              label="Чек об оплате патента"
              readonly={false}
              multiple={true}
            />
          </>
        )}

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="diploma"
          label="Диплом / Документ об образовании"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="med_book"
          label="Мед.книжка"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="migration_card"
          label="Миграционная карта"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="arrival_notice"
          label="Уведомление о прибытии (регистрация)"
          readonly={false}
          multiple={true}
        />

        <EmployeeDocumentUpload
          employeeId={employee?.id}
          ensureEmployeeId={ensureEmployeeId}
          documentType="mvd_notification"
          label="Уведомление МВД"
          readonly={false}
          multiple={true}
        />
      </>
    ),
  });

  // Блок 3: Патент (если требуется)
  if (requiresPatent) {
    collapseItems.push({
      key: "patent",
      label: (
        <Title level={5} style={{ margin: 0 }}>
          📑 Патент
        </Title>
      ),
      children: (
        <>
          {!getFieldProps("patentNumber").hidden && (
            <Form.Item
              label="Номер патента"
              name="patentNumber"
              required={getFieldProps("patentNumber").required}
              rules={[
                ...getFieldProps("patentNumber").rules,
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const digits = value.replace(/[^\d]/g, "");
                    if (digits.length === 12) return Promise.resolve();
                    return Promise.reject(
                      new Error("Номер патента должен содержать 12 цифр"),
                    );
                  },
                },
              ]}
              getValueFromEvent={(e) => formatPatentNumber(e.target.value)}
            >
              <Input
                placeholder="01 №1234567890"
                size="large"
                {...noAutoFillProps}
              />
            </Form.Item>
          )}

          {!getFieldProps("patentIssueDate").hidden && (
            <Form.Item
              label="Дата выдачи патента"
              name="patentIssueDate"
              required={getFieldProps("patentIssueDate").required}
              rules={[
                ...getFieldProps("patentIssueDate").rules,
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
                    } catch (e) {
                      return Promise.reject(new Error("Некорректная дата"));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              normalize={(value) => {
                if (!value) return value;
                if (typeof value === "string") return value;
                if (value && value.format) return value.format(DATE_FORMAT);
                return value;
              }}
            >
              <Input
                placeholder="ДД.ММ.ГГГГ"
                size="large"
                {...noAutoFillProps}
              />
            </Form.Item>
          )}

          {!getFieldProps("blankNumber").hidden && (
            <Form.Item
              label="Номер бланка"
              name="blankNumber"
              required={getFieldProps("blankNumber").required}
              rules={[
                ...getFieldProps("blankNumber").rules,
                {
                  pattern: /^[А-ЯЁ]{2}\d{7}$/,
                  message: "Номер бланка должен быть в формате: ПР1234567",
                },
              ]}
              getValueFromEvent={(e) => formatBlankNumber(e.target.value)}
            >
              <Input
                placeholder="ПР1234567"
                size="large"
                maxLength={9}
                {...noAutoFillProps}
              />
            </Form.Item>
          )}
        </>
      ),
    });
  }

  // Блок 4: Контрагент (без галочки в label, не участвует в проверке обязательных полей)
  collapseItems.push({
    key: "counterparty",
    label: (
      <Title level={5} style={{ margin: 0 }}>
        🏢 Контрагент
      </Title>
    ),
    children: (
      <>
        <Form.Item
          label="Контрагент"
          name="counterpartyId"
          required
          rules={[
            {
              required: true,
              message: "Выберите контрагента",
            },
          ]}
        >
          <Select
            placeholder="Выберите контрагента"
            size="large"
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
            loading={loadingCounterparties}
            disabled={
              loadingCounterparties || availableCounterparties.length === 0
            }
            autoComplete="off"
          >
            {availableCounterparties.map((cp) => (
              <Option key={cp.id} value={cp.id}>
                {cp.name} {cp.inn && `(ИНН: ${cp.inn})`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {availableCounterparties.length === 0 && !loadingCounterparties && (
          <div
            style={{
              padding: 16,
              background: "#f5f5f5",
              borderRadius: 4,
              textAlign: "center",
              color: "#8c8c8c",
            }}
          >
            📝 Нет доступных контрагентов
          </div>
        )}
      </>
    ),
  });

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
          onFieldsChange={(changedFields) => {
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
