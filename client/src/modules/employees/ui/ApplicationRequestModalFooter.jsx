import { Button, Space } from "antd";
import { DownloadOutlined, FileExcelOutlined } from "@ant-design/icons";

const ApplicationRequestModalFooter = ({
  downloadingConsents,
  onDownloadConsents,
  selectedCount,
  onCancel,
  onCreate,
  loading,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Button
      icon={<DownloadOutlined />}
      onClick={onDownloadConsents}
      loading={downloadingConsents}
      disabled={selectedCount === 0}
    >
      Выгрузить согласие на обработку перс. данных
    </Button>
    <Space>
      <Button onClick={onCancel}>Отмена</Button>
      <Button
        type="primary"
        icon={<FileExcelOutlined />}
        onClick={onCreate}
        loading={loading}
        disabled={selectedCount === 0}
      >
        Создать ({selectedCount})
      </Button>
    </Space>
  </div>
);

export default ApplicationRequestModalFooter;
