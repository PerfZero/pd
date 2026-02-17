import { Card, Space, Typography, Button, Divider, List, Empty } from "antd";
import {
  PlusOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;

const InstructionsCard = ({
  latestInstruction,
  settingsInstructions,
  onOpenInstructionModal,
  onDownloadInstructionFile,
  onEditInstruction,
  onDeleteInstruction,
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
          Инструкции для подрядчиков
        </Title>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          onClick={onOpenInstructionModal}
          style={{ flexShrink: 0 }}
        >
          Добавить
        </Button>
      </div>
      {latestInstruction ? (
        <>
          <Space wrap>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              disabled={!latestInstruction.fileId}
              onClick={() => onDownloadInstructionFile(latestInstruction)}
            >
              Скачать инструкцию
            </Button>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEditInstruction(latestInstruction)}
            >
              Редактировать
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteInstruction(latestInstruction)}
            >
              Удалить
            </Button>
          </Space>
          <Divider style={{ margin: "12px 0" }} />
          <List
            size="small"
            dataSource={settingsInstructions}
            locale={{ emptyText: "Инструкции не найдены" }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  item.fileId ? (
                    <Button
                      key="download"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => onDownloadInstructionFile(item)}
                    >
                      Скачать
                    </Button>
                  ) : null,
                  <Button
                    key="edit"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEditInstruction(item)}
                  >
                    Редактировать
                  </Button>,
                  <Button
                    key="delete"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDeleteInstruction(item)}
                  >
                    Удалить
                  </Button>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={dayjs(item.createdAt).format("DD.MM.YYYY HH:mm")}
                  description={item.text || "Без текста"}
                />
              </List.Item>
            )}
          />
        </>
      ) : (
        <Empty description="Инструкции не добавлены" />
      )}
    </Space>
  </Card>
);

export default InstructionsCard;
