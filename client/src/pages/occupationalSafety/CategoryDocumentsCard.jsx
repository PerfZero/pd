import {
  Card,
  Space,
  Typography,
  Button,
  Select,
  List,
  Tooltip,
  Tag,
} from "antd";
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const CategoryDocumentsCard = ({
  categoryOptions,
  selectedCategoryId,
  onSelectCategory,
  selectCollapsedStyle,
  selectDropdownStyle,
  filteredDocuments,
  onDownloadTemplate,
  templateUploadingId,
  onTemplateUploadClick,
  onOpenDocumentModal,
  onDeleteDocument,
}) => (
  <Card size="small">
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <Title level={5} style={{ margin: 0, flex: 1, minWidth: 0 }}>
          Документы в категориях
        </Title>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => onOpenDocumentModal()}
          style={{ flexShrink: 0 }}
        >
          Добавить документ
        </Button>
      </div>
      <Select
        placeholder="Категория"
        options={[{ label: "Все категории", value: "all" }, ...categoryOptions]}
        value={selectedCategoryId}
        onChange={onSelectCategory}
        style={selectCollapsedStyle}
        popupMatchSelectWidth={false}
        styles={{ popup: { root: selectDropdownStyle } }}
        optionLabelProp="selectLabel"
        allowClear
      />
      <List
        dataSource={filteredDocuments}
        locale={{ emptyText: "Документы не найдены" }}
        renderItem={(doc) => (
          <List.Item
            actions={[
              <Tooltip title="Скачать бланк" key="download">
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  disabled={!doc.templateFileId}
                  onClick={() => onDownloadTemplate(doc)}
                />
              </Tooltip>,
              <Tooltip title="Загрузить бланк" key="upload">
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  loading={templateUploadingId === doc.id}
                  onClick={() => onTemplateUploadClick(doc)}
                />
              </Tooltip>,
              <Tooltip title="Редактировать" key="edit">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenDocumentModal(doc)}
                />
              </Tooltip>,
              <Tooltip title="Удалить" key="delete">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDeleteDocument(doc)}
                />
              </Tooltip>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{doc.name}</Text>
                  <Tag color={doc.isRequired ? "red" : "default"}>
                    {doc.isRequired ? "Обязательный" : "Необязательный"}
                  </Tag>
                </Space>
              }
              description={doc.description || "—"}
            />
          </List.Item>
        )}
      />
    </Space>
  </Card>
);

export default CategoryDocumentsCard;
