import { Card, Space, Typography, Button, Divider, List, Empty } from "antd";
import { PlusOutlined, DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const InstructionsCard = ({
  latestInstruction,
  settingsInstructions,
  onOpenInstructionModal,
  onDownloadInstructionFile,
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
          Редактировать
        </Button>
      </div>
      {latestInstruction ? (
        <>
          <Text type="secondary">
            {latestInstruction.text || "Инструкция без текста"}
          </Text>
          <Space wrap>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              disabled={!latestInstruction.fileId}
              onClick={() => onDownloadInstructionFile(latestInstruction)}
            >
              Скачать инструкцию
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
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => onDownloadInstructionFile(item)}
                    >
                      Скачать
                    </Button>
                  ) : null,
                ]}
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
