import { Alert, Form, Input, Select, Typography } from "antd";
import {
  COMMON_UPLOADS,
  PATENT_UPLOADS,
  createDateInputRules,
  formatDateInputValue,
} from "./MobileEmployeeDocumentSectionUtils";
import MobileEmployeeUploadsSection from "./MobileEmployeeUploadsSection";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const buildMobileEmployeeDocumentsSection = ({
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
}) => ({
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
            <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
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

      <MobileEmployeeUploadsSection
        uploads={COMMON_UPLOADS}
        employee={employee}
        ensureEmployeeId={ensureEmployeeId}
        handleDocumentUploadComplete={handleDocumentUploadComplete}
      />
      {requiresPatent && (
        <MobileEmployeeUploadsSection
          uploads={PATENT_UPLOADS}
          employee={employee}
          ensureEmployeeId={ensureEmployeeId}
          handleDocumentUploadComplete={handleDocumentUploadComplete}
        />
      )}
    </>
  ),
});
