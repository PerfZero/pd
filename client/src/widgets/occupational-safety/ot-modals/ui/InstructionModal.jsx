import { UploadOutlined } from "@ant-design/icons";
import { Button, Checkbox, Form, Input, Modal, Typography, Upload } from "antd";

const { Text } = Typography;

const InstructionModal = ({
  instructionModalOpen,
  onCloseInstructionModal,
  onSubmitInstruction,
  editingInstruction,
  instructionForm,
  instructionFileList,
  onInstructionFileListChange,
}) => (
  <Modal
    open={instructionModalOpen}
    title={editingInstruction ? "Редактировать инструкцию" : "Новая инструкция"}
    onCancel={onCloseInstructionModal}
    onOk={onSubmitInstruction}
    okText={editingInstruction ? "Сохранить" : "Добавить"}
    cancelText="Отмена"
  >
    <Form form={instructionForm} layout="vertical">
      <Form.Item name="text" label="Текст">
        <Input.TextArea rows={4} placeholder="Текст инструкции" />
      </Form.Item>
      {editingInstruction?.fileId && (
        <Form.Item
          name="removeFile"
          valuePropName="checked"
          style={{ marginBottom: 8 }}
        >
          <Checkbox>Удалить текущий файл</Checkbox>
        </Form.Item>
      )}
      {editingInstruction?.fileId && (
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          Текущий файл:{" "}
          {editingInstruction?.file?.originalName ||
            editingInstruction?.file?.fileName ||
            "прикреплен"}
        </Text>
      )}
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
);

export default InstructionModal;
