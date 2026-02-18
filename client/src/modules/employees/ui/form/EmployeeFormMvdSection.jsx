import { memo } from "react";
import { FileSearchOutlined } from "@ant-design/icons";
import { Alert, Button } from "antd";

const EmployeeFormMvdSection = memo(
  ({ mvdMetaLoading, mvdCheckLoading, onOpenMvdModal }) => (
    <div style={{ marginBottom: 16 }}>
      <Alert
        showIcon
        type="info"
        icon={<FileSearchOutlined />}
        message="Проверка МВД (api-cloud.ru)"
        description="Проверка сведений сотрудника через интеграцию с API Cloud."
        action={
          <Button
            onClick={onOpenMvdModal}
            loading={mvdMetaLoading}
            disabled={mvdCheckLoading}
          >
            Проверить в МВД
          </Button>
        }
      />
    </div>
  ),
);

EmployeeFormMvdSection.displayName = "EmployeeFormMvdSection";

export default EmployeeFormMvdSection;
