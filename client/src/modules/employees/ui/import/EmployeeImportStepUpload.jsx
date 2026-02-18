import { memo } from "react";
import { LinkOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Divider, Upload } from "antd";

const EmployeeImportStepUpload = memo(({ fileName, onFileSelect, onOpenTemplate }) => (
  <div style={{ padding: "40px 20px" }}>
    <div style={{ textAlign: "center", marginBottom: "32px" }}>
      <Upload
        maxCount={1}
        accept=".xlsx,.xls"
        beforeUpload={onFileSelect}
        fileList={fileName ? [{ name: fileName, uid: "-1" }] : []}
        droppable
      >
        <Button icon={<UploadOutlined />} size="large">
          Выберите файл Excel
        </Button>
      </Upload>
      <p style={{ marginTop: "12px", color: "#666", fontSize: "12px" }}>
        или перетащите файл сюда
      </p>
    </div>

    <Divider />

    <div style={{ marginBottom: "24px" }}>
      <h4 style={{ marginBottom: "12px" }}>📋 Структура файла:</h4>
      <p style={{ color: "#666", marginBottom: "8px", fontSize: "12px" }}>
        Файл должен содержать следующие столбцы:
      </p>
      <div
        style={{
          background: "#f5f5f5",
          padding: "12px",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        <div>
          №, Фамилия, Имя, Отчество, КИГ, Срок окончания КИГ, Гражданство,
        </div>
        <div>Дата рождения, СНИЛС, Должность, ИНН сотрудника,</div>
        <div>
          Организация, <strong>ИНН организации</strong>, <strong>КПП организации</strong>
        </div>
      </div>
    </div>

    <div style={{ marginBottom: "16px" }}>
      <h4 style={{ marginBottom: "8px" }}>🔗 Скачать шаблон:</h4>
      <Button type="link" icon={<LinkOutlined />} onClick={onOpenTemplate} style={{ padding: 0 }}>
        Google таблица с бланком
      </Button>
    </div>

    <div
      style={{
        background: "#e6f7ff",
        padding: "12px",
        borderRadius: "4px",
        fontSize: "12px",
      }}
    >
      <div style={{ marginBottom: "8px" }}>
        <strong>ℹ️ Примечание:</strong> Столбец № пропускается. Столбцы, не указанные выше, игнорируются.
      </div>
      <div>
        <strong>🏢 Контрагенты:</strong> <strong>ИНН организации</strong> и <strong>КПП организации</strong> - контрагент должен быть вашей организацией или вашим субподрядчиком.
      </div>
    </div>
  </div>
));

EmployeeImportStepUpload.displayName = "EmployeeImportStepUpload";

export default EmployeeImportStepUpload;
