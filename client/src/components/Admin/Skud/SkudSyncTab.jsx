import { memo } from "react";
import { Button, Input, Select, Space, Table, Tag } from "antd";

const SkudSyncTab = memo(
  ({
    isSyncMock,
    syncStatusFilter,
    setSyncStatusFilter,
    setSyncJobsPagination,
    syncStatusOptions,
    syncOperationFilter,
    setSyncOperationFilter,
    loadSyncJobs,
    syncColumns,
    syncJobs,
    syncJobsLoading,
    syncJobsPagination,
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space wrap>
        {isSyncMock ? (
          <Tag color="gold">Демо-данные: журнал синхронизации недоступен</Tag>
        ) : null}
        <Select
          placeholder="Статус синхронизации"
          style={{ width: 220 }}
          value={syncStatusFilter}
          onChange={(value) => {
            setSyncStatusFilter(value);
            setSyncJobsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
          options={syncStatusOptions}
        />
        <Input
          placeholder="Операция (напр. manual_resync)"
          style={{ width: 260 }}
          value={syncOperationFilter}
          onChange={(event) => {
            setSyncOperationFilter(event.target.value);
            setSyncJobsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
        />
        <Button onClick={loadSyncJobs}>Обновить</Button>
      </Space>

      <Table
        size="small"
        rowKey="id"
        columns={syncColumns}
        dataSource={syncJobs}
        loading={syncJobsLoading}
        pagination={{
          current: syncJobsPagination.current,
          pageSize: syncJobsPagination.pageSize,
          total: syncJobsPagination.total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) =>
            setSyncJobsPagination((prev) => ({
              ...prev,
              current: page,
              pageSize: pageSize || prev.pageSize,
            })),
        }}
      />
    </div>
  ),
);

SkudSyncTab.displayName = "SkudSyncTab";

export default SkudSyncTab;
