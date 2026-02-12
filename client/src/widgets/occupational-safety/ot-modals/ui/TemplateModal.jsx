import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Upload } from "antd";

const TemplateModal = ({
  templateModalOpen,
  onCloseTemplateModal,
  onSubmitTemplate,
  templateForm,
  templateFileList,
  onTemplateFileListChange,
}) => (
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
);

export default TemplateModal;
