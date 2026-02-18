import { memo } from "react";
import { Alert, Form, Input, Modal, Select, Space, Typography } from "antd";

const EmployeeMvdCheckModal = memo(
  ({
    open,
    onCancel,
    onRunCheck,
    confirmLoading,
    mvdForm,
    mvdSelectedType,
    mvdMetaLoading,
    onTypeChange,
    mvdSupportedTypes,
    selectedMvdParams,
    mvdErrorText,
    mvdResult,
    mvdTypeLabels,
    mvdParamLabels,
    mvdParamPlaceholders,
  }) => (
    <Modal
      title="Проверка МВД"
      open={open}
      onCancel={onCancel}
      onOk={onRunCheck}
      okText="Выполнить проверку"
      cancelText="Закрыть"
      confirmLoading={confirmLoading}
      width={760}
      maskClosable={false}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          Провайдер: `api-cloud.ru/mvd`.
        </Typography.Text>

        <Form layout="vertical" form={mvdForm}>
          <Form.Item
            label="Тип проверки"
            required
            validateStatus={!mvdSelectedType && open ? "warning" : ""}
            help={!mvdSelectedType ? "Выберите тип проверки" : ""}
          >
            <Select
              placeholder="Выберите тип проверки МВД"
              loading={mvdMetaLoading}
              value={mvdSelectedType}
              onChange={onTypeChange}
              options={mvdSupportedTypes.map((item) => ({
                value: item.type,
                label: mvdTypeLabels[item.type] || item.type,
              }))}
            />
          </Form.Item>

          {selectedMvdParams.map((paramKey) => (
            <Form.Item
              key={paramKey}
              name={paramKey}
              label={mvdParamLabels[paramKey] || paramKey}
              rules={[
                {
                  required: true,
                  message: "Поле обязательно",
                },
              ]}
            >
              <Input
                placeholder={
                  mvdParamPlaceholders[paramKey] || "Введите значение"
                }
              />
            </Form.Item>
          ))}
        </Form>

        {selectedMvdParams.length > 0 ? (
          <Typography.Text type="secondary">
            Обязательные поля: {selectedMvdParams.join(", ")}
          </Typography.Text>
        ) : null}

        {mvdErrorText ? <Alert type="error" message={mvdErrorText} showIcon /> : null}

        {mvdResult ? (
          <Alert
            type="success"
            showIcon
            message="Результат проверки МВД"
            description={
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 280,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(mvdResult, null, 2)}
              </pre>
            }
          />
        ) : null}
      </Space>
    </Modal>
  ),
);

EmployeeMvdCheckModal.displayName = "EmployeeMvdCheckModal";

export default EmployeeMvdCheckModal;
