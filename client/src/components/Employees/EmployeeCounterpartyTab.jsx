import { Row, Col, Form, Select } from "antd";

const { Option } = Select;

const EmployeeCounterpartyTab = ({
  availableCounterparties,
  loadingCounterparties,
}) => (
  <Row gutter={16}>
    <Col span={12}>
      <Form.Item
        name="counterpartyId"
        label="Контрагент"
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
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children.toLowerCase().includes(input.toLowerCase())
          }
          loading={loadingCounterparties}
          disabled={
            loadingCounterparties || availableCounterparties.length === 0
          }
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
            marginTop: 16,
          }}
        >
          📝 Нет доступных контрагентов
        </div>
      )}
    </Col>
  </Row>
);

export default EmployeeCounterpartyTab;
