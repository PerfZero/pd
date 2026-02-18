import { Form, Input, Typography } from "antd";
import {
  createDateInputRules,
  formatDateInputValue,
} from "./MobileEmployeeDocumentSectionUtils";

const { Title } = Typography;

export const buildMobileEmployeePatentSection = ({
  requiresPatent,
  getFieldProps,
  formatPatentNumber,
  noAutoFillProps,
  formatBlankNumber,
}) => {
  if (!requiresPatent) {
    return null;
  }

  return {
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
            <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
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
  };
};
