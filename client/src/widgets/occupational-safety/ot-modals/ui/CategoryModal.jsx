import { Form, Input, InputNumber, Modal, Select } from "antd";

const CategoryModal = ({
  categoryModalOpen,
  editingCategory,
  onCloseCategoryModal,
  onSubmitCategory,
  categoryForm,
  categoryOptions,
  selectFullStyle,
  selectDropdownStyle,
}) => (
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
);

export default CategoryModal;
