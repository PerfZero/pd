import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Space,
  Typography,
  Input,
  Button,
  Upload,
  Alert,
  Divider,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import api from "@/services/api";

const { Title, Text } = Typography;

const DEFAULT_ENDPOINT =
  "https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText";

const OcrTestPage = () => {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [folderId, setFolderId] = useState("");
  const [iamToken, setIamToken] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [authType, setAuthType] = useState("bearer");
  const [languageCodes, setLanguageCodes] = useState("ru");
  const [model, setModel] = useState("passport");
  const [mimeType, setMimeType] = useState("JPEG");
  const [dataLoggingEnabled, setDataLoggingEnabled] = useState(true);
  const [file, setFile] = useState(null);
  const [customBody, setCustomBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [responseJson, setResponseJson] = useState(null);

  useEffect(() => {
    const storedEndpoint = localStorage.getItem("ocr.endpoint");
    const storedFolderId = localStorage.getItem("ocr.folderId");
    const storedIamToken = localStorage.getItem("ocr.iamToken");
    const storedApiKey = localStorage.getItem("ocr.apiKey");
    const storedAuthType = localStorage.getItem("ocr.authType");
    const storedLanguages = localStorage.getItem("ocr.languageCodes");
    const storedModel = localStorage.getItem("ocr.model");
    const storedMimeType = localStorage.getItem("ocr.mimeType");
    const storedLogging = localStorage.getItem("ocr.dataLoggingEnabled");

    if (storedEndpoint) setEndpoint(storedEndpoint);
    if (storedFolderId) setFolderId(storedFolderId);
    if (storedIamToken) setIamToken(storedIamToken);
    if (storedApiKey) setApiKey(storedApiKey);
    if (storedAuthType) setAuthType(storedAuthType);
    if (storedLanguages) setLanguageCodes(storedLanguages);
    if (storedModel) setModel(storedModel);
    if (storedMimeType) setMimeType(storedMimeType);
    if (storedLogging) {
      setDataLoggingEnabled(storedLogging !== "false");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ocr.endpoint", endpoint);
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem("ocr.folderId", folderId);
  }, [folderId]);

  useEffect(() => {
    localStorage.setItem("ocr.iamToken", iamToken);
  }, [iamToken]);

  useEffect(() => {
    localStorage.setItem("ocr.apiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("ocr.authType", authType);
  }, [authType]);

  useEffect(() => {
    localStorage.setItem("ocr.languageCodes", languageCodes);
  }, [languageCodes]);

  useEffect(() => {
    localStorage.setItem("ocr.model", model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem("ocr.mimeType", mimeType);
  }, [mimeType]);

  useEffect(() => {
    localStorage.setItem(
      "ocr.dataLoggingEnabled",
      dataLoggingEnabled ? "true" : "false",
    );
  }, [dataLoggingEnabled]);

  const requestBody = useMemo(() => {
    if (customBody?.trim()) {
      try {
        return JSON.parse(customBody);
      } catch {
        return null;
      }
    }
    const langs = languageCodes
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      mimeType: mimeType || undefined,
      languageCodes: langs.length ? langs : undefined,
      model: model || undefined,
      content: "__BASE64__",
    };
  }, [customBody, languageCodes, model, mimeType]);

  const handlePickFile = (info) => {
    const picked = info.fileList?.[0]?.originFileObj || null;
    setFile(picked);
  };

  const buildPayload = async () => {
    if (!requestBody) {
      throw new Error("Некорректный JSON в кастомном теле запроса");
    }
    if (!file) {
      throw new Error("Выберите файл для распознавания");
    }

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result?.toString() || "";
        const content = result.split(",")[1] || "";
        resolve(content);
      };
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });

    const payload = JSON.parse(JSON.stringify(requestBody));

    if (payload && typeof payload === "object") {
      payload.content = base64;
    }

    return payload;
  };

  const handleSend = async () => {
    setIsLoading(true);
    setResponseText("");
    setErrorText("");
    setResponseJson(null);
    try {
      if (!endpoint?.trim()) {
        throw new Error("Укажите endpoint");
      }
      if (authType === "bearer" && !iamToken?.trim()) {
        throw new Error("Укажите IAM Token");
      }
      if (authType === "apiKey" && !apiKey?.trim()) {
        throw new Error("Укажите API Key");
      }

      const payload = await buildPayload();
      const headers = {};
      if (folderId?.trim()) {
        headers["x-folder-id"] = folderId.trim();
      }
      headers["x-data-logging-enabled"] = dataLoggingEnabled ? "true" : "false";

      const response = await api.post("/ocr/yandex", {
        endpoint: endpoint.trim(),
        apiKey: authType === "apiKey" ? apiKey.trim() : undefined,
        iamToken: authType === "bearer" ? iamToken.trim() : undefined,
        headers,
        payload,
      });
      const data = response.data?.data || {};
      setResponseJson(data);
      setResponseText(JSON.stringify(data, null, 2));
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Ошибка запроса";
      const details = error.response?.data?.data;
      setErrorText(
        details ? `${message}\n${JSON.stringify(details, null, 2)}` : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const parsedPassport = useMemo(() => {
    if (!responseJson) return null;
    const annotation = responseJson?.result?.textAnnotation;
    const rawText = annotation?.fullText || "";
    const fullText = rawText.replaceAll("&lt;", "<");
    const blockLines = Array.isArray(annotation?.blocks)
      ? annotation.blocks.flatMap((block) =>
          (block.lines || []).map((line) => line.text || ""),
        )
      : [];
    const linesSource =
      fullText.trim().length > 0 ? fullText : blockLines.join("\n");
    const lines = linesSource
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const mrzLines = lines.filter(
      (line) =>
        line.startsWith("P<") || line.startsWith("PN") || line.includes("<<"),
    );
    const mrzLine1 = mrzLines[0] || "";
    const mrzLine2 = mrzLines[1] || "";

    const parseMrzNames = () => {
      const normalized = mrzLine1.replaceAll("<", " ").replace(/\s+/g, " ");
      const payload = normalized.replace(/^P[N<]\s*/i, "");
      const [surnamePart, givenPart = ""] = payload.split("  ");
      return {
        surname: surnamePart?.trim() || "",
        givenNames: givenPart?.trim() || "",
      };
    };

    const parseMrzDates = () => {
      const normalized = mrzLine2.replaceAll("<", "");
      if (normalized.length < 20) {
        return {};
      }
      const passportNumber = normalized.slice(0, 9);
      const nationality = normalized.slice(9, 12);
      const birthRaw = normalized.slice(13, 19);
      const sex = normalized.slice(20, 21);
      const expiryRaw = normalized.slice(21, 27);
      return {
        passportNumber,
        nationality,
        birthRaw,
        sex,
        expiryRaw,
      };
    };

    const formatDate = (raw) => {
      if (!raw || raw.length !== 6) return "";
      return `${raw.slice(0, 2)}.${raw.slice(2, 4)}.${raw.slice(4, 6)}`;
    };

    const passportNumberMatch = fullText.match(/\b\d{2}\s?\d{2}\s?\d{6}\b/);
    const passportNumber = passportNumberMatch
      ? passportNumberMatch[0].replace(/\s+/g, " ")
      : "";

    const issueDateMatch = fullText.match(/\b\d{2}\.\d{2}\.\d{4}\b/);
    const issueDate = issueDateMatch ? issueDateMatch[0] : "";

    const departmentCodeMatch = fullText.match(/\b\d{3}-\d{3}\b/);
    const departmentCode = departmentCodeMatch ? departmentCodeMatch[0] : "";

    const authority = (() => {
      const idx = lines.findIndex((line) =>
        line.toLowerCase().includes("паспорт выдан"),
      );
      if (idx === -1) return "";
      const authorityLines = [];
      for (let i = idx + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (/\d{2}\.\d{2}\.\d{4}/.test(line)) break;
        if (authorityLines.length > 3) break;
        authorityLines.push(line);
      }
      return authorityLines.join(" ").trim();
    })();

    const entities = Array.isArray(annotation?.entities)
      ? annotation.entities
      : [];
    const entityMap = entities.reduce((acc, item) => {
      if (!item?.name) return acc;
      acc[item.name] = item.text;
      return acc;
    }, {});

    const normalizeEntity = (value) => {
      if (!value) return "";
      const trimmed = String(value).trim();
      if (trimmed === "-" || trimmed === "_") return "";
      return trimmed;
    };

    const { surname, givenNames } = parseMrzNames();
    const mrzData = parseMrzDates();

    return {
      surname: normalizeEntity(entityMap.surname) || surname || "",
      givenNames: normalizeEntity(entityMap.name) || givenNames || "",
      middleName: normalizeEntity(entityMap.middle_name) || "",
      birthDate:
        normalizeEntity(entityMap.birth_date) || formatDate(mrzData.birthRaw),
      sex: normalizeEntity(entityMap.gender) || mrzData.sex || "",
      nationality:
        normalizeEntity(entityMap.citizenship) || mrzData.nationality || "",
      passportNumber:
        normalizeEntity(entityMap.number) ||
        passportNumber ||
        mrzData.passportNumber ||
        "",
      issueDate: normalizeEntity(entityMap.issue_date) || issueDate,
      departmentCode: normalizeEntity(entityMap.subdivision) || departmentCode,
      authority: normalizeEntity(entityMap.issued_by) || authority,
      birthPlace: normalizeEntity(entityMap.birth_place) || "",
      expiryDate:
        normalizeEntity(entityMap.expiration_date) ||
        formatDate(mrzData.expiryRaw),
    };
  }, [responseJson]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Тест Yandex OCR Vision
      </Title>
      <Text type="secondary">
        Поля можно заполнять вручную. Запрос отправляется через серверный
        прокси.
      </Text>

      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input
            placeholder="Endpoint"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
          />
          <Input
            placeholder="Folder ID (x-folder-id)"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          />
          <Input
            placeholder="Auth Type: bearer | apiKey"
            value={authType}
            onChange={(event) => setAuthType(event.target.value)}
          />
          {authType === "bearer" ? (
            <Input.Password
              placeholder="IAM Token"
              value={iamToken}
              onChange={(event) => setIamToken(event.target.value)}
            />
          ) : (
            <Input.Password
              placeholder="API Key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          )}
          <Input
            placeholder="Языки (через запятую), например: ru,en"
            value={languageCodes}
            onChange={(event) => setLanguageCodes(event.target.value)}
          />
          <Input
            placeholder="Модель (например: page | handwritten)"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
          <Input
            placeholder="MimeType (например: JPEG | PNG | PDF)"
            value={mimeType}
            onChange={(event) => setMimeType(event.target.value)}
          />
          <Input
            placeholder="x-data-logging-enabled (true/false)"
            value={dataLoggingEnabled ? "true" : "false"}
            onChange={(event) =>
              setDataLoggingEnabled(
                event.target.value.trim().toLowerCase() !== "false",
              )
            }
          />
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            onChange={handlePickFile}
          >
            <Button icon={<UploadOutlined />}>Выбрать файл</Button>
          </Upload>

          <Divider style={{ margin: "8px 0" }} />

          <Text strong>Кастомное тело запроса (JSON, опционально)</Text>
          <Input.TextArea
            rows={6}
            placeholder="Оставьте пустым, чтобы использовать шаблон. Если заполните, JSON должен быть валиден."
            value={customBody}
            onChange={(event) => setCustomBody(event.target.value)}
          />

          {!requestBody && (
            <Alert
              type="error"
              message="Некорректный JSON"
              description="Проверьте кастомное тело запроса."
            />
          )}

          <Button type="primary" loading={isLoading} onClick={handleSend}>
            Отправить запрос
          </Button>
        </Space>
      </Card>

      {errorText && (
        <Alert type="error" message="Ошибка" description={errorText} />
      )}

      {responseText && (
        <Card>
          <Text strong>Ответ</Text>
          <pre
            style={{
              marginTop: 8,
              whiteSpace: "pre-wrap",
              maxHeight: 320,
              overflow: "auto",
              background: "#f7f7f7",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {responseText}
          </pre>
        </Card>
      )}

      {parsedPassport && (
        <Card>
          <Text strong>Паспорт (выжимка)</Text>
          <Divider style={{ margin: "8px 0" }} />
          <Space direction="vertical" size={4}>
            <Text>Фамилия: {parsedPassport.surname || "—"}</Text>
            <Text>Имя: {parsedPassport.givenNames || "—"}</Text>
            <Text>Отчество: {parsedPassport.middleName || "—"}</Text>
            <Text>Дата рождения: {parsedPassport.birthDate || "—"}</Text>
            <Text>Пол: {parsedPassport.sex || "—"}</Text>
            <Text>Гражданство: {parsedPassport.nationality || "—"}</Text>
            <Text>Серия и номер: {parsedPassport.passportNumber || "—"}</Text>
            <Text>Дата выдачи: {parsedPassport.issueDate || "—"}</Text>
            <Text>
              Код подразделения: {parsedPassport.departmentCode || "—"}
            </Text>
            <Text>Кем выдан: {parsedPassport.authority || "—"}</Text>
            <Text>Место рождения: {parsedPassport.birthPlace || "—"}</Text>
            <Text>Срок действия: {parsedPassport.expiryDate || "—"}</Text>
          </Space>
        </Card>
      )}
    </Space>
  );
};

export default OcrTestPage;
