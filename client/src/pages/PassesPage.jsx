import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  Form,
  Select,
  DatePicker,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const DATE_FORMAT = "DD.MM.YYYY";
const STORAGE_KEY = "passesPageState";

const PASS_TYPE_LABELS = {
  temporary: "Временный",
  permanent: "Постоянный",
  visitor: "Посетитель",
  contractor: "Подрядчик",
};

const STATUS_COLORS = {
  active: "success",
  expired: "default",
  revoked: "error",
  pending: "warning",
};

const STATUS_LABELS = {
  active: "Активен",
  expired: "Истек",
  revoked: "Отозван",
  pending: "Ожидание",
};

const EMPLOYEE_OPTIONS = [
  { value: 1, label: "Алексей Смирнов" },
  { value: 2, label: "Мария Петрова" },
  { value: 3, label: "Дмитрий Козлов" },
];

const ACCESS_ZONE_OPTIONS = [
  { label: "Здание А", value: "building_a" },
  { label: "Здание Б", value: "building_b" },
  { label: "Этаж 1", value: "floor_1" },
  { label: "Этаж 2", value: "floor_2" },
  { label: "Этаж 3", value: "floor_3" },
  { label: "Серверная", value: "server_room" },
  { label: "Парковка", value: "parking" },
];

const PASS_MOCKS = [
  {
    id: 1,
    passNumber: "PASS-1731676800974-001",
    employeeName: "Алексей Смирнов",
    passType: "permanent",
    validFrom: "2024-11-15",
    validUntil: "2025-05-15",
    accessZones: ["building_a", "floor_1", "floor_2"],
    status: "active",
  },
  {
    id: 2,
    passNumber: "PASS-1731676800974-002",
    employeeName: "Мария Петрова",
    passType: "permanent",
    validFrom: "2024-11-15",
    validUntil: "2025-05-15",
    accessZones: ["building_a", "floor_3"],
    status: "active",
  },
  {
    id: 3,
    passNumber: "PASS-1731676800974-003",
    employeeName: "Дмитрий Козлов",
    passType: "permanent",
    validFrom: "2024-11-15",
    validUntil: "2025-05-15",
    accessZones: ["building_b", "server_room"],
    status: "active",
  },
  {
    id: 4,
    passNumber: "PASS-1731676800974-004",
    employeeName: "Елена Новикова",
    passType: "temporary",
    validFrom: "2024-10-15",
    validUntil: "2024-11-15",
    accessZones: ["building_a", "floor_1"],
    status: "expired",
  },
  {
    id: 5,
    passNumber: "PASS-1731676800974-005",
    employeeName: "Сергей Волков",
    passType: "permanent",
    validFrom: "2024-11-15",
    validUntil: "2025-05-15",
    accessZones: ["building_a", "building_b", "parking"],
    status: "active",
  },
];

const loadPassesPageState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return {
        searchText: "",
        tableFilters: {},
        pagination: { current: 1, pageSize: 10 },
      };
    }

    const parsed = JSON.parse(saved);
    return {
      searchText: parsed.searchText || "",
      tableFilters: parsed.tableFilters || {},
      pagination: parsed.pagination || { current: 1, pageSize: 10 },
    };
  } catch (error) {
    console.warn("Ошибка загрузки состояния страницы пропусков:", error);
    return {
      searchText: "",
      tableFilters: {},
      pagination: { current: 1, pageSize: 10 },
    };
  }
};

const PassesToolbar = ({ searchText, onSearchChange, onAdd }) => (
  <>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <Title level={2} style={{ margin: 0 }}>
        Пропуска
      </Title>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
        Создать пропуск
      </Button>
    </div>

    <Space style={{ marginBottom: 16, width: "100%" }} direction="vertical">
      <Input
        placeholder="Поиск по номеру пропуска или сотруднику..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={onSearchChange}
        size="large"
        style={{ maxWidth: 500 }}
      />
    </Space>
  </>
);

const PassModalFormFields = () => (
  <>
    <Form.Item
      name="employeeId"
      label="Сотрудник"
      rules={[{ required: true, message: "Выберите сотрудника" }]}
    >
      <Select placeholder="Выберите сотрудника" options={EMPLOYEE_OPTIONS} />
    </Form.Item>

    <Form.Item
      name="passType"
      label="Тип пропуска"
      rules={[{ required: true, message: "Выберите тип пропуска" }]}
    >
      <Select
        placeholder="Выберите тип"
        options={Object.entries(PASS_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
      />
    </Form.Item>

    <Form.Item
      name="dateRange"
      label="Период действия"
      rules={[{ required: true, message: "Выберите период действия" }]}
    >
      <RangePicker
        style={{ width: "100%" }}
        format={DATE_FORMAT}
        placeholder={["ДД.ММ.ГГГГ", "ДД.ММ.ГГГГ"]}
      />
    </Form.Item>

    <Form.Item
      name="accessZones"
      label="Зоны доступа"
      rules={[{ required: true, message: "Выберите зоны доступа" }]}
    >
      <Select
        mode="multiple"
        placeholder="Выберите зоны доступа"
        options={ACCESS_ZONE_OPTIONS}
      />
    </Form.Item>
  </>
);

const createPassColumns = ({ tableFilters, onEdit, onRevoke, onDelete }) => [
  {
    title: "№ Пропуска",
    dataIndex: "passNumber",
    key: "passNumber",
    width: 200,
  },
  {
    title: "Сотрудник",
    dataIndex: "employeeName",
    key: "employeeName",
    sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
  },
  {
    title: "Тип",
    dataIndex: "passType",
    key: "passType",
    render: (type) => PASS_TYPE_LABELS[type],
    filters: Object.entries(PASS_TYPE_LABELS).map(([key, label]) => ({
      text: label,
      value: key,
    })),
    filteredValue: tableFilters.passType || null,
    onFilter: (value, record) => record.passType === value,
  },
  {
    title: "Действителен до",
    dataIndex: "validUntil",
    key: "validUntil",
    sorter: (a, b) => new Date(a.validUntil) - new Date(b.validUntil),
    render: (date) => (date ? dayjs(date).format(DATE_FORMAT) : "-"),
  },
  {
    title: "Зоны доступа",
    dataIndex: "accessZones",
    key: "accessZones",
    render: (zones) => (
      <Space size={4} wrap>
        {zones.slice(0, 2).map((zone) => (
          <Tag key={zone} color="blue">
            {zone}
          </Tag>
        ))}
        {zones.length > 2 && <Tag>+{zones.length - 2}</Tag>}
      </Space>
    ),
  },
  {
    title: "Статус",
    dataIndex: "status",
    key: "status",
    render: (status) => <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>,
    filters: Object.entries(STATUS_LABELS).map(([key, label]) => ({
      text: label,
      value: key,
    })),
    filteredValue: tableFilters.status || null,
    onFilter: (value, record) => record.status === value,
  },
  {
    title: "Действия",
    key: "actions",
    width: 150,
    render: (_, record) => (
      <Space>
        <Tooltip title="Редактировать">
          <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
        </Tooltip>
        {record.status === "active" && (
          <Tooltip title="Отозвать">
            <Button
              type="text"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => onRevoke(record)}
            />
          </Tooltip>
        )}
        <Tooltip title="Удалить">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(record)} />
        </Tooltip>
      </Space>
    ),
  },
];

const PassesPage = () => {
  const initialState = useMemo(loadPassesPageState, []);
  const [uiState, setUiState] = useState(() => ({
    searchText: initialState.searchText,
    tableFilters: initialState.tableFilters,
    pagination: initialState.pagination,
    isModalOpen: false,
    editingPass: null,
  }));
  const [form] = Form.useForm();

  const { searchText, tableFilters, pagination, isModalOpen, editingPass } = uiState;

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        searchText,
        tableFilters,
        pagination: {
          current: pagination.current || 1,
          pageSize: pagination.pageSize || 10,
        },
      }),
    );
  }, [searchText, tableFilters, pagination.current, pagination.pageSize]);

  const handleAdd = () => {
    setUiState((prev) => ({ ...prev, editingPass: null, isModalOpen: true }));
    form.resetFields();
  };

  const handleEdit = (pass) => {
    setUiState((prev) => ({ ...prev, editingPass: pass, isModalOpen: true }));
    form.setFieldsValue({
      ...pass,
      dateRange: [dayjs(pass.validFrom), dayjs(pass.validUntil)],
    });
  };

  const handleRevoke = (pass) => {
    Modal.confirm({
      title: "Отозвать пропуск",
      content: `Вы уверены, что хотите отозвать пропуск ${pass.passNumber}?`,
      okText: "Отозвать",
      okType: "danger",
      cancelText: "Отмена",
      onOk: () => {
        message.success("Пропуск отозван");
      },
    });
  };

  const handleDelete = (pass) => {
    Modal.confirm({
      title: "Удаление пропуска",
      content: `Вы уверены, что хотите удалить пропуск ${pass.passNumber}?`,
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: () => {
        message.success("Пропуск удален");
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      console.log("Form values:", values);
      message.success(editingPass ? "Пропуск обновлен" : "Пропуск создан");
      setUiState((prev) => ({ ...prev, isModalOpen: false }));
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleModalCancel = () => {
    setUiState((prev) => ({ ...prev, isModalOpen: false }));
    form.resetFields();
  };

  const columns = useMemo(
    () =>
      createPassColumns({
        tableFilters,
        onEdit: handleEdit,
        onRevoke: handleRevoke,
        onDelete: handleDelete,
      }),
    [tableFilters],
  );

  const filteredPasses = useMemo(() => {
    const searchLower = searchText.toLowerCase();
    return PASS_MOCKS.filter(
      (pass) =>
        pass.passNumber.toLowerCase().includes(searchLower) ||
        pass.employeeName.toLowerCase().includes(searchLower),
    );
  }, [searchText]);

  return (
    <div>
      <PassesToolbar
        searchText={searchText}
        onSearchChange={(e) =>
          setUiState((prev) => ({ ...prev, searchText: e.target.value }))
        }
        onAdd={handleAdd}
      />

      <Table
        columns={columns}
        dataSource={filteredPasses}
        rowKey="id"
        onChange={(nextPagination, nextFilters) => {
          setUiState((prev) => ({
            ...prev,
            tableFilters: nextFilters || {},
            pagination: {
              ...prev.pagination,
              current: nextPagination.current || prev.pagination.current,
              pageSize: nextPagination.pageSize || prev.pagination.pageSize,
            },
          }));
        }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title={editingPass ? "Редактировать пропуск" : "Создать пропуск"}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={editingPass ? "Сохранить" : "Создать"}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <PassModalFormFields />
        </Form>
      </Modal>
    </div>
  );
};

export default PassesPage;
