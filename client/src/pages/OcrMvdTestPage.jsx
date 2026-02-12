import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
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
import ocrService from "../services/ocrService";
import mvdService from "../services/mvdService";

const { Text, Title } = Typography;
const { TextArea } = Input;

const OCR_DOC_TYPE_OPTIONS = [
  { value: "passport_rf", label: "Паспорт РФ" },
  { value: "foreign_passport", label: "Паспорт иностранного гражданина" },
  { value: "patent", label: "Патент" },
  { value: "visa", label: "Виза" },
  { value: "kig", label: "КИГ" },
];

const DEFAULT_PROMPT_BY_TYPE = {
  passport_rf:
    "Распознай текст на изображении паспорта РФ. Верни строго JSON без обрамления. Поля: surname, givenNames, middleName, birthDate, sex, nationality, passportNumber, issueDate, departmentCode, authority, birthPlace, expiryDate.",
  foreign_passport:
    "Распознай текст на изображении паспорта иностранного гражданина. Верни строго JSON без обрамления. Поля: surname, givenNames, middleName, birthDate, sex, nationality, passportNumber, issueDate, expiryDate, authority, birthPlace.",
  patent:
    "Распознай текст на изображении патента на работу. Верни строго JSON без обрамления. Поля: patentNumber, issueDate, expiryDate, region, authority, surname, givenNames, middleName, birthDate, nationality.",
  visa: "Распознай текст на изображении визы. Верни строго JSON без обрамления. Поля: visaNumber, issueDate, expiryDate, visaType, entries, surname, givenNames, nationality, birthDate.",
  kig: "Распознай текст на изображении карты иностранного гражданина (КИГ). Верни строго JSON без обрамления. Поля: kigNumber, expiryDate, surname, givenNames, middleName, birthDate, nationality.",
};

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

const normalizeString = (value) => String(value || "").trim();

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

const parseJsonObject = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return { parsed: {}, isValid: true };
  }
  try {
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { parsed, isValid: true };
    }
    return { parsed: {}, isValid: false };
  } catch {
    return { parsed: {}, isValid: false };
  }
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

const getOcrResponseData = (response = {}) =>
  response?.data || response?.result || {};

const getOcrNormalized = (response = {}) =>
  response?.data?.normalized ||
  response?.normalized ||
  response?.data?.data?.normalized ||
  {};

const getOcrRaw = (response = {}) =>
  response?.data?.raw || response?.raw || response?.data?.data?.raw || null;

const getMvdResponseData = (response = {}) =>
  response?.data || response || null;

const statusTag = (status) => {
  if (status === "ok") return <Tag color="green">OK</Tag>;
  if (status === "partial") return <Tag color="gold">Частично</Tag>;
  if (status === "missing_params")
    return <Tag color="orange">Нет параметров</Tag>;
  if (status === "error") return <Tag color="red">Ошибка</Tag>;
  return <Tag>—</Tag>;
};

const OcrMvdTestPage = () => {
  const { message } = App.useApp();
  const [employeeId, setEmployeeId] = useState("");
  const [documentType, setDocumentType] = useState("passport_rf");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_BY_TYPE.passport_rf);
  const [model, setModel] = useState("");
  const [mvdType, setMvdType] = useState(null);
  const [mvdTypes, setMvdTypes] = useState([]);
  const [mvdMetaLoading, setMvdMetaLoading] = useState(false);
  const [mvdOverridesText, setMvdOverridesText] = useState("{}");
  const [fileList, setFileList] = useState([]);
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const selectedMvdMeta = useMemo(
    () => mvdTypes.find((item) => item.type === mvdType) || null,
    [mvdType, mvdTypes],
  );

  const requiredMvdParams = selectedMvdMeta?.requiredParams || [];

  const fetchMvdMeta = useCallback(async () => {
    try {
      setMvdMetaLoading(true);
      const response = await mvdService.getMeta();
      const supported = response?.data?.supportedTypes || [];
      setMvdTypes(supported);
      return supported;
    } catch (error) {
      message.error(error?.userMessage || "Не удалось загрузить типы МВД");
      return [];
    } finally {
      setMvdMetaLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchMvdMeta();
  }, [fetchMvdMeta]);

  const fetchRuns = useCallback(async () => {
    try {
      setRowsLoading(true);
      const response = await ocrService.listDebugRuns({ limit: 200 });
      const runs = response?.data?.runs || [];
      setRows(Array.isArray(runs) ? runs : []);
    } catch (error) {
      message.error(
        error?.userMessage || "Не удалось загрузить историю прогонов",
      );
    } finally {
      setRowsLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const runBatch = async () => {
    const normalizedEmployeeId = normalizeString(employeeId);
    if (!normalizedEmployeeId) {
      message.warning("Укажите employeeId для OCR");
      return;
    }

    if (fileList.length === 0) {
      message.warning("Добавьте хотя бы один файл");
      return;
    }

    const { parsed: parsedOverrides, isValid } =
      parseJsonObject(mvdOverridesText);
    if (!isValid) {
      message.warning("MVD overrides должны быть валидным JSON-объектом");
      return;
    }

    setRunning(true);
    let successCount = 0;

    try {
      for (const uploadFile of fileList) {
        const startedAt = new Date().toISOString();
        const baseRow = {
          key: `${startedAt}-${uploadFile.uid}`,
          startedAt,
          fileName: uploadFile.name,
          documentType,
          employeeId: normalizedEmployeeId,
          promptUsed: prompt,
          modelUsed: normalizeString(model) || null,
          ocrStatus: "error",
          ocrMissingFields: [],
          ocrNormalized: null,
          ocrRaw: null,
          ocrError: null,
          ocrProvider: null,
          mvdType: mvdType || null,
          mvdStatus: mvdType ? "missing_params" : null,
          mvdParams: null,
          mvdMissingParams: [],
          mvdResult: null,
          mvdError: null,
        };

        try {
          const response = await ocrService.recognizeDocument({
            documentType,
            employeeId: normalizedEmployeeId,
            file: uploadFile.originFileObj,
            prompt: normalizeString(prompt) || undefined,
            model: normalizeString(model) || undefined,
          });

          const envelope = getOcrResponseData(response);
          const normalized = getOcrNormalized(response);
          const raw = getOcrRaw(response);
          const expected = OCR_REQUIRED_FIELDS_BY_TYPE[documentType] || [];
          const missingFields = expected.filter((fieldKey) =>
            isEmptyValue(normalized?.[fieldKey]),
          );

          baseRow.ocrStatus = missingFields.length === 0 ? "ok" : "partial";
          baseRow.ocrMissingFields = missingFields;
          baseRow.ocrNormalized = normalized;
          baseRow.ocrRaw = raw;
          baseRow.ocrProvider = envelope?.provider || null;
          baseRow.ocrError = null;

          if (mvdType) {
            const autoParams = buildMvdParamsFromOcr(mvdType, normalized);
            const mvdParams = { ...autoParams, ...parsedOverrides };
            const missingParams = requiredMvdParams.filter((paramKey) =>
              isEmptyValue(mvdParams[paramKey]),
            );

            baseRow.mvdParams = mvdParams;
            baseRow.mvdMissingParams = missingParams;

            if (missingParams.length > 0) {
              baseRow.mvdStatus = "missing_params";
            } else {
              try {
                const mvdResponse = await mvdService.check({
                  type: mvdType,
                  params: mvdParams,
                });
                baseRow.mvdStatus = "ok";
                baseRow.mvdResult = getMvdResponseData(mvdResponse);
                baseRow.mvdError = null;
              } catch (mvdError) {
                baseRow.mvdStatus = "error";
                baseRow.mvdError =
                  mvdError?.userMessage || "Не удалось выполнить проверку МВД";
              }
            }
          }

          successCount += 1;
        } catch (ocrError) {
          baseRow.ocrStatus = "error";
          baseRow.ocrError =
            ocrError?.userMessage || "Не удалось выполнить OCR";
        }

        try {
          const persisted = await ocrService.createDebugRun(baseRow);
          const persistedRow = persisted?.data || baseRow;
          setRows((prev) => [
            { ...persistedRow, key: persistedRow?.key || baseRow.key },
            ...prev,
          ]);
        } catch (persistError) {
          setRows((prev) => [baseRow, ...prev]);
          message.warning(
            persistError?.userMessage ||
              "Не удалось сохранить результат в историю",
          );
        }
      }

      message.success(
        `Обработка завершена. Успешных OCR: ${successCount} из ${fileList.length}.`,
      );
    } finally {
      setRunning(false);
    }
  };

  const clearRows = async () => {
    try {
      await ocrService.clearDebugRuns();
      setRows([]);
      message.success("История очищена");
    } catch (error) {
      message.error(error?.userMessage || "Не удалось очистить историю");
    }
  };

  const tableColumns = [
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
    },
    {
      title: "OCR",
      dataIndex: "ocrStatus",
      width: 110,
      render: (status) => statusTag(status),
    },
    {
      title: "Поля OCR",
      dataIndex: "ocrMissingFields",
      width: 220,
      render: (missingFields = []) => {
        if (missingFields.length === 0) {
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
      width: 130,
      render: (status) => statusTag(status),
    },
    {
      title: "Параметры МВД",
      dataIndex: "mvdMissingParams",
      width: 260,
      render: (missingParams = []) => {
        if (missingParams.length === 0) {
          return <Text type="secondary">Готово</Text>;
        }
        return (
          <Text type="warning">
            Нет:{" "}
            {missingParams
              .map((paramKey) => MVD_PARAM_LABELS[paramKey] || paramKey)
              .join(", ")}
          </Text>
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
          OCR + МВД тест документов
        </Title>
        <Text type="secondary">
          Тестовый прогон по вашим файлам: OCR распознавание, проверка
          обязательных полей и опциональная проверка МВД.
        </Text>
      </div>

      <Alert
        type="info"
        showIcon
        message="Важно"
        description="Для прямой загрузки OCR сервер требует employeeId, а файлы должны быть изображениями (jpg/png/webp)."
      />

      <Card title="Настройки прогона">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Text type="secondary">employeeId для доступа</Text>
            <Input
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder="Например: 123"
            />
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary">Тип OCR документа</Text>
            <Select
              value={documentType}
              onChange={(nextType) => {
                setDocumentType(nextType);
                setPrompt(DEFAULT_PROMPT_BY_TYPE[nextType] || "");
              }}
              options={OCR_DOC_TYPE_OPTIONS}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary">OCR модель (опционально)</Text>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="Например: qwen/qwen3-vl-30b-a3b-instruct"
            />
          </Col>
          <Col span={24}>
            <Space style={{ marginBottom: 4 }}>
              <Text type="secondary">Промпт OCR</Text>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() =>
                  setPrompt(DEFAULT_PROMPT_BY_TYPE[documentType] || "")
                }
              >
                Сбросить по типу
              </Button>
            </Space>
            <TextArea
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </Col>
          <Col xs={24} md={10}>
            <Text type="secondary">Тип проверки МВД (опционально)</Text>
            <Select
              allowClear
              loading={mvdMetaLoading}
              value={mvdType}
              onChange={setMvdType}
              placeholder="Без проверки МВД"
              style={{ width: "100%" }}
              options={mvdTypes.map((item) => ({
                value: item.type,
                label: MVD_TYPE_LABELS[item.type] || item.type,
              }))}
            />
          </Col>
          <Col xs={24} md={14}>
            <Text type="secondary">
              MVD overrides JSON (на случай недостающих полей)
            </Text>
            <TextArea
              rows={2}
              value={mvdOverridesText}
              onChange={(event) => setMvdOverridesText(event.target.value)}
              placeholder='{"blankseria":"АБ","blanknumber":"1234567","lbg":"770-001"}'
            />
          </Col>
          {requiredMvdParams.length > 0 && (
            <Col span={24}>
              <Text type="secondary">
                Обязательные параметры выбранного MVD-типа:{" "}
                {requiredMvdParams
                  .map((paramKey) => MVD_PARAM_LABELS[paramKey] || paramKey)
                  .join(", ")}
              </Text>
            </Col>
          )}
        </Row>
      </Card>

      <Card title="Файлы и запуск">
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Upload
            multiple
            accept="image/*"
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: nextFileList }) => setFileList(nextFileList)}
          >
            <Button icon={<UploadOutlined />}>Выбрать изображения</Button>
          </Upload>

          <Space wrap>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={runBatch}
              loading={running}
            >
              Запустить OCR/MVD
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={clearRows}
              disabled={rows.length === 0}
            >
              Очистить таблицу
            </Button>
          </Space>
        </Space>
      </Card>

      <Card
        title={`Результаты (${rows.length})`}
        bodyStyle={{ padding: 0 }}
        extra={
          <Text type="secondary">
            Новые результаты добавляются в начало таблицы
          </Text>
        }
      >
        <Table
          columns={tableColumns}
          dataSource={rows}
          loading={rowsLoading}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1200 }}
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
                      maxHeight: 260,
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
                      maxHeight: 260,
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
                      maxHeight: 260,
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(
                      {
                        mvdType: record.mvdType,
                        mvdParams: record.mvdParams,
                        mvdResult: record.mvdResult,
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
    </div>
  );
};

export default OcrMvdTestPage;
