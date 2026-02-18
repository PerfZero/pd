import { memo } from "react";
import { Button, Checkbox, Dropdown, Space, Tooltip, Typography } from "antd";
import {
  ClearOutlined,
  FileExcelOutlined,
  MoreOutlined,
  PlusOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { EmployeeSearchFilter } from "@/features/employee-search";
import { EmployeeActions } from "@/features/employee-actions";

const { Title } = Typography;

const EmployeesToolbar = memo(
  ({ isMobile, t, view, filters, columns, actions }) => (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          backgroundColor: "#fff",
          padding: "16px",
          borderBottom: "1px solid #f0f0f0",
          flexShrink: 0,
          marginBottom: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flex: 1,
            minWidth: 0,
          }}
        >
          {!isMobile ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <Title level={2} style={{ margin: 0 }}>
                {t("employees.title")}
              </Title>
              {view.backgroundLoading ? (
                <Tooltip
                  title={`Загрузка данных... (${view.loadedEmployeesCount} из ${view.totalCount})`}
                >
                  <SyncOutlined
                    spin
                    style={{ color: "#1890ff", fontSize: 16 }}
                  />
                </Tooltip>
              ) : null}
            </div>
          ) : null}

          {!isMobile ? (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 250 }}>
                <EmployeeSearchFilter
                  searchText={filters.searchText}
                  onSearchChange={filters.onSearchTextChange}
                  statusFilter={filters.statusFilter}
                  onStatusFilterChange={filters.onStatusFilterChange}
                />
              </div>
              <Button
                type="text"
                danger
                icon={<ClearOutlined />}
                onClick={filters.onResetFilters}
                title={t("common.reset")}
              >
                {t("common.reset")}
              </Button>
            </div>
          ) : null}
        </div>

        {!isMobile ? (
          <Space size="middle">
            <EmployeeActions
              onAdd={actions.onAdd}
              onRequest={actions.onRequest}
              onImport={actions.onImport}
              onSecurity={actions.onSecurity}
              canExport={view.canExport}
            />
            <Dropdown
              trigger={["click"]}
              popupRender={() => (
                <div
                  style={{
                    padding: 12,
                    background: "#fff",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                    minWidth: 220,
                  }}
                >
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: "100%" }}
                  >
                    {columns.availableColumns.map((column) => (
                      <Checkbox
                        key={column.key}
                        checked={!columns.hiddenColumns.includes(column.key)}
                        onChange={() => columns.onToggleColumn(column.key)}
                      >
                        {column.label}
                      </Checkbox>
                    ))}
                    <Button size="small" onClick={columns.onResetColumns}>
                      Сбросить
                    </Button>
                  </Space>
                </div>
              )}
            >
              <Button type="default" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        ) : null}
      </div>

      {isMobile ? (
        <div
          style={{
            marginBottom: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "0 16px 12px 16px",
            flexShrink: 0,
          }}
        >
          <EmployeeSearchFilter
            searchText={filters.searchText}
            onSearchChange={filters.onSearchTextChange}
            statusFilter={filters.statusFilter}
            onStatusFilterChange={filters.onStatusFilterChange}
          />
          <div style={{ display: "flex", gap: 12 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={actions.onAdd}
              size="large"
              style={{ flex: 1 }}
            >
              {t("common.add")}
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={actions.onRequest}
              size="large"
              style={{ flex: 1, background: "#52c41a", borderColor: "#52c41a" }}
            >
              {t("employees.requestExcel")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  ),
);

EmployeesToolbar.displayName = "EmployeesToolbar";

export default EmployeesToolbar;
