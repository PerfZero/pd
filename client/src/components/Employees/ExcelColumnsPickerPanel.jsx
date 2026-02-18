import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Divider, Row, Space } from "antd";

const ExcelColumnsPickerPanel = ({
  columns,
  activeCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onToggleColumn,
  onMoveColumnUp,
  onMoveColumnDown,
}) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
    <Space direction="vertical" size={8} style={{ width: "100%", flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
        }}
      >
        <span style={{ color: "#666" }}>
          Выбрано: <strong>{activeCount}</strong> / <strong>{totalCount}</strong>
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            type="link"
            size="small"
            onClick={onSelectAll}
            style={{ fontSize: 12, padding: "0 4px" }}
          >
            Все
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={onDeselectAll}
            style={{ fontSize: 12, padding: "0 4px" }}
          >
            Очистить
          </Button>
        </div>
      </div>

      <Divider style={{ margin: "4px 0" }} />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          {columns.map((column, index) => (
            <Row
              key={column.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px",
                border: "1px solid #f0f0f0",
                borderRadius: "3px",
                fontSize: 13,
              }}
            >
              <Col flex="auto" style={{ minWidth: 0 }}>
                <Checkbox
                  checked={column.enabled}
                  onChange={() => onToggleColumn(column.key)}
                  style={{ fontSize: 12 }}
                >
                  <span style={{ fontSize: 12 }}>{column.label}</span>
                </Checkbox>
              </Col>

              <Col flex="50px" style={{ textAlign: "right" }}>
                <Space size={0}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    onClick={() => onMoveColumnUp(column.key)}
                    disabled={index === 0}
                    title="Вверх"
                    style={{ padding: "2px 4px", height: "24px", width: "24px" }}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    onClick={() => onMoveColumnDown(column.key)}
                    disabled={index === columns.length - 1}
                    title="Вниз"
                    style={{ padding: "2px 4px", height: "24px", width: "24px" }}
                  />
                </Space>
              </Col>
            </Row>
          ))}
        </Space>
      </div>
    </Space>
  </div>
);

export default ExcelColumnsPickerPanel;
