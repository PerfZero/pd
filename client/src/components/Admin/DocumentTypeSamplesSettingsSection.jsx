import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { employeeService } from "@/services/employeeService";
import { FileViewer } from "@/shared/ui/FileViewer";

const ACCEPTED_SAMPLE_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp";
const SUPPORTED_SAMPLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const inferMimeTypeFromUrl = (url) => {
  if (!url || typeof url !== "string") return "application/pdf";
  if (/\.(png)(\?.*)?$/i.test(url)) return "image/png";
  if (/\.(jpe?g)(\?.*)?$/i.test(url)) return "image/jpeg";
  if (/\.(webp)(\?.*)?$/i.test(url)) return "image/webp";
  return "application/pdf";
};

const parseHighlightedFields = (value) => {
  if (!value) return [];
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toHighlightedFieldsText = (value) => {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value.join("\n");
};

const DocumentTypeEditForm = ({ form }) => (
  <Form form={form} layout="vertical">
    <Form.Item
      name="name"
      label="Название"
      rules={[{ required: true, message: "Введите название" }]}
    >
      <Input maxLength={255} />
    </Form.Item>

    <Form.Item name="description" label="Описание">
      <Input.TextArea rows={2} maxLength={2000} />
    </Form.Item>

    <Form.Item name="sortOrder" label="Порядок сортировки">
      <Input type="number" />
    </Form.Item>

    <Form.Item name="isActive" label="Активен" valuePropName="checked">
      <Switch />
    </Form.Item>

    <Form.Item
      name="isRequired"
      label="Обязательный документ"
      valuePropName="checked"
    >
      <Switch />
    </Form.Item>

    <Form.Item
      name="highlightedFieldsText"
      label="Подсвеченные поля (по одному на строку)"
    >
      <Input.TextArea
        rows={5}
        placeholder={"Серия и номер\nКем выдан\nДата выдачи"}
      />
    </Form.Item>
  </Form>
);

const createDocumentTypeColumns = ({
  uploadingId,
  deletingId,
  onUploadSample,
  onOpenViewer,
  onOpenEditModal,
  onDeleteSample,
}) => [
  {
    title: "Тип документа",
    key: "type",
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        <Typography.Text strong>
          {record.label || record.name || record.code}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {record.code}
        </Typography.Text>
      </Space>
    ),
    width: 260,
  },
  {
    title: "Образец",
    key: "sample",
    render: (_, record) => (
      <Space direction="vertical" size={4}>
        {record.hasSample ? (
          <>
            <Tag color="green">Загружен</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.sampleOriginalName || "Файл образца"}
            </Typography.Text>
          </>
        ) : (
          <Tag>Не загружен</Tag>
        )}
      </Space>
    ),
    width: 170,
  },
  {
    title: "Активен",
    key: "active",
    render: (_, record) =>
      record.isActive ? (
        <Tag color="blue">Да</Tag>
      ) : (
        <Tag color="default">Нет</Tag>
      ),
    width: 110,
  },
  {
    title: "Обязательный",
    key: "required",
    render: (_, record) =>
      record.isRequired ? (
        <Tag color="red">Да</Tag>
      ) : (
        <Tag color="default">Нет</Tag>
      ),
    width: 130,
  },
  {
    title: "Действия",
    key: "actions",
    render: (_, record) => (
      <Space wrap>
        <Upload
          accept={ACCEPTED_SAMPLE_EXTENSIONS}
          showUploadList={false}
          beforeUpload={(file) => onUploadSample(record, file)}
          disabled={uploadingId === record.id}
        >
          <Button
            size="small"
            icon={<UploadOutlined />}
            loading={uploadingId === record.id}
          >
            Загрузить
          </Button>
        </Upload>

        <Tooltip title="Предпросмотр образца">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onOpenViewer(record)}
            disabled={!record.hasSample}
          />
        </Tooltip>

        <Tooltip title="Редактировать метаданные">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onOpenEditModal(record)}
          />
        </Tooltip>

        <Popconfirm
          title="Удалить образец?"
          description="Файл образца будет удален из хранилища"
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={() => onDeleteSample(record)}
          disabled={!record.hasSample}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={deletingId === record.id}
            disabled={!record.hasSample}
          />
        </Popconfirm>
      </Space>
    ),
  },
];

const DocumentTypeSamplesSettingsSection = () => {
  const { message } = App.useApp();
  const [dataState, setDataState] = useState({
    items: [],
    loading: false,
    uploadingId: null,
    savingId: null,
    deletingId: null,
  });
  const [uiState, setUiState] = useState({
    editModalOpen: false,
    editingRecord: null,
    viewerVisible: false,
    viewerFile: null,
  });
  const [form] = Form.useForm();
  const { items, loading, uploadingId, savingId, deletingId } = dataState;
  const { editModalOpen, editingRecord, viewerVisible, viewerFile } = uiState;

  const loadDocumentTypes = useCallback(async () => {
    try {
      setDataState((prev) => ({ ...prev, loading: true }));
      const response = await employeeService.getDocumentTypesForAdmin();
      const list = response?.data || response || [];
      setDataState((prev) => ({
        ...prev,
        items: Array.isArray(list) ? list : [],
      }));
    } catch (error) {
      console.error("Error loading employee document types for admin:", error);
      message.error(
        error?.response?.data?.message ||
          "Ошибка загрузки типов документов для админки",
      );
    } finally {
      setDataState((prev) => ({ ...prev, loading: false }));
    }
  }, [message]);

  useEffect(() => {
    loadDocumentTypes();
  }, [loadDocumentTypes]);

  const patchItem = useCallback((id, nextItem) => {
    setDataState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? nextItem : item)),
    }));
  }, []);

  const handleOpenViewer = useCallback(
    (record) => {
      if (!record?.sampleUrl) {
        message.warning("Для этого типа документа образец пока не загружен");
        return;
      }

      setUiState((prev) => ({
        ...prev,
        viewerFile: {
          url: record.sampleUrl,
          mimeType:
            record.sampleMimeType || inferMimeTypeFromUrl(record.sampleUrl),
          fileName:
            record.sampleOriginalName ||
            `${record.label || record.name || record.code}`,
        },
        viewerVisible: true,
      }));
    },
    [message],
  );

  const handleUploadSample = useCallback(
    async (record, file) => {
      if (!SUPPORTED_SAMPLE_MIME_TYPES.has(file.type)) {
        message.error("Допустимы только PDF, JPG, PNG и WEBP");
        return Upload.LIST_IGNORE;
      }

      try {
        setDataState((prev) => ({ ...prev, uploadingId: record.id }));
        const response = await employeeService.uploadDocumentTypeSample(
          record.id,
          file,
        );
        const updated = response?.data || response;
        patchItem(record.id, updated);
        message.success("Образец загружен");
      } catch (error) {
        console.error("Error uploading document type sample:", error);
        message.error(
          error?.response?.data?.message || "Ошибка загрузки образца документа",
        );
      } finally {
        setDataState((prev) => ({ ...prev, uploadingId: null }));
      }

      return false;
    },
    [message, patchItem],
  );

  const handleDeleteSample = useCallback(
    async (record) => {
      try {
        setDataState((prev) => ({ ...prev, deletingId: record.id }));
        const response = await employeeService.deleteDocumentTypeSample(
          record.id,
        );
        const updated = response?.data || response;
        patchItem(record.id, updated);
        message.success("Образец удален");
      } catch (error) {
        console.error("Error deleting document type sample:", error);
        message.error(
          error?.response?.data?.message || "Ошибка удаления образца документа",
        );
      } finally {
        setDataState((prev) => ({ ...prev, deletingId: null }));
      }
    },
    [message, patchItem],
  );

  const openEditModal = useCallback(
    (record) => {
      setUiState((prev) => ({ ...prev, editingRecord: record }));
      form.setFieldsValue({
        name: record.label || record.name || "",
        description: record.description || "",
        sortOrder: Number(record.sortOrder || 0),
        isActive: Boolean(record.isActive),
        isRequired: Boolean(record.isRequired),
        highlightedFieldsText: toHighlightedFieldsText(
          record.sampleHighlightedFields,
        ),
      });
      setUiState((prev) => ({ ...prev, editModalOpen: true }));
    },
    [form],
  );

  const handleSaveDocumentType = useCallback(async () => {
    if (!editingRecord) return;

    try {
      const values = await form.validateFields();
      setDataState((prev) => ({ ...prev, savingId: editingRecord.id }));
      const response = await employeeService.updateDocumentType(
        editingRecord.id,
        {
          name: values.name,
          description: values.description || null,
          sortOrder: Number(values.sortOrder || 0),
          isActive: Boolean(values.isActive),
          isRequired: Boolean(values.isRequired),
          sampleHighlightedFields: parseHighlightedFields(
            values.highlightedFieldsText,
          ),
        },
      );
      const updated = response?.data || response;
      patchItem(editingRecord.id, updated);
      setUiState((prev) => ({
        ...prev,
        editModalOpen: false,
        editingRecord: null,
      }));
      message.success("Тип документа обновлен");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      console.error("Error updating document type:", error);
      message.error(
        error?.response?.data?.message || "Ошибка сохранения типа документа",
      );
    } finally {
      setDataState((prev) => ({ ...prev, savingId: null }));
    }
  }, [editingRecord, form, message, patchItem]);
  const columns = useMemo(
    () =>
      createDocumentTypeColumns({
        uploadingId,
        deletingId,
        onUploadSample: handleUploadSample,
        onOpenViewer: handleOpenViewer,
        onOpenEditModal: openEditModal,
        onDeleteSample: handleDeleteSample,
      }),
    [
      deletingId,
      handleDeleteSample,
      handleOpenViewer,
      handleUploadSample,
      openEditModal,
      uploadingId,
    ],
  );

  return (
    <Card size="small">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          size="small"
          pagination={false}
          scroll={{ x: 920 }}
        />
      </Space>

      <Modal
        title="Редактирование типа документа"
        open={editModalOpen}
        onCancel={() => {
          setUiState((prev) => ({
            ...prev,
            editModalOpen: false,
            editingRecord: null,
          }));
        }}
        onOk={handleSaveDocumentType}
        confirmLoading={savingId === editingRecord?.id}
        okText="Сохранить"
        cancelText="Отмена"
        okButtonProps={{ icon: <SaveOutlined /> }}
      >
        <DocumentTypeEditForm form={form} />
      </Modal>

      {viewerFile && (
        <FileViewer
          visible={viewerVisible}
          fileUrl={viewerFile.url}
          fileName={viewerFile.fileName}
          mimeType={viewerFile.mimeType}
          onClose={() =>
            setUiState((prev) => ({ ...prev, viewerVisible: false }))
          }
          onDownload={() => window.open(viewerFile.url, "_blank")}
        />
      )}
    </Card>
  );
};

export default DocumentTypeSamplesSettingsSection;
