import { Form, Input, Modal, Select, Switch } from "antd";

const DocumentModal = ({
  documentModalOpen,
  editingDocument,
  onCloseDocumentModal,
  onSubmitDocument,
  documentForm,
  categoryOptions,
  selectFullStyle,
  selectDropdownStyle,
}) => (
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
      <Form.Item name="isRequired" label="Обязательный" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Form>
  </Modal>
);

export default DocumentModal;
