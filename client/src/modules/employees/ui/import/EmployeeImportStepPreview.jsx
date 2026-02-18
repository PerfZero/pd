import { memo } from "react";
import { Empty, Table } from "antd";
import dayjs from "dayjs";

const columns = [
  {
    title: "№",
    render: (_, __, index) => index + 1,
    width: 40,
    align: "center",
  },
  {
    title: "Фамилия",
    dataIndex: "lastName",
    key: "lastName",
    ellipsis: true,
    width: 120,
  },
  {
    title: "Имя",
    dataIndex: "firstName",
    key: "firstName",
    ellipsis: true,
    width: 120,
  },
  {
    title: "Дата рождения",
    dataIndex: "birthDate",
    key: "birthDate",
    width: 120,
    render: (date) => (date ? dayjs(date).format("DD.MM.YYYY") : "-"),
  },
  {
    title: "ИНН контрагента",
    dataIndex: "counterpartyInn",
    key: "counterpartyInn",
    width: 120,
  },
  {
    title: "ИНН сотрудника",
    dataIndex: "inn",
    key: "inn",
    ellipsis: true,
    width: 120,
  },
];

const EmployeeImportStepPreview = memo(({ fileData }) => (
  <div>
    <p style={{ marginBottom: "16px" }}>
      Загружено записей: <strong>{fileData?.length || 0}</strong>
    </p>
    {fileData?.length ? (
      <Table
        dataSource={fileData.map((item, index) => ({
          ...item,
          _key: index,
        }))}
        columns={columns}
        pagination={{ pageSize: 5, size: "small" }}
        size="small"
        scroll={{ x: 900 }}
        rowKey="_key"
      />
    ) : (
      <Empty description="Данные не загружены" />
    )}
  </div>
));

EmployeeImportStepPreview.displayName = "EmployeeImportStepPreview";

export default EmployeeImportStepPreview;
