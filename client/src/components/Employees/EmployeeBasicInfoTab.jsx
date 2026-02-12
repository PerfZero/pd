import { Row, Col, Form, Input, Select, Radio, Space, Tooltip } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import EmployeeActionButtons from "./EmployeeActionButtons.jsx";
import {
  formatInn,
  formatPhoneNumber,
  noAutoFillProps,
} from "./employeeFormUtils";
import MaskedDatePicker from "../../shared/ui/MaskedDatePicker";

const { TextArea } = Input;
const { Option } = Select;

const withOcrWarningIcon = (label, warningText) => {
  if (!warningText) return label;
  return (
    <span>
      {label}
      <Tooltip title={warningText}>
        <ExclamationCircleOutlined
          style={{ color: "#faad14", marginInlineStart: 6 }}
        />
      </Tooltip>
    </span>
  );
};

const EmployeeBasicInfoTab = ({
  employee,
  messageApi,
  onCancel,
  user,
  defaultCounterpartyId,
  onTransfer,
  getFieldProps,
  positions,
  citizenships,
  handleCitizenshipChange,
  antiAutofillIds,
  latinInputError,
  handleFullNameChange,
  handleInnBlur,
  dateFormat,
  ocrConflictByField = {},
}) => (
  <>
    {employee?.id && (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space size="middle" wrap>
            <EmployeeActionButtons
              employee={employee}
              messageApi={messageApi}
              onCancel={onCancel}
              isDefaultCounterpartyUser={
                user?.counterpartyId === defaultCounterpartyId
              }
              isAdmin={user?.role === "admin"}
              onTransfer={onTransfer}
            />
          </Space>
        </Col>
      </Row>
    )}

    <Row gutter={16}>
      {!getFieldProps("inn").hidden && (
        <Col xs={24} sm={3} md={3} lg={3}>
          <Form.Item
            name="inn"
            label="ИНН"
            required={getFieldProps("inn").required}
            rules={[
              ...getFieldProps("inn").rules,
              {
                pattern: /^\d{4}-\d{5}-\d{1}$|^\d{4}-\d{6}-\d{2}$/,
                message:
                  "ИНН должен быть в формате XXXX-XXXXX-X или XXXX-XXXXXX-XX",
              },
            ]}
            normalize={(value) => formatInn(value)}
          >
            <Input
              maxLength={14}
              placeholder="XXXX-XXXXX-X"
              onBlur={handleInnBlur}
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("gender").hidden && (
        <Col xs={24} sm={3} md={3} lg={3}>
          <Form.Item
            name="gender"
            label={withOcrWarningIcon("Пол", ocrConflictByField.gender)}
            required={getFieldProps("gender").required}
            rules={getFieldProps("gender").rules}
            validateStatus={ocrConflictByField.gender ? "warning" : undefined}
            help={ocrConflictByField.gender || undefined}
          >
            <Radio.Group style={{ display: "flex", gap: "8px" }}>
              <Radio value="male">Муж</Radio>
              <Radio value="female">Жен</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("lastName").hidden && (
        <Col xs={24} sm={6} md={6} lg={6}>
          <Form.Item
            name="lastName"
            label={withOcrWarningIcon("Фамилия", ocrConflictByField.lastName)}
            required={getFieldProps("lastName").required}
            rules={getFieldProps("lastName").rules}
            validateStatus={
              latinInputError === "lastName"
                ? "error"
                : ocrConflictByField.lastName
                  ? "warning"
                  : ""
            }
            help={
              latinInputError === "lastName"
                ? "Ввод только на кириллице"
                : ocrConflictByField.lastName || ""
            }
          >
            <Input
              id={antiAutofillIds.lastName}
              name={antiAutofillIds.lastName}
              {...noAutoFillProps}
              onChange={(e) => handleFullNameChange("lastName", e.target.value)}
            />
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("firstName").hidden && (
        <Col xs={24} sm={6} md={6} lg={6}>
          <Form.Item
            name="firstName"
            label={withOcrWarningIcon("Имя", ocrConflictByField.firstName)}
            required={getFieldProps("firstName").required}
            rules={getFieldProps("firstName").rules}
            validateStatus={
              latinInputError === "firstName"
                ? "error"
                : ocrConflictByField.firstName
                  ? "warning"
                  : ""
            }
            help={
              latinInputError === "firstName"
                ? "Ввод только на кириллице"
                : ocrConflictByField.firstName || ""
            }
          >
            <Input
              id={antiAutofillIds.firstName}
              name={antiAutofillIds.firstName}
              {...noAutoFillProps}
              onChange={(e) =>
                handleFullNameChange("firstName", e.target.value)
              }
            />
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("middleName").hidden && (
        <Col xs={24} sm={6} md={6} lg={6}>
          <Form.Item
            name="middleName"
            label={withOcrWarningIcon(
              "Отчество",
              ocrConflictByField.middleName,
            )}
            required={getFieldProps("middleName").required}
            rules={getFieldProps("middleName").rules}
            validateStatus={
              latinInputError === "middleName"
                ? "error"
                : ocrConflictByField.middleName
                  ? "warning"
                  : ""
            }
            help={
              latinInputError === "middleName"
                ? "Ввод только на кириллице"
                : ocrConflictByField.middleName || ""
            }
          >
            <Input
              id={antiAutofillIds.middleName}
              name={antiAutofillIds.middleName}
              {...noAutoFillProps}
              onChange={(e) =>
                handleFullNameChange("middleName", e.target.value)
              }
            />
          </Form.Item>
        </Col>
      )}
    </Row>

    <Row gutter={16}>
      {!getFieldProps("positionId").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="positionId"
            label="Должность"
            required={getFieldProps("positionId").required}
            rules={getFieldProps("positionId").rules}
          >
            <Select
              placeholder="Выберите должность"
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              virtual={false}
              listHeight={400}
              popupMatchSelectWidth={false}
              classNames={{ popup: { root: "dropdown-wide" } }}
              autoComplete="off"
            >
              {positions.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("citizenshipId").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="citizenshipId"
            label={withOcrWarningIcon(
              "Гражданство",
              ocrConflictByField.citizenshipId,
            )}
            required={getFieldProps("citizenshipId").required}
            rules={getFieldProps("citizenshipId").rules}
            validateStatus={
              ocrConflictByField.citizenshipId ? "warning" : undefined
            }
            help={ocrConflictByField.citizenshipId || undefined}
          >
            <Select
              placeholder="Выберите гражданство"
              allowClear
              showSearch
              optionFilterProp="children"
              virtual={false}
              onChange={handleCitizenshipChange}
              autoComplete="off"
            >
              {citizenships.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("birthDate").hidden && (
        <Col xs={24} sm={8} md={8} lg={8}>
          <Form.Item
            name="birthDate"
            label={withOcrWarningIcon(
              "Дата рождения",
              ocrConflictByField.birthDate,
            )}
            required={getFieldProps("birthDate").required}
            rules={[
              ...getFieldProps("birthDate").rules,
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  const age = dayjs().diff(value, "year");
                  if (age < 16) {
                    return Promise.reject(
                      new Error(
                        "Возраст сотрудника должен быть не менее 16 лет",
                      ),
                    );
                  }
                  if (age > 80) {
                    return Promise.reject(
                      new Error(
                        "Возраст сотрудника должен быть не менее 80 лет",
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            validateStatus={
              ocrConflictByField.birthDate ? "warning" : undefined
            }
            help={ocrConflictByField.birthDate || undefined}
          >
            <MaskedDatePicker format={dateFormat} />
          </Form.Item>
        </Col>
      )}
    </Row>

    <Row gutter={16}>
      {!getFieldProps("birthCountryId").hidden && (
        <Col xs={24} sm={12} md={8} lg={8}>
          <Form.Item
            name="birthCountryId"
            label="Страна рождения"
            required={getFieldProps("birthCountryId").required}
            rules={getFieldProps("birthCountryId").rules}
            trigger="onChange"
          >
            <Select
              placeholder="Выберите страну рождения"
              allowClear
              showSearch
              optionFilterProp="children"
              virtual={false}
              autoComplete="off"
            >
              {citizenships.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("registrationAddress").hidden && (
        <Col xs={24} sm={12} md={16} lg={16}>
          <Form.Item
            name="registrationAddress"
            label="Адрес регистрации"
            required={getFieldProps("registrationAddress").required}
            rules={getFieldProps("registrationAddress").rules}
          >
            <Input
              id={antiAutofillIds.registrationAddress}
              name={antiAutofillIds.registrationAddress}
              placeholder="г. Москва, ул. Тверская, д.21, кв.11"
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
    </Row>

    <Row gutter={16}>
      {!getFieldProps("email").hidden && (
        <Col xs={24} sm={12} md={12} lg={12}>
          <Form.Item
            name="email"
            label="Email"
            required={getFieldProps("email").required}
            rules={[
              ...getFieldProps("email").rules,
              {
                type: "email",
                message:
                  "Введите корректный email (например: ivanov@example.com)",
              },
            ]}
          >
            <Input placeholder="ivanov@example.com" {...noAutoFillProps} />
          </Form.Item>
        </Col>
      )}
      {!getFieldProps("phone").hidden && (
        <Col xs={24} sm={12} md={12} lg={12}>
          <Form.Item
            name="phone"
            label="Телефон"
            required={getFieldProps("phone").required}
            rules={[
              ...getFieldProps("phone").rules,
              {
                pattern: /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/,
                message: "Телефон должен быть в формате +7 (999) 123-45-67",
              },
            ]}
            normalize={(value) => formatPhoneNumber(value)}
          >
            <Input
              id={antiAutofillIds.phone}
              name={antiAutofillIds.phone}
              placeholder="+7 (999) 123-45-67"
              maxLength={18}
              {...noAutoFillProps}
            />
          </Form.Item>
        </Col>
      )}
    </Row>

    {!getFieldProps("notes").hidden && (
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="notes"
            label="Примечания"
            required={getFieldProps("notes").required}
            rules={getFieldProps("notes").rules}
          >
            <TextArea rows={2} {...noAutoFillProps} />
          </Form.Item>
        </Col>
      </Row>
    )}
  </>
);

export default EmployeeBasicInfoTab;
