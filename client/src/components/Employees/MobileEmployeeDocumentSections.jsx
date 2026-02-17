import { Form, Input, Select, Typography, Alert } from "antd";
import dayjs from "dayjs";
import EmployeeDocumentUpload from "./EmployeeDocumentUpload";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const DATE_FORMAT = "DD.MM.YYYY";

const formatDateInputValue = (value) => {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (value && value.format) return value.format(DATE_FORMAT);
  return value;
};

const createDateInputRules = (rules = []) => [
  ...rules,
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
      } catch {
        return Promise.reject(new Error("Некорректная дата"));
      }
      return Promise.resolve();
    },
  },
];

const COMMON_UPLOADS = [
  { documentType: "passport", label: "Паспорт", multiple: true, ocrRefresh: true },
  {
    documentType: "consent",
    label: "Согласие на обработку персональных данных",
    multiple: true,
  },
  {
    documentType: "biometric_consent",
    label: "Согласие на перс.дан. Генподряд",
    multiple: true,
  },
  {
    documentType: "biometric_consent_developer",
    label: "Согласие на перс.дан. Застройщ",
    multiple: true,
  },
  { documentType: "bank_details", label: "Реквизиты счета", multiple: true },
  {
    documentType: "diploma",
    label: "Диплом / Документ об образовании",
    multiple: true,
  },
  { documentType: "med_book", label: "Мед.книжка", multiple: true },
  {
    documentType: "migration_card",
    label: "Миграционная карта",
    multiple: true,
  },
  {
    documentType: "arrival_notice",
    label: "Уведомление о прибытии (регистрация)",
    multiple: true,
  },
  {
    documentType: "mvd_notification",
    label: "Уведомление МВД",
    multiple: true,
  },
];

const PATENT_UPLOADS = [
  {
    documentType: "kig",
    label: "КИГ (Карта иностранного гражданина)",
    multiple: true,
    ocrRefresh: true,
  },
  { documentType: "visa", label: "Виза", multiple: true, ocrRefresh: true },
  {
    documentType: "patent_front",
    label: "Патент лицевая сторона (с фото)",
    multiple: false,
    ocrRefresh: true,
  },
  {
    documentType: "patent_back",
    label: "Патент задняя сторона",
    multiple: false,
    ocrRefresh: true,
  },
  {
    documentType: "patent_payment_receipt",
    label: "Чек об оплате патента",
    multiple: true,
  },
];

const renderUploads = ({
  uploads,
  employee,
  ensureEmployeeId,
  handleDocumentUploadComplete,
}) =>
  uploads.map((upload) => (
    <EmployeeDocumentUpload
      key={upload.documentType}
      employeeId={employee?.id}
      ensureEmployeeId={ensureEmployeeId}
      documentType={upload.documentType}
      label={upload.label}
      readonly={false}
      multiple={upload.multiple}
      onUploadComplete={
        upload.ocrRefresh ? handleDocumentUploadComplete : undefined
      }
    />
  ));

export const buildMobileDocumentSections = ({
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
}) => {
  const sections = [];

  sections.push({
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
            rules={createDateInputRules(getFieldProps("kigEndDate").rules)}
            normalize={formatDateInputValue}
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
            rules={createDateInputRules(getFieldProps("passportDate").rules)}
            normalize={formatDateInputValue}
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

        {mobileOcrState.status !== "idle" && (
          <Alert
            showIcon
            type={
              mobileOcrState.status === "running"
                ? "info"
                : mobileOcrState.status === "success"
                  ? "success"
                  : mobileOcrState.status === "warning"
                    ? "warning"
                    : "error"
            }
            style={{ marginBottom: 12 }}
            message={mobileOcrState.message}
            description={
              <>
                <div>{mobileOcrState.details}</div>
                {mobileOcrState.appliedFields.length > 0 && (
                  <div>
                    Применены поля: {mobileOcrState.appliedFields.join(", ")}
                  </div>
                )}
              </>
            }
          />
        )}

        {renderUploads({
          uploads: COMMON_UPLOADS,
          employee,
          ensureEmployeeId,
          handleDocumentUploadComplete,
        })}
        {requiresPatent &&
          renderUploads({
            uploads: PATENT_UPLOADS,
            employee,
            ensureEmployeeId,
            handleDocumentUploadComplete,
          })}
      </>
    ),
  });

  if (requiresPatent) {
    sections.push({
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
              rules={createDateInputRules(getFieldProps("patentIssueDate").rules)}
              normalize={formatDateInputValue}
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

  sections.push({
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
            disabled={loadingCounterparties || availableCounterparties.length === 0}
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

  return sections;
};
