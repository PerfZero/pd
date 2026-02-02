import { memo } from "react";
import { Card, Space, Typography, Button, Tree, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const SettingsCategoriesCard = memo(
  ({ loading, treeData, onAddCategory }) => (
    <Card size="small">
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={5} style={{ margin: 0 }}>
            Категории
          </Title>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddCategory}
          >
            Добавить категорию
          </Button>
        </Space>
        {loading ? (
          <Text type="secondary">Загрузка...</Text>
        ) : treeData.length === 0 ? (
          <Empty description="Категории не созданы" />
        ) : (
          <Tree blockNode showLine defaultExpandAll treeData={treeData} />
        )}
      </Space>
    </Card>
  ),
);

export default SettingsCategoriesCard;
