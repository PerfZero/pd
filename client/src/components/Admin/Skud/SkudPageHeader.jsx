import { memo } from "react";
import { Space, Tag, Typography } from "antd";

const { Title, Text } = Typography;

const SkudPageHeader = memo(({ isDemo }) => (
  <div
    style={{
      flexShrink: 0,
      padding: "16px 24px",
      borderBottom: "1px solid #f0f0f0",
    }}
  >
    <Space align="center" size={10}>
      <Title level={4} style={{ margin: 0 }}>
        СКУД
      </Title>
      {isDemo ? <Tag color="gold">Демо-данные</Tag> : null}
    </Space>
    <Text type="secondary">
      Управление доступом, картами, QR, настройками и журналом событий.
    </Text>
  </div>
));

SkudPageHeader.displayName = "SkudPageHeader";

export default SkudPageHeader;
