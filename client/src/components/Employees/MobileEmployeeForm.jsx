import { Form, Button, Collapse, App } from "antd";
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
import { buildMobileDocumentSections } from "./MobileEmployeeDocumentSections";
import { buildMobilePrimarySections } from "./MobileEmployeePrimarySections";
import {
  OCR_DOC_TYPE_LABELS,
  formatRussianPassportNumber,
  normalizeString,
  isEmptyFormValue,
  toDisplayName,
  mapOcrSexToFormGender,
  resolveCitizenshipIdByOcrCode,
  parseOcrRawJson,
  resolvePassportNumberPartsFromOcr,
  formatDateForMobileForm,
  formatPassportNumberForMobileForm,
  getOcrSourceDocumentType,
} from "./mobileEmployeeOcrUtils";

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
      let ocrDocumentType = getOcrSourceDocumentType({ documentType });

      if (
        ocrDocumentType === "passport_rf" &&
        currentPassportType === "foreign"
      ) {
        ocrDocumentType = "foreign_passport";
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

  const executeStatusAction = useCallback(
    async ({
      request,
      setLoadingState,
      successMessage,
      fallbackErrorMessage,
      logPrefix,
    }) => {
      if (!employee?.id) {
        return;
      }
      try {
        setLoadingState(true);
        await request(employee.id);
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(successMessage);
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error(logPrefix, error);
        messageApi.error(fallbackErrorMessage);
      } finally {
        setLoadingState(false);
      }
    },
    [employee?.id, messageApi, onCancel],
  );

  const handleFire = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.fireEmployee,
        setLoadingState: setFireLoading,
        successMessage: `Сотрудник ${employee.lastName} ${employee.firstName} уволен`,
        fallbackErrorMessage: "Ошибка при увольнении сотрудника",
        logPrefix: "Error firing employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  const handleReinstate = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.reinstateEmployee,
        setLoadingState: setActivateLoading,
        successMessage: `Сотрудник ${employee.lastName} ${employee.firstName} восстановлен`,
        fallbackErrorMessage: "Ошибка при восстановлении сотрудника",
        logPrefix: "Error reinstating employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  const handleDeactivate = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.deactivateEmployee,
        setLoadingState: setFireLoading,
        successMessage: `Сотрудник ${employee.lastName} ${employee.firstName} деактивирован`,
        fallbackErrorMessage: "Ошибка при деактивации сотрудника",
        logPrefix: "Error deactivating employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  const handleActivate = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.activateEmployee,
        setLoadingState: setActivateLoading,
        successMessage: `Сотрудник ${employee.lastName} ${employee.firstName} активирован`,
        fallbackErrorMessage: "Ошибка при активации сотрудника",
        logPrefix: "Error activating employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  const collapseItems = [
    ...buildMobilePrimarySections({
      employee,
      user,
      defaultCounterpartyId,
      fireLoading,
      activateLoading,
      onFire: handleFire,
      onReinstate: handleReinstate,
      onDeactivate: handleDeactivate,
      onActivate: handleActivate,
      getFieldProps,
      formatInn,
      handleInnBlur,
      noAutoFillProps,
      latinInputError,
      antiAutofillIds,
      handleFullNameChange,
      loadingReferences,
      positions,
      citizenships,
      handleCitizenshipChange,
      formatPhoneNumber,
    }),
  ];

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
