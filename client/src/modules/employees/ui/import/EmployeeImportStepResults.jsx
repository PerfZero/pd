import { memo } from "react";
import { CheckCircleOutlined } from "@ant-design/icons";
import { Table } from "antd";

const EmployeeImportStepResults = memo(({ importResult }) => {
  const totalProcessed =
    (importResult?.created || 0) +
    (importResult?.updated || 0) +
    (importResult?.skipped || 0);
  const hasErrors = (importResult?.errors?.length || 0) > 0;

  return (
    <div>
      <div
        style={{
          marginBottom: "24px",
          padding: "16px",
          background: "#f6f8fb",
          borderRadius: "8px",
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18 }}>📊 Результаты импорта</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "16px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "12px",
              background: "#fff",
              borderRadius: "4px",
            }}
          >
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#52c41a" }}>
              {importResult?.created || 0}
            </div>
            <div style={{ color: "#666", fontSize: 14, marginTop: "4px" }}>✅ Создано</div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "12px",
              background: "#fff",
              borderRadius: "4px",
            }}
          >
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#faad14" }}>
              {importResult?.updated || 0}
            </div>
            <div style={{ color: "#666", fontSize: 14, marginTop: "4px" }}>🔄 Обновлено</div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "12px",
              background: "#fff",
              borderRadius: "4px",
            }}
          >
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#999" }}>
              {importResult?.skipped || 0}
            </div>
            <div style={{ color: "#666", fontSize: 14, marginTop: "4px" }}>⏭️ Пропущено</div>
          </div>
        </div>

        {totalProcessed > 0 ? (
          <div
            style={{
              marginTop: "16px",
              textAlign: "center",
              color: "#52c41a",
              fontSize: 16,
            }}
          >
            <CheckCircleOutlined /> Всего обработано: <strong>{totalProcessed}</strong>{" "}
            {totalProcessed === 1
              ? "сотрудник"
              : totalProcessed < 5
                ? "сотрудника"
                : "сотрудников"}
          </div>
        ) : null}
      </div>

      {hasErrors ? (
        <div
          style={{
            padding: "12px",
            background: "#fff7e6",
            borderRadius: "8px",
            border: "1px solid #ffd591",
          }}
        >
          <h4 style={{ color: "#d46b08", margin: "0 0 12px 0" }}>
            ⚠️ Предупреждения ({importResult.errors.length})
          </h4>
          <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 12 }}>
            Сотрудники успешно созданы, но возникли проблемы при дополнительной обработке
          </div>
          <Table
            dataSource={importResult.errors}
            columns={[
              {
                title: "Строка",
                dataIndex: "rowIndex",
                width: 70,
                align: "center",
              },
              {
                title: "Фамилия",
                dataIndex: "lastName",
                key: "lastName",
                width: 150,
              },
              {
                title: "Предупреждение",
                dataIndex: "error",
                key: "error",
                render: (error) => (
                  <span style={{ color: "#d46b08" }}>
                    {error.includes("counterparty.update")
                      ? "Ошибка обновления КПП контрагента (не критично)"
                      : error}
                  </span>
                ),
              },
            ]}
            pagination={{ pageSize: 5 }}
            size="small"
            rowKey={(record) => `${record.rowIndex}-${record.lastName}`}
          />
        </div>
      ) : null}
    </div>
  );
});

EmployeeImportStepResults.displayName = "EmployeeImportStepResults";

export default EmployeeImportStepResults;
