import { memo } from "react";
import { FileExcelOutlined } from "@ant-design/icons";
import { Button } from "antd";

const ApplicationRequestActionsBar = memo(
  ({ selectedCount, availableCount, isLoading, onCancel, onCreate }) => (
    <div
      style={{
        padding: "16px",
        borderTop: "1px solid #f0f0f0",
        display: "flex",
        gap: 12,
        background: "#fff",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        maxWidth: "100vw",
      }}
    >
      <Button onClick={onCancel} style={{ flex: 1 }}>
        Отмена
      </Button>
      <Button
        type="primary"
        icon={<FileExcelOutlined />}
        onClick={onCreate}
        loading={isLoading}
        disabled={selectedCount === 0 || availableCount === 0}
        style={{ flex: 1, background: "#52c41a", borderColor: "#52c41a" }}
      >
        Создать ({selectedCount})
      </Button>
    </div>
  ),
);

ApplicationRequestActionsBar.displayName = "ApplicationRequestActionsBar";

export default ApplicationRequestActionsBar;
