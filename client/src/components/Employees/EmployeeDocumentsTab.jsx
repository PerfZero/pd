import { Row, Col, Form, Input, Select } from "antd";
import {
  formatKig,
  formatRussianPassportNumber,
  formatSnils,
  noAutoFillProps,
} from "./employeeFormUtils";
import MaskedDatePicker from "../../shared/ui/MaskedDatePicker";

const { Option } = Select;

const EmployeeDocumentsTab = ({
  getFieldProps,
  requiresPatent,
  passportType,
  setPassportType,
  dateFormat,
}) => (
  <>
    <Row gutter={16}>
      {!getFieldProps("snils").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="snils"
            label="СНИЛС"
            required={getFieldProps("snils").required}
            rules={[
              ...getFieldProps("snils").rules,
              {
                pattern: /^\d{3}-\d{3}-\d{3}\s\d{2}$/,
                message: "СНИЛС должен быть в формате XXX-XXX-XXX XX",
              },
            ]}
            normalize={(value) => formatSnils(value)}
          >
            <Input
              maxLength={14}
              placeholder="123-456-789 00"
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
      {requiresPatent && !getFieldProps("kig").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="kig"
            label="КИГ"
            required={getFieldProps("kig").required}
            rules={[
              ...getFieldProps("kig").rules,
              {
                pattern: /^[A-Z]{2}\s\d{7}$/,
                message: "КИГ должен быть в формате: AF 1234567",
              },
            ]}
            normalize={(value) => formatKig(value)}
          >
            <Input
              maxLength={10}
              placeholder="AF 1234567"
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
      {requiresPatent && !getFieldProps("kigEndDate").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="kigEndDate"
            label="Дата окончания КИГ"
            required={getFieldProps("kigEndDate").required}
            rules={getFieldProps("kigEndDate").rules}
          >
            <MaskedDatePicker format={dateFormat} />
          </Form.Item>
        </Col>
      )}
    </Row>

    <Row gutter={16}>
      {!getFieldProps("passportType").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="passportType"
            label="Тип паспорта"
            required={getFieldProps("passportType").required}
            rules={getFieldProps("passportType").rules}
          >
            <Select
              placeholder="Выберите тип паспорта"
              allowClear
              autoComplete="off"
              onChange={(value) => setPassportType(value)}
            >
              <Option value="russian">Российский</Option>
              <Option value="foreign">Иностранного гражданина</Option>
            </Select>
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("passportNumber").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="passportNumber"
            label="№ паспорта"
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
              {...noAutoFillProps}
              placeholder={
                passportType === "russian" ? "1234 №123456" : "Номер паспорта"
              }
              maxLength={passportType === "russian" ? 13 : undefined}
            />
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("passportDate").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="passportDate"
            label="Дата выдачи паспорта"
            required={getFieldProps("passportDate").required}
            rules={getFieldProps("passportDate").rules}
          >
            <MaskedDatePicker format={dateFormat} />
          </Form.Item>
        </Col>
      )}
    </Row>

    <Row gutter={16}>
      {passportType === "foreign" &&
        !getFieldProps("passportExpiryDate").hidden && (
          <Col xs={24} sm={12} md={12} lg={12}>
            <Form.Item
              name="passportExpiryDate"
              label="Дата окончания паспорта"
              required={getFieldProps("passportExpiryDate").required}
              rules={getFieldProps("passportExpiryDate").rules}
            >
              <MaskedDatePicker format={dateFormat} />
            </Form.Item>
          </Col>
        )}
      {!getFieldProps("passportIssuer").hidden && (
        <Col
          xs={24}
          sm={passportType === "foreign" ? 12 : 24}
          md={passportType === "foreign" ? 12 : 24}
          lg={passportType === "foreign" ? 12 : 24}
        >
          <Form.Item
            name="passportIssuer"
            label="Кем выдан паспорт"
            required={getFieldProps("passportIssuer").required}
            rules={getFieldProps("passportIssuer").rules}
          >
            <Input
              placeholder="ГУ МВД России, г.Москва, ул. Тверская, д.20"
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
    </Row>
  </>
);

export default EmployeeDocumentsTab;
