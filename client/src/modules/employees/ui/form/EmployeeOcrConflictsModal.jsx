import { memo } from "react";
import { List, Modal, Radio, Space, Typography } from "antd";

const EmployeeOcrConflictsModal = memo(
  ({ open, conflicts, onCancel, onApply, onDecisionChange, formatFieldValue }) => (
    <Modal
      title={`Расхождения OCR (${conflicts.length})`}
      open={open}
      onCancel={onCancel}
      onOk={onApply}
      okText="Применить решения"
      cancelText="Отмена"
      width={980}
      maskClosable={false}
    >
      <Typography.Paragraph>
        Для каждого поля выберите, какое значение сохранить.
      </Typography.Paragraph>
      <List
        dataSource={conflicts}
        renderItem={(item) => (
          <List.Item key={item.fieldName}>
            <div
              style={{
                width: "100%",
                border: "1px solid #ffe58f",
                borderRadius: 8,
                background: "#fffbe6",
                padding: 12,
              }}
            >
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>{item.label}</Typography.Text>
                <Typography.Text>
                  Текущее: {formatFieldValue(item.fieldName, item.currentValue)}
                </Typography.Text>
                <Typography.Text>
                  OCR: {formatFieldValue(item.fieldName, item.ocrValue)}
                </Typography.Text>
                <Radio.Group
                  value={item.decision}
                  onChange={(event) =>
                    onDecisionChange(item.fieldName, event.target.value)
                  }
                >
                  <Radio value="keep">Оставить текущее</Radio>
                  <Radio value="replace">Заменить на OCR</Radio>
                </Radio.Group>
              </Space>
            </div>
          </List.Item>
        )}
      />
    </Modal>
  ),
);

EmployeeOcrConflictsModal.displayName = "EmployeeOcrConflictsModal";

export default EmployeeOcrConflictsModal;
