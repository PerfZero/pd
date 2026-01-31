import { Row, Col, Form, Input } from "antd";
import {
  formatBlankNumber,
  formatPatentNumber,
  noAutoFillProps,
} from "./employeeFormUtils";
import MaskedDatePicker from "../../shared/ui/MaskedDatePicker";

const EmployeePatentTab = ({ getFieldProps, dateFormat }) => (
  <>
    <Row gutter={16}>
      {!getFieldProps("patentNumber").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="patentNumber"
            label="Номер патента"
            required={getFieldProps("patentNumber").required}
            rules={[
              ...getFieldProps("patentNumber").rules,
              {
                pattern: /^\d{2}\s№\d{10}$/,
                message:
                  "Номер патента должен быть в формате XX №1234567890 (где XX - код от 01 до 99)",
              },
            ]}
            normalize={(value) => formatPatentNumber(value)}
          >
            <Input
              placeholder="01 №1234567890 (код 01-99)"
              maxLength={15}
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("patentIssueDate").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="patentIssueDate"
            label="Дата выдачи патента"
            required={getFieldProps("patentIssueDate").required}
            rules={getFieldProps("patentIssueDate").rules}
          >
            <MaskedDatePicker format={dateFormat} />
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("blankNumber").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="blankNumber"
            label="Номер бланка"
            required={getFieldProps("blankNumber").required}
            rules={[
              ...getFieldProps("blankNumber").rules,
              {
                pattern: /^[А-ЯЁ]{2}\d{7}$/,
                message:
                  "Номер бланка должен быть в формате ПР1234567 (кириллица)",
              },
            ]}
            normalize={(value) => formatBlankNumber(value)}
          >
            <Input
              placeholder="ПР1234567 (буквы - кириллица)"
              maxLength={9}
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
    </Row>
  </>
);

export default EmployeePatentTab;
