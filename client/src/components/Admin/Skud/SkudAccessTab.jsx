import { memo } from "react";
import { Alert, Button, Input, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import SkudStatsCards from "@/components/Admin/Skud/SkudStatsCards";

const SkudAccessTab = memo(
  ({
    stats,
    statsLoading,
    actionResult,
    setActionResult,
    accessSearch,
    setAccessSearch,
    accessPagination,
    setAccessPagination,
    accessStatusFilter,
    setAccessStatusFilter,
    accessStatusOptions,
    actionReason,
    setActionReason,
    actionReasonCode,
    setActionReasonCode,
    loadAccessStates,
    isAccessMock,
    targetEmployeeId,
    setTargetEmployeeId,
    searchEmployees,
    employeeOptions,
    employeeSearchLoading,
    allowSelectedEmployee,
    runAction,
    accessColumns,
    accessItems,
    accessLoading,
    selectedEmployeeIds,
    setSelectedEmployeeIds,
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SkudStatsCards stats={stats} statsLoading={statsLoading} />
      {actionResult ? (
        <Alert
          type={actionResult.type}
          showIcon
          message={
            actionResult.type === "success" ? "Операция выполнена" : "Ошибка"
          }
          description={
            <>
              <div>{actionResult.text}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {dayjs(actionResult.at).format("DD.MM.YYYY HH:mm:ss")}
              </div>
            </>
          }
          closable
          onClose={() => setActionResult(null)}
        />
      ) : null}
      <Space wrap>
        <Input
          placeholder="Поиск по ФИО"
          style={{ width: 280 }}
          value={accessSearch}
          onChange={(event) => {
            setAccessSearch(event.target.value);
            setAccessPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
        />
        <Select
          placeholder="Статус"
          style={{ width: 180 }}
          value={accessStatusFilter}
          onChange={(value) => {
            setAccessStatusFilter(value);
            setAccessPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
          options={accessStatusOptions}
        />
        <Input
          placeholder="Причина действия"
          style={{ width: 280 }}
          value={actionReason}
          onChange={(event) => setActionReason(event.target.value)}
          allowClear
        />
        <Input
          placeholder="Код причины"
          style={{ width: 180 }}
          value={actionReasonCode}
          onChange={(event) => setActionReasonCode(event.target.value)}
          allowClear
        />
        <Button onClick={loadAccessStates}>Обновить</Button>
      </Space>

      <Space wrap>
        {isAccessMock ? (
          <Tag color="gold">Демо-данные: операции в таблице недоступны</Tag>
        ) : null}
        <Select
          showSearch
          value={targetEmployeeId}
          onSearch={searchEmployees}
          onChange={setTargetEmployeeId}
          filterOption={false}
          options={employeeOptions}
          placeholder="Найти сотрудника для разрешения"
          style={{ width: 420 }}
          notFoundContent={employeeSearchLoading ? "Поиск..." : "Нет данных"}
          allowClear
        />
        <Button type="primary" onClick={allowSelectedEmployee}>
          Разрешить сотруднику
        </Button>
        <Button disabled={isAccessMock} onClick={() => runAction("grant")}>
          Разрешить выбранных
        </Button>
        <Button danger disabled={isAccessMock} onClick={() => runAction("block")}>
          Блокировать выбранных
        </Button>
        <Button disabled={isAccessMock} onClick={() => runAction("revoke")}>
          Отозвать выбранных
        </Button>
        <Button disabled={isAccessMock} onClick={() => runAction("resync")}>
          Resync выбранных
        </Button>
      </Space>

      <Table
        size="small"
        rowKey={(record) => record.employeeId || record.id}
        columns={accessColumns}
        dataSource={accessItems}
        loading={accessLoading}
        rowSelection={{
          selectedRowKeys: selectedEmployeeIds,
          onChange: (keys) => setSelectedEmployeeIds(keys),
          getCheckboxProps: (record) => ({
            disabled: Boolean(record.isMock || !record.employeeId),
          }),
        }}
        pagination={{
          current: accessPagination.current,
          pageSize: accessPagination.pageSize,
          total: accessPagination.total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) =>
            setAccessPagination((prev) => ({
              ...prev,
              current: page,
              pageSize: pageSize || prev.pageSize,
            })),
        }}
      />
    </div>
  ),
);

SkudAccessTab.displayName = "SkudAccessTab";

export default SkudAccessTab;
