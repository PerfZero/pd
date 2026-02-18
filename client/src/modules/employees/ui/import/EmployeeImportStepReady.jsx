import { memo } from "react";
import { CheckCircleOutlined } from "@ant-design/icons";

const EmployeeImportStepReady = memo(({ totalEmployees }) => (
  <div style={{ textAlign: "center", padding: "40px 20px" }}>
    <CheckCircleOutlined style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }} />
    <p style={{ fontSize: 16, marginBottom: 24 }}>
      Данные готовы к импорту
      <br />
      <strong>{totalEmployees} сотрудников</strong>
    </p>
    {totalEmployees === 0 ? (
      <p style={{ color: "#ff4d4f", fontSize: "14px" }}>
        ⚠️ Не выбрано ни одного сотрудника для импорта
      </p>
    ) : null}
  </div>
));

EmployeeImportStepReady.displayName = "EmployeeImportStepReady";

export default EmployeeImportStepReady;
