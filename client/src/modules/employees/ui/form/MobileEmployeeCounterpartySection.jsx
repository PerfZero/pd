import { Form, Select, Typography } from "antd";

const { Title } = Typography;
const { Option } = Select;

export const buildMobileEmployeeCounterpartySection = ({
  loadingCounterparties,
  availableCounterparties,
}) => ({
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
          {availableCounterparties.map((counterparty) => (
            <Option key={counterparty.id} value={counterparty.id}>
              {counterparty.name} {counterparty.inn && `(ИНН: ${counterparty.inn})`}
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
