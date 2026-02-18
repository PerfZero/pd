import { Button, Space } from "antd";

const EmployeeFormModalFooter = ({
  employee,
  loading,
  allTabsValid,
  onCancel,
  onSaveDraft,
  onSave,
  onNext,
}) => {
  return (
    <Space>
      <Button onClick={onCancel}>{employee ? "Закрыть" : "Отмена"}</Button>
      <Button onClick={onSaveDraft} loading={loading}>
        Сохранить черновик
      </Button>
      {allTabsValid() ? (
        <Button
          type="primary"
          onClick={onSave}
          loading={loading}
          style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
        >
          Сохранить
        </Button>
      ) : (
        <Button type="primary" onClick={onNext}>
          Следующая
        </Button>
      )}
    </Space>
  );
};

export default EmployeeFormModalFooter;
