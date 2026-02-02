import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Upload,
  Button,
  Switch,
  Space,
  List,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const OtModals = ({
  categoryModalOpen,
  editingCategory,
  onCloseCategoryModal,
  onSubmitCategory,
  categoryForm,
  categoryOptions,
  selectFullStyle,
  selectDropdownStyle,
  documentModalOpen,
  editingDocument,
  onCloseDocumentModal,
  onSubmitDocument,
  documentForm,
  templateModalOpen,
  onCloseTemplateModal,
  onSubmitTemplate,
  templateForm,
  templateFileList,
  onTemplateFileListChange,
  instructionModalOpen,
  onCloseInstructionModal,
  onSubmitInstruction,
  instructionForm,
  instructionFileList,
  onInstructionFileListChange,
  documentCommentModalOpen,
  documentCommentTarget,
  onCloseDocumentCommentModal,
  documentCommentsLoading,
  documentComments,
  documentCommentText,
  onDocumentCommentTextChange,
  onAddDocumentComment,
}) => (
  <>
    <Modal
      open={categoryModalOpen}
      title={editingCategory ? "Редактировать категорию" : "Новая категория"}
      onCancel={onCloseCategoryModal}
      onOk={onSubmitCategory}
      okText={editingCategory ? "Сохранить" : "Создать"}
      cancelText="Отмена"
    >
      <Form form={categoryForm} layout="vertical">
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, message: "Укажите название" }]}
        >
          <Input placeholder="Название категории" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} placeholder="Описание" />
        </Form.Item>
        <Form.Item name="parentId" label="Родительская категория">
          <Select
            allowClear
            options={categoryOptions.filter(
              (option) => option.value !== editingCategory?.id,
            )}
            style={selectFullStyle}
            popupMatchSelectWidth={false}
            styles={{ popup: { root: selectDropdownStyle } }}
          />
        </Form.Item>
        <Form.Item name="sortOrder" label="Порядок">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
    <Modal
      open={documentModalOpen}
      title={editingDocument ? "Редактировать документ" : "Новый документ"}
      onCancel={onCloseDocumentModal}
      onOk={onSubmitDocument}
      okText={editingDocument ? "Сохранить" : "Создать"}
      cancelText="Отмена"
    >
      <Form form={documentForm} layout="vertical">
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, message: "Укажите название" }]}
        >
          <Input placeholder="Название документа" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} placeholder="Описание" />
        </Form.Item>
        <Form.Item
          name="categoryId"
          label="Категория"
          rules={[{ required: true, message: "Выберите категорию" }]}
        >
          <Select
            options={categoryOptions}
            style={selectFullStyle}
            popupMatchSelectWidth={false}
            styles={{ popup: { root: selectDropdownStyle } }}
          />
        </Form.Item>
        <Form.Item
          name="isRequired"
          label="Обязательный"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
    <Modal
      open={templateModalOpen}
      title="Новый шаблон"
      onCancel={onCloseTemplateModal}
      onOk={onSubmitTemplate}
      okText="Добавить"
      cancelText="Отмена"
    >
      <Form form={templateForm} layout="vertical">
        <Form.Item name="name" label="Название">
          <Input placeholder="Название шаблона" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} placeholder="Описание" />
        </Form.Item>
        <Form.Item
          label="Файл"
          required
          validateStatus={templateFileList.length === 0 ? "error" : ""}
          help={templateFileList.length === 0 ? "Выберите файл" : ""}
        >
          <Upload
            fileList={templateFileList}
            beforeUpload={() => false}
            onChange={({ fileList }) => onTemplateFileListChange(fileList)}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Выбрать файл</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
    <Modal
      open={instructionModalOpen}
      title="Новая инструкция"
      onCancel={onCloseInstructionModal}
      onOk={onSubmitInstruction}
      okText="Добавить"
      cancelText="Отмена"
    >
      <Form form={instructionForm} layout="vertical">
        <Form.Item name="text" label="Текст">
          <Input.TextArea rows={4} placeholder="Текст инструкции" />
        </Form.Item>
        <Form.Item label="Файл (опционально)">
          <Upload
            fileList={instructionFileList}
            beforeUpload={() => false}
            onChange={({ fileList }) => onInstructionFileListChange(fileList)}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Выбрать файл</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
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
            const creatorName = [
              item.creator?.lastName,
              item.creator?.firstName,
            ]
              .filter(Boolean)
              .join(" ");
            const title = creatorName
              ? `${creatorName} • ${dayjs(item.createdAt).format(
                  "DD.MM.YYYY HH:mm",
                )}`
              : dayjs(item.createdAt).format("DD.MM.YYYY HH:mm");

            return (
              <List.Item>
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
  </>
);

export default OtModals;
