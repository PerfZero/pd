import { Button, Input, List, Modal, Space, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const DocumentCommentsModal = ({
  documentCommentModalOpen,
  documentCommentTarget,
  onCloseDocumentCommentModal,
  documentCommentsLoading,
  documentComments,
  documentCommentText,
  onDocumentCommentTextChange,
  onAddDocumentComment,
  onDeleteDocumentComment,
  canDeleteDocumentComments,
}) => (
  <Modal
    open={documentCommentModalOpen}
    title={
      documentCommentTarget
        ? `Комментарии: ${documentCommentTarget.name}`
        : "Комментарии к документу"
    }
    onCancel={onCloseDocumentCommentModal}
    footer={null}
  >
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <List
        loading={documentCommentsLoading}
        dataSource={documentComments}
        locale={{ emptyText: "Комментариев пока нет" }}
        renderItem={(item) => {
          const creatorName = [item.creator?.lastName, item.creator?.firstName]
            .filter(Boolean)
            .join(" ");
          const title = creatorName
            ? `${creatorName} • ${dayjs(item.createdAt).format(
                "DD.MM.YYYY HH:mm",
              )}`
            : dayjs(item.createdAt).format("DD.MM.YYYY HH:mm");

          return (
            <List.Item
              actions={
                canDeleteDocumentComments
                  ? [
                      <Tooltip key="delete" title="Удалить">
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => onDeleteDocumentComment(item)}
                        />
                      </Tooltip>,
                    ]
                  : []
              }
            >
              <List.Item.Meta title={title} description={item.text} />
            </List.Item>
          );
        }}
      />
      <Input.TextArea
        rows={3}
        placeholder="Добавить комментарий"
        value={documentCommentText}
        onChange={onDocumentCommentTextChange}
      />
      <Button
        type="primary"
        onClick={onAddDocumentComment}
        disabled={!documentCommentText.trim()}
      >
        Добавить комментарий
      </Button>
    </Space>
  </Modal>
);

export default DocumentCommentsModal;
