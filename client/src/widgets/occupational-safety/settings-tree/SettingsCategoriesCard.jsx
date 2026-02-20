import { memo, useMemo, useState, useEffect } from "react";
import { Card, Space, Typography, Button, Tree, Empty, Tooltip } from "antd";
import { PlusOutlined, FileAddOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const SettingsCategoriesCard = memo(
  ({
    loading,
    treeData,
    onSelectCategoryNode,
    onAddCategory,
    onAddDocument,
  }) => {
    const allExpandableKeys = useMemo(() => {
      const keys = [];
      const walk = (nodes = []) => {
        nodes.forEach((node) => {
          if (!node) return;
          const children = node.children || [];
          if (children.length > 0) {
            keys.push(node.key);
            walk(children);
          }
        });
      };
      walk(treeData);
      return keys;
    }, [treeData]);

    const [expandedKeys, setExpandedKeys] = useState(null);

    useEffect(() => {
      if (!Array.isArray(expandedKeys)) return;
      const availableKeys = new Set(allExpandableKeys);
      setExpandedKeys((prev) => {
        const next = prev.filter((key) => availableKeys.has(key));
        const isSame =
          next.length === prev.length &&
          next.every((key, index) => key === prev[index]);
        return isSame ? prev : next;
      });
    }, [allExpandableKeys, expandedKeys]);

    const resolvedExpandedKeys = expandedKeys ?? allExpandableKeys;

    return (
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
              <Tooltip title="Развернуть все">
                <Button
                  size="small"
                  onClick={() => setExpandedKeys(allExpandableKeys)}
                  disabled={allExpandableKeys.length === 0}
                >
                  +
                </Button>
              </Tooltip>
              <Tooltip title="Свернуть все">
                <Button
                  size="small"
                  onClick={() => setExpandedKeys([])}
                  disabled={allExpandableKeys.length === 0}
                >
                  -
                </Button>
              </Tooltip>
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
              expandedKeys={resolvedExpandedKeys}
              treeData={treeData}
              onExpand={(keys) => setExpandedKeys(keys)}
              onSelect={(_, info) => onSelectCategoryNode?.(info?.node)}
            />
          )}
        </Space>
      </Card>
    );
  },
);

SettingsCategoriesCard.displayName = "SettingsCategoriesCard";

export default SettingsCategoriesCard;
