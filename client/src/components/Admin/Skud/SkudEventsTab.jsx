import { memo } from "react";
import { Button, DatePicker, Input, Select, Space, Table } from "antd";
import SkudStatsCards from "@/components/Admin/Skud/SkudStatsCards";

const { RangePicker } = DatePicker;

const SkudEventsTab = memo(
  ({
    stats,
    statsLoading,
    eventsAllowFilter,
    setEventsAllowFilter,
    eventsDirectionFilter,
    setEventsDirectionFilter,
    eventsAccessPoint,
    setEventsAccessPoint,
    eventsRange,
    setEventsRange,
    setEventsPagination,
    loadEvents,
    eventsColumns,
    eventItems,
    eventsLoading,
    eventsPagination,
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SkudStatsCards stats={stats} statsLoading={statsLoading} />
      <Space wrap>
        <Select
          placeholder="Решение"
          style={{ width: 140 }}
          value={eventsAllowFilter}
          onChange={(value) => {
            setEventsAllowFilter(value);
            setEventsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
          options={[
            { value: "true", label: "Разрешено" },
            { value: "false", label: "Запрещено" },
          ]}
        />
        <Select
          placeholder="Направление"
          style={{ width: 140 }}
          value={eventsDirectionFilter}
          onChange={(value) => {
            setEventsDirectionFilter(value);
            setEventsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
          options={[
            { value: 1, label: "Выход" },
            { value: 2, label: "Вход" },
            { value: 3, label: "Неизвестно" },
          ]}
        />
        <Input
          placeholder="Точка доступа"
          style={{ width: 160 }}
          value={eventsAccessPoint}
          onChange={(event) => {
            setEventsAccessPoint(event.target.value);
            setEventsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
        />
        <RangePicker
          value={eventsRange}
          onChange={(value) => {
            setEventsRange(value);
            setEventsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
        />
        <Button onClick={loadEvents}>Обновить</Button>
      </Space>

      <Table
        size="small"
        rowKey="id"
        columns={eventsColumns}
        dataSource={eventItems}
        loading={eventsLoading}
        pagination={{
          current: eventsPagination.current,
          pageSize: eventsPagination.pageSize,
          total: eventsPagination.total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) =>
            setEventsPagination((prev) => ({
              ...prev,
              current: page,
              pageSize: pageSize || prev.pageSize,
            })),
        }}
      />
    </div>
  ),
);

SkudEventsTab.displayName = "SkudEventsTab";

export default SkudEventsTab;
