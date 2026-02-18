import { memo } from "react";
import { Checkbox, Empty, Space, Spin } from "antd";
import { formatKig } from "@/utils/formatters";

const ApplicationRequestEmployeeList = memo(
  ({
    isLoading,
    availableEmployees,
    selectedEmployees,
    allSelected,
    onSelectAll,
    onEmployeeToggle,
  }) => (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        padding: "16px",
        paddingBottom: "100px",
      }}
    >
      <Spin spinning={isLoading}>
        {availableEmployees.length > 0 ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Checkbox
              checked={allSelected}
              onChange={(event) => onSelectAll(event.target.checked)}
              indeterminate={
                selectedEmployees.length > 0 &&
                selectedEmployees.length < availableEmployees.length
              }
            >
              <strong>Выделить все ({availableEmployees.length})</strong>
            </Checkbox>

            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {availableEmployees.map((employee) => {
                const isSelected = selectedEmployees.includes(employee.id);

                return (
                  <div
                    key={employee.id}
                    style={{
                      padding: "12px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "4px",
                      background: isSelected ? "#f6f8fb" : "#fff",
                      cursor: "pointer",
                      transition: "background-color 0.3s, border-color 0.3s",
                    }}
                    onClick={() => onEmployeeToggle(employee.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onEmployeeToggle(employee.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onEmployeeToggle(employee.id)}
                      onClick={(event) => event.stopPropagation()}
                      style={{ marginRight: 12 }}
                    />
                    <span style={{ fontWeight: 500 }}>
                      {employee.lastName} {employee.firstName}{" "}
                      {employee.middleName || ""}
                    </span>
                    <div
                      style={{ fontSize: "12px", color: "#999", marginTop: 4 }}
                    >
                      {employee.position?.name ? (
                        <span>{employee.position.name}</span>
                      ) : null}
                      {employee.kig ? (
                        <span> • КИГ: {formatKig(employee.kig)}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </Space>
          </Space>
        ) : (
          <Empty
            description="Нет доступных сотрудников по выбранным фильтрам"
            style={{ marginTop: "40px" }}
          />
        )}
      </Spin>
    </div>
  ),
);

ApplicationRequestEmployeeList.displayName = "ApplicationRequestEmployeeList";

export default ApplicationRequestEmployeeList;
