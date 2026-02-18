import { Checkbox, Table } from "antd";

const ApplicationRequestModalEmployeeTable = ({
  availableEmployees,
  allSelected,
  selectedEmployees,
  onSelectAll,
  rowSelection,
  columns,
  loading,
  pagination,
  onPageSizeChange,
}) => (
  <>
    {availableEmployees.length > 0 && (
      <Checkbox
        checked={allSelected}
        onChange={onSelectAll}
        indeterminate={
          selectedEmployees.length > 0 &&
          selectedEmployees.length < availableEmployees.length
        }
      >
        Выделить все ({availableEmployees.length})
      </Checkbox>
    )}

    {availableEmployees.length > 0 && (
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={availableEmployees}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          onChange: (_page, pageSize) => {
            onPageSizeChange(pageSize);
          },
        }}
        scroll={{ x: 1200, y: 400 }}
      />
    )}

    {availableEmployees.length === 0 && !loading && (
      <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
        Нет доступных сотрудников по выбранным фильтрам
      </div>
    )}
  </>
);

export default ApplicationRequestModalEmployeeTable;
