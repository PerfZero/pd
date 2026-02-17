import { memo } from "react";
import { Modal, Select, Space, Typography } from "antd";

const { Text } = Typography;

const SkudBindCardModal = memo(
  ({
    bindModalOpen,
    bindCardTarget,
    bindEmployeeId,
    setBindModalOpen,
    setBindCardTarget,
    setBindEmployeeId,
    confirmBindCard,
    searchEmployees,
    employeeOptions,
    employeeSearchLoading,
  }) => (
    <Modal
      title={
        bindCardTarget?.cardNumber
          ? `Привязать карту ${bindCardTarget.cardNumber}`
          : "Привязать карту"
      }
      open={bindModalOpen}
      onCancel={() => {
        setBindModalOpen(false);
        setBindCardTarget(null);
        setBindEmployeeId(undefined);
      }}
      onOk={confirmBindCard}
      okText="Привязать"
      cancelText="Отмена"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text type="secondary">
          Выберите сотрудника для привязки выбранной карты.
        </Text>
        <Select
          showSearch
          value={bindEmployeeId}
          onSearch={searchEmployees}
          onChange={setBindEmployeeId}
          filterOption={false}
          options={employeeOptions}
          placeholder="Сотрудник"
          style={{ width: "100%" }}
          notFoundContent={employeeSearchLoading ? "Поиск..." : "Нет данных"}
          allowClear
        />
      </Space>
    </Modal>
  ),
);

SkudBindCardModal.displayName = "SkudBindCardModal";

export default SkudBindCardModal;
