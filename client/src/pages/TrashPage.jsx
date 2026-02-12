import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Input, Space, Table, Tabs, Typography } from "antd";
import { employeeService } from "@/services/employeeService";
import { userService } from "@/services/userService";
import dayjs from "dayjs";

const { Title } = Typography;

const TrashPage = () => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("employees");

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePagination, setEmployeePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userPagination, setUserPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const { data } = await employeeService.getDeleted({
        page: employeePagination.current,
        limit: employeePagination.pageSize,
        search: employeeSearch,
      });
      setEmployees(data.employees || []);
      setEmployeePagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }));
    } catch (error) {
      message.error("Ошибка при загрузке удаленных сотрудников");
    } finally {
      setEmployeesLoading(false);
    }
  }, [
    employeePagination.current,
    employeePagination.pageSize,
    employeeSearch,
    message,
  ]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await userService.getDeleted({
        page: userPagination.current,
        limit: userPagination.pageSize,
        search: userSearch,
      });
      setUsers(data.users || []);
      setUserPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }));
    } catch (error) {
      message.error("Ошибка при загрузке удаленных пользователей");
    } finally {
      setUsersLoading(false);
    }
  }, [userPagination.current, userPagination.pageSize, userSearch, message]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const restoreEmployee = async (employee) => {
    await employeeService.restore(employee.id);
    fetchEmployees();
  };

  const restoreUser = async (user) => {
    await userService.restore(user.id);
    fetchUsers();
  };

  const employeeColumns = [
    {
      title: "ФИО",
      key: "fullName",
      render: (_, record) =>
        `${record.lastName} ${record.firstName} ${record.middleName || ""}`.trim(),
    },
    {
      title: "Контрагент",
      key: "counterparty",
      render: (_, record) => {
        const mappings = record.employeeCounterpartyMappings || [];
        const names = [
          ...new Set(
            mappings.map((m) => m.counterparty?.name).filter(Boolean),
          ),
        ];
        return names.join(", ") || "-";
      },
    },
    {
      title: "Удален",
      dataIndex: "deletedAt",
      render: (value) => (value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-"),
    },
    {
      title: "Действия",
      key: "actions",
      render: (_, record) => (
        <Button onClick={() => restoreEmployee(record)}>Восстановить</Button>
      ),
    },
  ];

  const userColumns = [
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Имя",
      dataIndex: "firstName",
    },
    {
      title: "Роль",
      dataIndex: "role",
    },
    {
      title: "Удален",
      dataIndex: "deletedAt",
      render: (value) => (value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-"),
    },
    {
      title: "Действия",
      key: "actions",
      render: (_, record) => (
        <Button onClick={() => restoreUser(record)}>Восстановить</Button>
      ),
    },
  ];

  const tabs = [
    {
      key: "employees",
      label: "Сотрудники",
      children: (
        <>
          <Space style={{ marginBottom: 12 }}>
            <Input
              placeholder="Поиск по ФИО или ИНН"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              allowClear
            />
            <Button onClick={fetchEmployees}>Обновить</Button>
          </Space>
          <Table
            columns={employeeColumns}
            dataSource={employees}
            rowKey="id"
            loading={employeesLoading}
            pagination={{
              ...employeePagination,
              onChange: (page) =>
                setEmployeePagination((prev) => ({ ...prev, current: page })),
              onShowSizeChange: (current, pageSize) =>
                setEmployeePagination((prev) => ({
                  ...prev,
                  current: 1,
                  pageSize,
                })),
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            size="small"
          />
        </>
      ),
    },
    {
      key: "users",
      label: "Пользователи",
      children: (
        <>
          <Space style={{ marginBottom: 12 }}>
            <Input
              placeholder="Поиск по имени или email"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              allowClear
            />
            <Button onClick={fetchUsers}>Обновить</Button>
          </Space>
          <Table
            columns={userColumns}
            dataSource={users}
            rowKey="id"
            loading={usersLoading}
            pagination={{
              ...userPagination,
              onChange: (page) =>
                setUserPagination((prev) => ({ ...prev, current: page })),
              onShowSizeChange: (current, pageSize) =>
                setUserPagination((prev) => ({
                  ...prev,
                  current: 1,
                  pageSize,
                })),
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            size="small"
          />
        </>
      ),
    },
  ];

  return (
    <Card
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        margin: 0,
      }}
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          padding: 0,
        },
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: "16px 24px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Корзина
        </Title>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          padding: "16px 24px 24px 24px",
        }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
      </div>
    </Card>
  );
};

export default TrashPage;
