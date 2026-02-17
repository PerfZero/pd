import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  ClearOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import mvdService from "../services/mvdService";
import ocrService from "../services/ocrService";

const { Text, Title } = Typography;

const RUN_MODE_MANUAL = "manual";
const RUN_MODE_OCR = "ocr";
const EMPTY_ARRAY = [];

const OCR_DOC_TYPE_OPTIONS = [
  { value: "passport_rf", label: "Паспорт РФ" },
  { value: "foreign_passport", label: "Паспорт иностранного гражданина" },
  { value: "patent", label: "Патент" },
  { value: "visa", label: "Виза" },
  { value: "kig", label: "КИГ" },
];

const OCR_REQUIRED_FIELDS_BY_TYPE = {
  passport_rf: [
    "lastName",
    "firstName",
    "middleName",
    "birthDate",
    "sex",
    "citizenship",
    "passportSeries",
    "passportNumber",
    "passportIssuedAt",
    "passportIssuedBy",
  ],
  foreign_passport: [
    "lastName",
    "firstName",
    "birthDate",
    "sex",
    "citizenship",
    "passportNumber",
    "passportIssuedAt",
    "passportExpiryDate",
  ],
  patent: [
    "patentNumber",
    "patentIssueDate",
    "patentExpiryDate",
    "lastName",
    "firstName",
    "birthDate",
    "citizenship",
  ],
  visa: [
    "visaNumber",
    "visaIssueDate",
    "visaExpiryDate",
    "lastName",
    "firstName",
    "birthDate",
    "citizenship",
  ],
  kig: [
    "kigNumber",
    "kigExpiryDate",
    "lastName",
    "firstName",
    "birthDate",
    "citizenship",
  ],
};

const OCR_FIELD_LABELS = {
  lastName: "Фамилия",
  firstName: "Имя",
  middleName: "Отчество",
  birthDate: "Дата рождения",
  sex: "Пол",
  citizenship: "Гражданство",
  passportSeries: "Серия паспорта",
  passportNumber: "Номер паспорта",
  passportIssuedAt: "Дата выдачи паспорта",
  passportIssuedBy: "Кем выдан паспорт",
  passportExpiryDate: "Дата окончания паспорта",
  patentNumber: "Номер патента",
  patentIssueDate: "Дата выдачи патента",
  patentExpiryDate: "Дата окончания патента",
  visaNumber: "Номер визы",
  visaIssueDate: "Дата выдачи визы",
  visaExpiryDate: "Дата окончания визы",
  kigNumber: "Номер КИГ",
  kigExpiryDate: "Дата окончания КИГ",
};

const MVD_TYPE_LABELS = {
  rkl: "РКЛ",
  rklv2: "РКЛ v2",
  patent: "Патент",
  patentv2: "Патент v2",
  wanted: "Розыск",
  chekpassportv2: "Проверка паспорта v2",
};

const MVD_PARAM_LABELS = {
  fio: "ФИО",
  birthdate: "Дата рождения",
  docnum: "Номер документа",
  docdate: "Дата документа",
  docseria: "Серия документа",
  docnumber: "Номер документа",
  blankseria: "Серия бланка",
  blanknumber: "Номер бланка",
  lbg: "ЛБГ / код подразделения",
  lastname: "Фамилия",
  firstname: "Имя",
  seria: "Серия паспорта",
  nomer: "Номер паспорта",
};

const PASSPORT_RESULT_LABELS = {
  VALID: "Паспорт действителен",
  NOT_VALID: "Паспорт недействителен",
  NOT_FOUND: "Паспорт не найден",
};

const LEGACY_PASSPORT_REZULTAT_LABELS = {
  4: "Паспорт недействителен (заменен на новый)",
  5: "Паспорт недействителен (в связи со смертью владельца)",
  6: "Паспорт недействителен (числится в розыске)",
};

const normalizeString = (value) => String(value || "").trim();
const hasValue = (value) => normalizeString(value) !== "";

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return normalizeString(value) === "";
  return false;
};

const formatDateForMvd = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) return "";
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return dayjs(normalized).format("DD.MM.YYYY");
  }
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed.format("DD.MM.YYYY") : normalized;
};

const getOcrResponseData = (response = {}) => response?.data || response || {};

const getOcrNormalized = (response = {}) =>
  response?.data?.normalized ||
  response?.normalized ||
  response?.data?.data?.normalized ||
  {};

const getOcrRaw = (response = {}) =>
  response?.data?.raw || response?.raw || response?.data?.data?.raw || null;

const getMvdResponseData = (response = {}) =>
  response?.data || response || null;

const getOcrDocLabel = (documentType) => {
  const option = OCR_DOC_TYPE_OPTIONS.find(
    (item) => item.value === documentType,
  );
  return option?.label || documentType || "—";
};

const buildMvdParamsFromOcr = (checkType, normalized = {}) => {
  const lastName = normalizeString(normalized.lastName);
  const firstName = normalizeString(normalized.firstName);
  const middleName = normalizeString(normalized.middleName);
  const birthDate = formatDateForMvd(normalized.birthDate);
  const passportSeries = normalizeString(normalized.passportSeries).replace(
    /\D/g,
    "",
  );
  const passportNumber = normalizeString(normalized.passportNumber).replace(
    /\D/g,
    "",
  );
  const passportIssuedAt = formatDateForMvd(normalized.passportIssuedAt);
  const passportDocNum = `${passportSeries}${passportNumber}`.slice(0, 10);
  const patentNumber = normalizeString(normalized.patentNumber).replace(
    /\D/g,
    "",
  );

  if (checkType === "wanted") {
    return {
      lastname: lastName,
      firstname: firstName,
      birthdate: birthDate,
    };
  }

  if (checkType === "chekpassportv2") {
    return {
      seria: passportSeries,
      nomer: passportNumber,
      lastname: lastName,
      firstname: firstName,
    };
  }

  if (checkType === "rkl" || checkType === "rklv2") {
    return {
      fio: [lastName, firstName, middleName].filter(Boolean).join(" "),
      birthdate: birthDate,
      docnum: passportDocNum,
      docdate: passportIssuedAt,
    };
  }

  if (checkType === "patent" || checkType === "patentv2") {
    return {
      docseria: patentNumber.slice(0, 2),
      docnumber: patentNumber.slice(2),
      blankseria: "",
      blanknumber: "",
      lbg: "",
    };
  }

  return {};
};

const statusTag = (status) => {
  if (status === "ok") return <Tag color="green">OK</Tag>;
  if (status === "partial") return <Tag color="gold">Частично</Tag>;
  if (status === "missing_params")
    return <Tag color="orange">Нет параметров</Tag>;
  if (status === "error") return <Tag color="red">Ошибка</Tag>;
  if (status === "skipped") return <Tag>Пропущен</Tag>;
  return <Tag>—</Tag>;
};

const foundTag = (found) => {
  if (found === true) return <Tag color="red">Найден</Tag>;
  if (found === false) return <Tag color="green">Не найден</Tag>;
  return <Tag>—</Tag>;
};

const extractMvdResultBody = (responsePayload) => {
  if (!responsePayload || typeof responsePayload !== "object") {
    return null;
  }

  const nestedResult = responsePayload?.result;
  if (
    nestedResult &&
    typeof nestedResult === "object" &&
    !Array.isArray(nestedResult)
  ) {
    return nestedResult;
  }

  return responsePayload;
};

const formatMvdInquirySummary = (inquiry) => {
  if (!inquiry || typeof inquiry !== "object" || Array.isArray(inquiry)) {
    return "";
  }

  const parts = [];
  if (hasValue(inquiry.price)) parts.push(`Списание: ${inquiry.price}`);
  if (hasValue(inquiry.balance)) parts.push(`Баланс: ${inquiry.balance}`);
  if (hasValue(inquiry.attempts)) parts.push(`Попытки: ${inquiry.attempts}`);
  if (hasValue(inquiry.speed)) parts.push(`Скорость: ${inquiry.speed}`);
  return parts.join(" • ");
};

const humanizeMvdResult = ({ mvdType, responsePayload, mvdError }) => {
  if (mvdError) {
    return {
      humanSummary: mvdError,
      providerStatus: null,
      inquirySummary: "",
    };
  }

  const responseBody = extractMvdResultBody(responsePayload);
  if (!responseBody) {
    return {
      humanSummary: "Нет данных ответа от МВД",
      providerStatus: null,
      inquirySummary: "",
    };
  }

  const providerStatus = Number(responseBody.status) || null;
  const providerError = normalizeString(
    responseBody.errormsg || responseBody.message || responseBody.error,
  );
  const type = normalizeString(mvdType || responsePayload?.type).toLowerCase();
  let humanSummary = "";

  if (providerStatus && providerStatus !== 200) {
    if (responseBody.error === "TIME_MAX_CONNECT") {
      humanSummary =
        "Источник МВД не вернул ответ за максимальное число попыток (TIME_MAX_CONNECT)";
    } else {
      humanSummary = providerError
        ? `Ошибка источника МВД (${providerStatus}): ${providerError}`
        : `Ошибка источника МВД (${providerStatus})`;
    }

    return {
      humanSummary,
      providerStatus,
      inquirySummary: formatMvdInquirySummary(responseBody.inquiry),
    };
  }

  switch (type) {
    case "rkl":
    case "rklv2":
      if (responseBody.found === true) {
        humanSummary = "Лицо найдено в реестре контролируемых лиц";
      } else if (responseBody.found === false) {
        humanSummary = "Лицо не найдено в реестре контролируемых лиц";
      }
      break;
    case "wanted":
      if (responseBody.found === true) {
        const countFromApi = Number(responseBody.count);
        const listCount = Array.isArray(responseBody.result)
          ? responseBody.result.length
          : null;
        const count = Number.isFinite(countFromApi) ? countFromApi : listCount;
        humanSummary = Number.isFinite(count)
          ? `Лицо найдено в базе розыска (совпадений: ${count})`
          : "Лицо найдено в базе розыска";
      } else if (responseBody.found === false) {
        humanSummary = "Лицо не найдено в базе розыска";
      }
      break;
    case "patent":
    case "patentv2": {
      const statusPatent = normalizeString(responseBody.statusPatent);
      if (responseBody.found === false) {
        humanSummary = "Патент не найден";
      } else if (responseBody.found === true && responseBody.valid === true) {
        humanSummary = "Патент найден и действителен";
      } else if (responseBody.found === true && responseBody.valid === false) {
        humanSummary = "Патент найден, но недействителен";
      }
      if (statusPatent) {
        humanSummary = humanSummary
          ? `${humanSummary} (${statusPatent})`
          : `Статус патента: ${statusPatent}`;
      }
      break;
    }
    case "chekpassportv2": {
      const passportResult = normalizeString(responseBody.result).toUpperCase();
      if (PASSPORT_RESULT_LABELS[passportResult]) {
        humanSummary = PASSPORT_RESULT_LABELS[passportResult];
      }
      if (!humanSummary && hasValue(responseBody.rezultat)) {
        humanSummary =
          LEGACY_PASSPORT_REZULTAT_LABELS[responseBody.rezultat] ||
          `Код результата: ${responseBody.rezultat}`;
      }
      break;
    }
    default:
      break;
  }

  const description = normalizeString(
    responseBody.description || responseBody.info,
  );

  if (!humanSummary && providerError) {
    humanSummary = providerError;
  }
  if (!humanSummary && description) {
    humanSummary = description;
  }
  if (!humanSummary) {
    humanSummary = providerStatus
      ? `Запрос обработан (status ${providerStatus})`
      : "Ответ от МВД получен";
  }
  if (description && !humanSummary.includes(description)) {
    humanSummary = `${humanSummary}. ${description}`;
  }

  return {
    humanSummary,
    providerStatus,
    inquirySummary: formatMvdInquirySummary(responseBody.inquiry),
  };
};

const mapRunToRow = (run) => {
  const responsePayload = run.mvdResult || null;
  const responseBody = extractMvdResultBody(responsePayload);
  const { humanSummary, providerStatus, inquirySummary } = humanizeMvdResult({
    mvdType: run.mvdType,
    responsePayload,
    mvdError: run.mvdError,
  });

  const mode =
    normalizeString(run.documentType) === "mvd_manual"
      ? RUN_MODE_MANUAL
      : RUN_MODE_OCR;

  return {
    key:
      run.id ||
      run.key ||
      `${run.startedAt || Date.now()}-${run.fileName || "run"}`,
    id: run.id || null,
    mode,
    startedAt: run.startedAt || run.createdAt || new Date().toISOString(),
    fileName: run.fileName || "-",
    documentType: run.documentType || null,
    employeeId: run.employeeId || null,
    promptUsed: run.promptUsed || null,
    modelUsed: run.modelUsed || null,
    ocrStatus: run.ocrStatus || null,
    ocrMissingFields: Array.isArray(run.ocrMissingFields)
      ? run.ocrMissingFields
      : [],
    ocrNormalized: run.ocrNormalized || null,
    ocrRaw: run.ocrRaw || null,
    ocrError: run.ocrError || null,
    ocrProvider: run.ocrProvider || null,
    mvdType: run.mvdType || null,
    mvdStatus: run.mvdStatus || null,
    found: responseBody?.found,
    providerStatus,
    humanSummary,
    inquirySummary,
    requestPayload: {
      type: run.mvdType || null,
      params: run.mvdParams || {},
    },
    mvdParams: run.mvdParams || null,
    mvdMissingParams: Array.isArray(run.mvdMissingParams)
      ? run.mvdMissingParams
      : [],
    responsePayload,
    mvdError: run.mvdError || null,
  };
};

const OcrMvdTestPage = () => {
  const { message } = App.useApp();

  const [activeTab, setActiveTab] = useState(RUN_MODE_MANUAL);

  const [mvdTypes, setMvdTypes] = useState([]);
  const [mvdMetaLoading, setMvdMetaLoading] = useState(false);

  const [manualMvdType, setManualMvdType] = useState(null);
  const [manualParams, setManualParams] = useState({});
  const [manualRunning, setManualRunning] = useState(false);

  const [ocrDocumentType, setOcrDocumentType] = useState("passport_rf");
  const [ocrMvdType, setOcrMvdType] = useState(null);
  const [ocrFileList, setOcrFileList] = useState([]);
  const [ocrRunning, setOcrRunning] = useState(false);

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const manualMeta = useMemo(
    () => mvdTypes.find((item) => item.type === manualMvdType) || null,
    [manualMvdType, mvdTypes],
  );

  const ocrMeta = useMemo(
    () => mvdTypes.find((item) => item.type === ocrMvdType) || null,
    [ocrMvdType, mvdTypes],
  );

  const manualRequiredParams = useMemo(
    () => manualMeta?.requiredParams || EMPTY_ARRAY,
    [manualMeta],
  );
  const ocrRequiredMvdParams = useMemo(
    () => ocrMeta?.requiredParams || EMPTY_ARRAY,
    [ocrMeta],
  );

  const manualRows = useMemo(
    () => rows.filter((item) => item.mode === RUN_MODE_MANUAL),
    [rows],
  );

  const ocrRows = useMemo(
    () => rows.filter((item) => item.mode === RUN_MODE_OCR),
    [rows],
  );

  useEffect(() => {
    setManualParams((prev) => {
      const next = {};
      for (const key of manualRequiredParams) {
        if (hasValue(prev[key])) {
          next[key] = prev[key];
        }
      }
      return next;
    });
  }, [manualRequiredParams]);

  const fetchMvdMeta = useCallback(async () => {
    try {
      setMvdMetaLoading(true);
      const response = await mvdService.getMeta();
      const supported = response?.data?.supportedTypes || [];
      setMvdTypes(supported);
    } catch (error) {
      message.error(error?.userMessage || "Не удалось загрузить типы МВД");
    } finally {
      setMvdMetaLoading(false);
    }
  }, [message]);

  const fetchHistory = useCallback(async () => {
    try {
      setRowsLoading(true);
      const response = await ocrService.listDebugRuns({ limit: 300 });
      const runs = response?.data?.runs || [];
      setRows(Array.isArray(runs) ? runs.map(mapRunToRow) : []);
    } catch (error) {
      message.error(error?.userMessage || "Не удалось загрузить историю");
    } finally {
      setRowsLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchMvdMeta();
    fetchHistory();
  }, [fetchMvdMeta, fetchHistory]);

  const runManualMvdCheck = async () => {
    if (!manualMvdType) {
      message.warning("Выберите тип проверки МВД");
      return;
    }

    const normalizedParams = Object.entries(manualParams).reduce(
      (acc, [key, value]) => {
        const normalized = normalizeString(value);
        if (normalized) acc[key] = normalized;
        return acc;
      },
      {},
    );

    const missing = manualRequiredParams.filter(
      (key) => !normalizedParams[key],
    );
    if (missing.length) {
      message.warning(
        `Заполните обязательные поля: ${missing
          .map((key) => MVD_PARAM_LABELS[key] || key)
          .join(", ")}`,
      );
      return;
    }

    setManualRunning(true);
    const startedAt = new Date().toISOString();

    try {
      const response = await mvdService.check({
        type: manualMvdType,
        params: normalizedParams,
      });

      const payloadToSave = {
        startedAt,
        fileName: "manual_mvd_check",
        documentType: "mvd_manual",
        promptUsed: null,
        modelUsed: null,
        ocrStatus: "skipped",
        ocrMissingFields: [],
        ocrNormalized: null,
        ocrRaw: null,
        ocrError: null,
        ocrProvider: null,
        mvdType: manualMvdType,
        mvdStatus: "ok",
        mvdParams: normalizedParams,
        mvdMissingParams: [],
        mvdResult: getMvdResponseData(response),
        mvdError: null,
      };

      const persisted = await ocrService.createDebugRun(payloadToSave);
      const persistedRun = persisted?.data || payloadToSave;
      setRows((prev) => [mapRunToRow(persistedRun), ...prev]);
      message.success("Проверка МВД выполнена");
    } catch (error) {
      const payloadToSave = {
        startedAt,
        fileName: "manual_mvd_check",
        documentType: "mvd_manual",
        promptUsed: null,
        modelUsed: null,
        ocrStatus: "skipped",
        ocrMissingFields: [],
        ocrNormalized: null,
        ocrRaw: null,
        ocrError: null,
        ocrProvider: null,
        mvdType: manualMvdType,
        mvdStatus: "error",
        mvdParams: normalizedParams,
        mvdMissingParams: [],
        mvdResult: error?.response?.data || null,
        mvdError: error?.userMessage || "Не удалось выполнить проверку МВД",
      };

      try {
        const persisted = await ocrService.createDebugRun(payloadToSave);
        const persistedRun = persisted?.data || payloadToSave;
        setRows((prev) => [mapRunToRow(persistedRun), ...prev]);
      } catch {
        setRows((prev) => [mapRunToRow(payloadToSave), ...prev]);
      }

      message.error(error?.userMessage || "Не удалось выполнить проверку МВД");
    } finally {
      setManualRunning(false);
    }
  };

  const runOcrBatch = async () => {
    if (ocrFileList.length === 0) {
      message.warning("Добавьте хотя бы один файл");
      return;
    }

    setOcrRunning(true);
    let successCount = 0;
    try {
      for (const uploadFile of ocrFileList) {
        const startedAt = new Date().toISOString();
        const fileName = uploadFile?.name || "uploaded_file";
        const fileObj = uploadFile?.originFileObj;

        const rowPayload = {
          startedAt,
          fileName,
          documentType: ocrDocumentType,
          employeeId: null,
          promptUsed: null,
          modelUsed: null,
          ocrStatus: "error",
          ocrMissingFields: [],
          ocrNormalized: null,
          ocrRaw: null,
          ocrError: null,
          ocrProvider: null,
          mvdType: ocrMvdType || null,
          mvdStatus: ocrMvdType ? "missing_params" : null,
          mvdParams: null,
          mvdMissingParams: [],
          mvdResult: null,
          mvdError: null,
        };

        try {
          if (!fileObj) {
            throw new Error("Файл не подготовлен для отправки");
          }

          const response = await ocrService.recognizeDocument({
            documentType: ocrDocumentType,
            file: fileObj,
          });

          const ocrEnvelope = getOcrResponseData(response);
          const ocrNormalized = getOcrNormalized(response);
          const ocrRaw = getOcrRaw(response);

          const expectedOcrFields =
            OCR_REQUIRED_FIELDS_BY_TYPE[ocrDocumentType] || [];
          const missingOcrFields = expectedOcrFields.filter((fieldKey) =>
            isEmptyValue(ocrNormalized?.[fieldKey]),
          );

          rowPayload.ocrStatus =
            missingOcrFields.length === 0 ? "ok" : "partial";
          rowPayload.ocrMissingFields = missingOcrFields;
          rowPayload.ocrNormalized = ocrNormalized;
          rowPayload.ocrRaw = ocrRaw;
          rowPayload.ocrProvider = ocrEnvelope?.provider || null;

          if (ocrMvdType) {
            const mvdParams = buildMvdParamsFromOcr(ocrMvdType, ocrNormalized);
            const missingMvdParams = ocrRequiredMvdParams.filter((paramKey) =>
              isEmptyValue(mvdParams[paramKey]),
            );

            rowPayload.mvdParams = mvdParams;
            rowPayload.mvdMissingParams = missingMvdParams;

            if (missingMvdParams.length > 0) {
              rowPayload.mvdStatus = "missing_params";
            } else {
              try {
                const mvdResponse = await mvdService.check({
                  type: ocrMvdType,
                  params: mvdParams,
                });
                rowPayload.mvdStatus = "ok";
                rowPayload.mvdResult = getMvdResponseData(mvdResponse);
                rowPayload.mvdError = null;
              } catch (mvdError) {
                rowPayload.mvdStatus = "error";
                rowPayload.mvdError =
                  mvdError?.userMessage || "Не удалось выполнить проверку МВД";
              }
            }
          }

          successCount += 1;
        } catch (error) {
          rowPayload.ocrStatus = "error";
          rowPayload.ocrError =
            error?.userMessage || error?.message || "Ошибка OCR";
        }

        try {
          const persisted = await ocrService.createDebugRun(rowPayload);
          const persistedRun = persisted?.data || rowPayload;
          setRows((prev) => [mapRunToRow(persistedRun), ...prev]);
        } catch {
          setRows((prev) => [mapRunToRow(rowPayload), ...prev]);
        }
      }

      message.success(
        `Обработка завершена. Успешных OCR: ${successCount} из ${ocrFileList.length}`,
      );
    } finally {
      setOcrRunning(false);
    }
  };

  const clearHistory = async () => {
    try {
      await ocrService.clearDebugRuns();
      setRows([]);
      message.success("История очищена");
    } catch (error) {
      message.error(error?.userMessage || "Не удалось очистить историю");
    }
  };

  const manualColumns = [
    {
      title: "Время",
      dataIndex: "startedAt",
      width: 95,
      render: (value) => dayjs(value).format("HH:mm:ss"),
    },
    {
      title: "Тип",
      dataIndex: "mvdType",
      width: 120,
      render: (value) => MVD_TYPE_LABELS[value] || value,
    },
    {
      title: "Статус",
      dataIndex: "mvdStatus",
      width: 110,
      render: (value) => statusTag(value),
    },
    {
      title: "Результат",
      dataIndex: "found",
      width: 120,
      render: (value) => foundTag(value),
    },
    {
      title: "Код",
      dataIndex: "providerStatus",
      width: 80,
      render: (value) => value || "—",
    },
    {
      title: "Запрос",
      dataIndex: "requestPayload",
      ellipsis: true,
      render: (value) => (
        <Text ellipsis style={{ maxWidth: 320, display: "inline-block" }}>
          {JSON.stringify(value)}
        </Text>
      ),
    },
    {
      title: "Ответ (человеческий)",
      dataIndex: "humanSummary",
      ellipsis: true,
      render: (_, record) => (
        <Space size={0} direction="vertical" style={{ maxWidth: 420 }}>
          <Text ellipsis style={{ maxWidth: 420, display: "inline-block" }}>
            {record.humanSummary}
          </Text>
          {record.inquirySummary ? (
            <Text
              type="secondary"
              ellipsis
              style={{ maxWidth: 420, display: "inline-block" }}
            >
              {record.inquirySummary}
            </Text>
          ) : null}
        </Space>
      ),
    },
  ];

  const ocrColumns = [
    {
      title: "Время",
      dataIndex: "startedAt",
      width: 95,
      render: (value) => dayjs(value).format("HH:mm:ss"),
    },
    {
      title: "Файл",
      dataIndex: "fileName",
      ellipsis: true,
      width: 180,
    },
    {
      title: "OCR документ",
      dataIndex: "documentType",
      width: 180,
      render: (value) => getOcrDocLabel(value),
    },
    {
      title: "OCR",
      dataIndex: "ocrStatus",
      width: 110,
      render: (value) => statusTag(value),
    },
    {
      title: "Поля OCR",
      dataIndex: "ocrMissingFields",
      width: 230,
      render: (missingFields = []) => {
        if (!Array.isArray(missingFields) || missingFields.length === 0) {
          return <Text type="success">Все заполнены</Text>;
        }
        return (
          <Text type="warning">
            Нет:{" "}
            {missingFields
              .map((fieldKey) => OCR_FIELD_LABELS[fieldKey] || fieldKey)
              .join(", ")}
          </Text>
        );
      },
    },
    {
      title: "MVD",
      dataIndex: "mvdStatus",
      width: 120,
      render: (value) => statusTag(value),
    },
    {
      title: "Ответ МВД",
      dataIndex: "humanSummary",
      ellipsis: true,
      render: (_, record) => {
        if (!record.mvdType) {
          return <Text type="secondary">Без проверки МВД</Text>;
        }

        return (
          <Space size={0} direction="vertical" style={{ maxWidth: 400 }}>
            <Text ellipsis style={{ maxWidth: 400, display: "inline-block" }}>
              {record.humanSummary}
            </Text>
            {record.inquirySummary ? (
              <Text
                type="secondary"
                ellipsis
                style={{ maxWidth: 400, display: "inline-block" }}
              >
                {record.inquirySummary}
              </Text>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 16,
        minHeight: "100%",
      }}
    >
      <div>
        <Title level={4} style={{ marginBottom: 0 }}>
          MVD / OCR тест документов
        </Title>
        <Text type="secondary">
          Две вкладки: ручной запрос в МВД и OCR по фото с опциональной
          проверкой МВД.
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: RUN_MODE_MANUAL,
            label: "MVD (вручную)",
            children: (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card title="Параметры МВД">
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                      <Text type="secondary">Тип проверки МВД</Text>
                      <Select
                        value={manualMvdType}
                        allowClear
                        loading={mvdMetaLoading}
                        onChange={(value) => {
                          setManualMvdType(value);
                          setManualParams({});
                        }}
                        placeholder="Выберите тип"
                        style={{ width: "100%" }}
                        options={mvdTypes.map((item) => ({
                          value: item.type,
                          label: MVD_TYPE_LABELS[item.type] || item.type,
                        }))}
                      />
                    </Col>

                    {manualRequiredParams.length > 0 && (
                      <Col span={24}>
                        <Text type="secondary">
                          Обязательные параметры:{" "}
                          {manualRequiredParams
                            .map((key) => MVD_PARAM_LABELS[key] || key)
                            .join(", ")}
                        </Text>
                      </Col>
                    )}

                    {manualRequiredParams.map((paramKey) => (
                      <Col xs={24} md={12} lg={8} key={paramKey}>
                        <Text type="secondary">
                          {MVD_PARAM_LABELS[paramKey] || paramKey}
                        </Text>
                        <Input
                          value={manualParams[paramKey] || ""}
                          placeholder="Введите значение"
                          onChange={(event) =>
                            setManualParams((prev) => ({
                              ...prev,
                              [paramKey]: event.target.value,
                            }))
                          }
                        />
                      </Col>
                    ))}
                  </Row>

                  <Space style={{ marginTop: 12 }} wrap>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={runManualMvdCheck}
                      loading={manualRunning}
                      disabled={!manualMvdType}
                    >
                      Отправить в МВД
                    </Button>
                    <Button
                      icon={<ClearOutlined />}
                      onClick={() => setManualParams({})}
                    >
                      Очистить поля
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={fetchHistory}
                      loading={rowsLoading}
                    >
                      Обновить таблицу
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={clearHistory}>
                      Очистить таблицу
                    </Button>
                  </Space>
                </Card>

                <Card
                  title={`История ручных запросов (${manualRows.length})`}
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    columns={manualColumns}
                    dataSource={manualRows}
                    loading={rowsLoading}
                    size="small"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1200 }}
                    expandable={{
                      expandedRowRender: (record) => (
                        <Row gutter={12}>
                          <Col xs={24} lg={12}>
                            <Text strong>Request</Text>
                            <pre
                              style={{
                                marginTop: 6,
                                padding: 8,
                                background: "#fafafa",
                                border: "1px solid #f0f0f0",
                                borderRadius: 4,
                                maxHeight: 320,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(record.requestPayload, null, 2)}
                            </pre>
                          </Col>
                          <Col xs={24} lg={12}>
                            <Text strong>Response</Text>
                            <pre
                              style={{
                                marginTop: 6,
                                padding: 8,
                                background: "#fafafa",
                                border: "1px solid #f0f0f0",
                                borderRadius: 4,
                                maxHeight: 320,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(
                                {
                                  response: record.responsePayload,
                                  error: record.mvdError,
                                },
                                null,
                                2,
                              )}
                            </pre>
                          </Col>
                        </Row>
                      ),
                    }}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: RUN_MODE_OCR,
            label: "OCR (по фото)",
            children: (
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card title="Настройки OCR">
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={8}>
                      <Text type="secondary">Тип OCR документа</Text>
                      <Select
                        value={ocrDocumentType}
                        onChange={setOcrDocumentType}
                        style={{ width: "100%" }}
                        options={OCR_DOC_TYPE_OPTIONS}
                      />
                    </Col>

                    <Col xs={24} md={12}>
                      <Text type="secondary">
                        Тип проверки МВД (опционально)
                      </Text>
                      <Select
                        allowClear
                        loading={mvdMetaLoading}
                        value={ocrMvdType}
                        onChange={setOcrMvdType}
                        placeholder="Без проверки МВД"
                        style={{ width: "100%" }}
                        options={mvdTypes.map((item) => ({
                          value: item.type,
                          label: MVD_TYPE_LABELS[item.type] || item.type,
                        }))}
                      />
                    </Col>

                    {ocrRequiredMvdParams.length > 0 && (
                      <Col span={24}>
                        <Text type="secondary">
                          Параметры МВД будут собраны автоматически из OCR.
                          Обязательные поля:{" "}
                          {ocrRequiredMvdParams
                            .map((key) => MVD_PARAM_LABELS[key] || key)
                            .join(", ")}
                        </Text>
                      </Col>
                    )}
                  </Row>
                </Card>

                <Card title="Файлы и запуск">
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}
                    size={12}
                  >
                    <Upload
                      multiple
                      accept="image/*"
                      beforeUpload={() => false}
                      fileList={ocrFileList}
                      onChange={({ fileList }) => setOcrFileList(fileList)}
                    >
                      <Button icon={<UploadOutlined />}>
                        Выбрать изображения
                      </Button>
                    </Upload>

                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={runOcrBatch}
                        loading={ocrRunning}
                      >
                        Запустить OCR/MVD
                      </Button>
                      <Button
                        icon={<ClearOutlined />}
                        onClick={() => setOcrFileList([])}
                      >
                        Очистить список файлов
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchHistory}
                        loading={rowsLoading}
                      >
                        Обновить таблицу
                      </Button>
                      <Button icon={<ClearOutlined />} onClick={clearHistory}>
                        Очистить таблицу
                      </Button>
                    </Space>
                  </Space>
                </Card>

                <Card
                  title={`История OCR прогонов (${ocrRows.length})`}
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    columns={ocrColumns}
                    dataSource={ocrRows}
                    loading={rowsLoading}
                    size="small"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1300 }}
                    expandable={{
                      expandedRowRender: (record) => (
                        <Row gutter={12}>
                          <Col xs={24} lg={8}>
                            <Text strong>OCR normalized</Text>
                            <pre
                              style={{
                                marginTop: 6,
                                padding: 8,
                                background: "#fafafa",
                                border: "1px solid #f0f0f0",
                                borderRadius: 4,
                                maxHeight: 320,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(record.ocrNormalized, null, 2)}
                            </pre>
                          </Col>
                          <Col xs={24} lg={8}>
                            <Text strong>OCR raw</Text>
                            <pre
                              style={{
                                marginTop: 6,
                                padding: 8,
                                background: "#fafafa",
                                border: "1px solid #f0f0f0",
                                borderRadius: 4,
                                maxHeight: 320,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(record.ocrRaw, null, 2)}
                            </pre>
                          </Col>
                          <Col xs={24} lg={8}>
                            <Text strong>MVD result</Text>
                            <pre
                              style={{
                                marginTop: 6,
                                padding: 8,
                                background: "#fafafa",
                                border: "1px solid #f0f0f0",
                                borderRadius: 4,
                                maxHeight: 320,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(
                                {
                                  mvdType: record.mvdType,
                                  mvdParams: record.mvdParams,
                                  mvdResult: record.responsePayload,
                                  mvdError: record.mvdError,
                                  ocrError: record.ocrError,
                                },
                                null,
                                2,
                              )}
                            </pre>
                          </Col>
                        </Row>
                      ),
                    }}
                  />
                </Card>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};

export default OcrMvdTestPage;
