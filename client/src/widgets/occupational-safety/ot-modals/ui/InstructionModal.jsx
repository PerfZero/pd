import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Upload } from "antd";

const InstructionModal = ({
  instructionModalOpen,
  onCloseInstructionModal,
  onSubmitInstruction,
  instructionForm,
  instructionFileList,
  onInstructionFileListChange,
}) => (
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
);

export default InstructionModal;
