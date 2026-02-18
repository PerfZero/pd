import {
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  StarFilled,
  StarOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Divider, List, Popconfirm, Space, Tag, Tooltip } from "antd";

const ExcelColumnsSetsPanel = ({
  columnSets,
  setsLoading,
  onCreateSet,
  onApplySet,
  onSetDefault,
  onUpdateSetColumns,
  onEditSet,
  onDeleteSet,
}) => (
  <div
    style={{
      width: 320,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
    }}
  >
    <Space
      direction="vertical"
      size={8}
      style={{ width: "100%", flex: 1, minHeight: 0 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          Сохранённые наборы
        </span>
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          onClick={onCreateSet}
        >
          Сохранить
        </Button>
      </div>

      <Divider style={{ margin: "4px 0" }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {columnSets.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#999",
              padding: "20px 0",
              fontSize: 12,
            }}
          >
            Нет сохранённых наборов
          </div>
        ) : (
          <List
            size="small"
            dataSource={columnSets}
            loading={setsLoading}
            renderItem={(set) => (
              <List.Item
                key={set.id}
                style={{
                  padding: "8px",
                  border: "1px solid #f0f0f0",
                  borderRadius: "4px",
                  marginBottom: "6px",
                  cursor: "pointer",
                  transition: "background-color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#1890ff";
                  e.currentTarget.style.backgroundColor = "#f0f5ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#f0f0f0";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => onApplySet(set)}
              >
                <List.Item.Meta
                  title={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {set.name}
                      </span>
                      {set.isDefault ? (
                        <Tag
                          color="gold"
                          style={{ margin: 0, fontSize: 11, padding: "0 4px" }}
                        >
                          По умолчанию
                        </Tag>
                      ) : null}
                    </div>
                  }
                  description={
                    <div style={{ fontSize: 11, color: "#999" }}>
                      {set.columns?.filter((column) => column.enabled).length ||
                        0}{" "}
                      столбцов
                    </div>
                  }
                />
                <Space size={2} onClick={(e) => e.stopPropagation()}>
                  <Tooltip
                    title={
                      set.isDefault ? "По умолчанию" : "Сделать по умолчанию"
                    }
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={
                        set.isDefault ? (
                          <StarFilled style={{ color: "#faad14" }} />
                        ) : (
                          <StarOutlined />
                        )
                      }
                      onClick={() => onSetDefault(set.id)}
                      style={{ padding: "2px 4px" }}
                    />
                  </Tooltip>

                  <Tooltip title="Обновить текущими настройками">
                    <Button
                      type="text"
                      size="small"
                      icon={<SyncOutlined />}
                      onClick={() => onUpdateSetColumns(set)}
                      style={{ padding: "2px 4px" }}
                    />
                  </Tooltip>

                  <Tooltip title="Редактировать название">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => onEditSet(set)}
                      style={{ padding: "2px 4px" }}
                    />
                  </Tooltip>

                  <Popconfirm
                    title="Удалить набор?"
                    description="Это действие нельзя отменить"
                    onConfirm={() => onDeleteSet(set.id)}
                    okText="Удалить"
                    cancelText="Отмена"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      style={{ padding: "2px 4px" }}
                    />
                  </Popconfirm>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>
    </Space>
  </div>
);

export default ExcelColumnsSetsPanel;
