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
  Select,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import api from "@/services/api";

const { Title, Text } = Typography;

const DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3-vl-30b-a3b-instruct";
const DEFAULT_PROMPT =
  "Распознай текст на изображении паспорта РФ. Верни строго JSON без обрамления. " +
  "Поля: surname, givenNames, middleName, birthDate, sex, nationality, " +
  "passportNumber, issueDate, departmentCode, authority, birthPlace, expiryDate.";

const MODEL_OPTIONS = [
  {
    label: "Qwen3 VL 30B A3B Instruct",
    value: "qwen/qwen3-vl-30b-a3b-instruct",
  },
  {
    label: "Qwen3 VL 235B A22B Instruct",
    value: "qwen/qwen3-vl-235b-a22b-instruct",
  },
];

const OcrTestPage = () => {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [referer, setReferer] = useState("");
  const [appTitle, setAppTitle] = useState("");
  const [file, setFile] = useState(null);
  const [customBody, setCustomBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [responseContent, setResponseContent] = useState("");
  const [errorText, setErrorText] = useState("");
  const [responseJson, setResponseJson] = useState(null);

  useEffect(() => {
    const storedEndpoint = localStorage.getItem("openrouter.endpoint");
    const storedApiKey = localStorage.getItem("openrouter.apiKey");
    const storedModel = localStorage.getItem("openrouter.model");
    const storedPrompt = localStorage.getItem("openrouter.prompt");
    const storedReferer = localStorage.getItem("openrouter.referer");
    const storedTitle = localStorage.getItem("openrouter.appTitle");

    if (storedEndpoint) setEndpoint(storedEndpoint);
    if (storedApiKey) setApiKey(storedApiKey);
    if (storedModel) setModel(storedModel);
    if (storedPrompt) setPrompt(storedPrompt);
    if (storedReferer) setReferer(storedReferer);
    if (storedTitle) setAppTitle(storedTitle);
  }, []);

  useEffect(() => {
    localStorage.setItem("openrouter.endpoint", endpoint);
  }, [endpoint]);

  useEffect(() => {
    localStorage.setItem("openrouter.apiKey", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("openrouter.model", model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem("openrouter.prompt", prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem("openrouter.referer", referer);
  }, [referer]);

  useEffect(() => {
    localStorage.setItem("openrouter.appTitle", appTitle);
  }, [appTitle]);

  const requestBody = useMemo(() => {
    if (customBody?.trim()) {
      try {
        return JSON.parse(customBody);
      } catch {
        return null;
      }
    }

    return {
      model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: "Ты ассистент, который извлекает данные из документов.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt || DEFAULT_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: "__IMAGE_URL__",
              },
            },
          ],
        },
      ],
    };
  }, [customBody, model, prompt]);

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

    const imageUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;

    const replacePlaceholders = (value) => {
      if (typeof value === "string") {
        if (value === "__IMAGE_URL__") return imageUrl;
        if (value === "__BASE64__") return base64;
        return value;
      }
      if (Array.isArray(value)) {
        return value.map((item) => replacePlaceholders(item));
      }
      if (value && typeof value === "object") {
        return Object.entries(value).reduce((acc, [key, item]) => {
          acc[key] = replacePlaceholders(item);
          return acc;
        }, {});
      }
      return value;
    };

    return replacePlaceholders(requestBody);
  };

  const handleSend = async () => {
    setIsLoading(true);
    setResponseText("");
    setResponseContent("");
    setErrorText("");
    setResponseJson(null);
    try {
      if (!endpoint?.trim()) {
        throw new Error("Укажите endpoint");
      }
      if (!apiKey?.trim()) {
        throw new Error("Укажите OpenRouter API Key");
      }

      const payload = await buildPayload();
      const headers = {};
      if (referer?.trim()) headers["HTTP-Referer"] = referer.trim();
      if (appTitle?.trim()) headers["X-Title"] = appTitle.trim();

      const response = await api.post("/ocr/openrouter", {
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim(),
        headers,
        payload,
      });

      const data = response.data?.data || {};
      const content =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        "";

      setResponseJson(data);
      setResponseText(JSON.stringify(data, null, 2));
      setResponseContent(content);
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
    if (!responseContent) return null;

    const extractJson = (raw) => {
      if (!raw) return null;
      const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
      if (fenced?.[1]) return fenced[1];
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first === -1 || last === -1 || last <= first) return null;
      return raw.slice(first, last + 1);
    };

    const jsonText = extractJson(responseContent);
    if (!jsonText) return null;

    try {
      const data = JSON.parse(jsonText);
      return {
        surname: data.surname || "",
        givenNames: data.givenNames || "",
        middleName: data.middleName || "",
        birthDate: data.birthDate || "",
        sex: data.sex || "",
        nationality: data.nationality || "",
        passportNumber: data.passportNumber || "",
        issueDate: data.issueDate || "",
        departmentCode: data.departmentCode || "",
        authority: data.authority || "",
        birthPlace: data.birthPlace || "",
        expiryDate: data.expiryDate || "",
      };
    } catch {
      return null;
    }
  }, [responseContent]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={3} style={{ margin: 0 }}>
        Тест OpenRouter Vision
      </Title>
      <Text type="secondary">
        Загрузите изображение, выберите модель и отправьте запрос через серверный
        прокси.
      </Text>

      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input
            placeholder="Endpoint"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
          />
          <Input.Password
            placeholder="OpenRouter API Key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <Select
            value={model}
            options={MODEL_OPTIONS}
            onChange={setModel}
          />
          <Input
            placeholder="HTTP-Referer (опционально)"
            value={referer}
            onChange={(event) => setReferer(event.target.value)}
          />
          <Input
            placeholder="X-Title (опционально)"
            value={appTitle}
            onChange={(event) => setAppTitle(event.target.value)}
          />
          <Input.TextArea
            rows={4}
            placeholder="Промпт"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
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
            placeholder={
              "Оставьте пустым, чтобы использовать шаблон. Если заполните, JSON должен быть валиден. " +
              "Для картинки используйте __IMAGE_URL__ или __BASE64__."
            }
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

      {responseContent && (
        <Card>
          <Text strong>Ответ модели</Text>
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
            {responseContent}
          </pre>
        </Card>
      )}

      {responseText && (
        <Card>
          <Text strong>Ответ (raw)</Text>
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
