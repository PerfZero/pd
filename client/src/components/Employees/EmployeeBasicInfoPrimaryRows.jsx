import { ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Col, Form, Input, Radio, Row, Select, Tooltip } from "antd";
import { formatInn, noAutoFillProps } from "./employeeFormUtils";
import MaskedDatePicker from "../../shared/ui/MaskedDatePicker";

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

const EmployeeBasicInfoPrimaryRows = ({
  getFieldProps,
  positions,
  citizenships,
  handleCitizenshipChange,
  antiAutofillIds,
  latinInputError,
  handleFullNameChange,
  handleInnBlur,
  dateFormat,
  ocrConflictByField,
}) => (
  <>
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
              onChange={(event) =>
                handleFullNameChange("lastName", event.target.value)
              }
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
              onChange={(event) =>
                handleFullNameChange("firstName", event.target.value)
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
              onChange={(event) =>
                handleFullNameChange("middleName", event.target.value)
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
              {positions.map((position) => (
                <Option key={position.id} value={position.id}>
                  {position.name}
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
              {citizenships.map((citizenship) => (
                <Option key={citizenship.id} value={citizenship.id}>
                  {citizenship.name}
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
  </>
);

export default EmployeeBasicInfoPrimaryRows;
