import { Button, Space } from "antd";
import {
  PlusOutlined,
  FileExcelOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

/**
 * Feature: Действия над сотрудниками (добавление, заявка, импорт, блокировка)
 */
export const EmployeeActions = ({
  onAdd,
  onRequest,
  onImport,
  onSecurity,
  canExport,
}) => {
  const { t } = useTranslation();

  return (
    <Space size="middle">
      <Button type="primary" icon={<FileExcelOutlined />} onClick={onRequest}>
        {t("employees.requestExcel")}
      </Button>
      <Button type="default" icon={<FileExcelOutlined />} onClick={onImport}>
        {t("employees.importExcel")}
      </Button>
      {canExport && (
        <Button type="default" icon={<LockOutlined />} onClick={onSecurity}>
          {t("employees.security")}
        </Button>
      )}
      <Button type="default" icon={<PlusOutlined />} onClick={onAdd}>
        {t("employees.addEmployee")}
      </Button>
    </Space>
  );
};
