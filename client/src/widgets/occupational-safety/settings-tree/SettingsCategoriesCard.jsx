import { memo } from "react";
import { Card, Space, Typography, Button, Tree, Empty } from "antd";
import { PlusOutlined, FileAddOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const SettingsCategoriesCard = memo(
  ({
    loading,
    treeData,
    onSelectCategoryNode,
    onAddCategory,
    onAddDocument,
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
            Категории и документы
          </Title>
          <Space size={8} wrap style={{ justifyContent: "flex-end" }}>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onAddCategory()}
              style={{ flexShrink: 0 }}
            >
              Категория
            </Button>
            <Button
              size="small"
              icon={<FileAddOutlined />}
              onClick={() => onAddDocument()}
              style={{ flexShrink: 0 }}
            >
              Документ
            </Button>
          </Space>
        </div>
        {loading ? (
          <Text type="secondary">Загрузка...</Text>
        ) : treeData.length === 0 ? (
          <Empty description="Категории и документы не созданы" />
        ) : (
          <Tree
            blockNode
            showLine
            defaultExpandAll
            treeData={treeData}
            onSelect={(_, info) => onSelectCategoryNode?.(info?.node)}
          />
        )}
      </Space>
    </Card>
  ),
);

SettingsCategoriesCard.displayName = "SettingsCategoriesCard";

export default SettingsCategoriesCard;
