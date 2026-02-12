import { Button, List, Modal, Space, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, FileAddOutlined } from "@ant-design/icons";

const CategoryDocumentsModal = ({
  categoryDocumentsModalOpen,
  categoryDocumentsTarget,
  categoryDocumentsList,
  onCloseCategoryDocumentsModal,
  onOpenDocumentModal,
  onDeleteDocument,
}) => (
  <Modal
    open={categoryDocumentsModalOpen}
    width="85vw"
    title={
      categoryDocumentsTarget
        ? `Файлы подпункта: ${categoryDocumentsTarget.name}`
        : "Файлы подпункта"
    }
    onCancel={onCloseCategoryDocumentsModal}
    footer={[
      <Button key="cancel" onClick={onCloseCategoryDocumentsModal}>
        Закрыть
      </Button>,
      <Button
        key="add"
        type="primary"
        icon={<FileAddOutlined />}
        onClick={() => {
          onCloseCategoryDocumentsModal();
          onOpenDocumentModal(null, categoryDocumentsTarget?.id || null);
        }}
      >
        Добавить документ
      </Button>,
    ]}
  >
    <List
      dataSource={categoryDocumentsList}
      locale={{ emptyText: "В подпункте пока нет документов" }}
      renderItem={(doc) => (
        <List.Item
          actions={[
            <Tooltip key="edit" title="Редактировать">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  onCloseCategoryDocumentsModal();
                  onOpenDocumentModal(doc);
                }}
              />
            </Tooltip>,
            <Tooltip key="delete" title="Удалить">
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
            title={<span>{doc.name}</span>}
            description={
              <Space direction="vertical" size={2}>
                {doc.isRequired && (
                  <Tag color="red" style={{ width: "fit-content", margin: 0 }}>
                    Обязательный
                  </Tag>
                )}
                <span>{doc.description || "Без описания"}</span>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  </Modal>
);

export default CategoryDocumentsModal;
