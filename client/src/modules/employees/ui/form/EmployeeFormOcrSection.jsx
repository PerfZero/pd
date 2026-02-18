import { memo } from "react";
import { RobotOutlined } from "@ant-design/icons";
import { Alert, Button, Select, Space, Typography } from "antd";

const EmployeeFormOcrSection = memo(
  ({
    employeeId,
    selectedOcrFileId,
    loadingOcrFiles,
    ocrRunning,
    onSelectFile,
    onStartOcr,
    onRefreshFiles,
    selectedOcrDocumentType,
    selectedOcrDocumentLabel,
    ocrFiles,
    ocrFileTypeLabels,
  }) => (
    <div style={{ marginBottom: 16 }}>
      <Alert
        showIcon
        type="info"
        icon={<RobotOutlined />}
        message="OCR документов"
        description={
          employeeId
            ? "Выберите загруженный документ (паспорт/патент/КИГ/виза) и запустите распознавание. Пустые поля заполнятся автоматически."
            : "OCR доступен после сохранения сотрудника и загрузки файла документа."
        }
        action={
          <Space direction="vertical" size={8} style={{ width: 420 }}>
            <Select
              value={selectedOcrFileId}
              placeholder="Выберите файл документа"
              loading={loadingOcrFiles}
              disabled={!employeeId || loadingOcrFiles || ocrRunning}
              onChange={onSelectFile}
              popupMatchSelectWidth={false}
              dropdownStyle={{ minWidth: 420, maxWidth: 640 }}
              optionRender={(option) => (
                <span style={{ whiteSpace: "normal" }}>{option.data?.label}</span>
              )}
              style={{ width: "100%" }}
              options={ocrFiles.map((file) => {
                const documentType = file.documentType || file.document_type;
                const docLabel = ocrFileTypeLabels[documentType] || documentType;
                return {
                  value: file.id,
                  label: `${docLabel}: ${file.fileName} (${new Date(file.createdAt).toLocaleDateString("ru-RU")})`,
                };
              })}
            />
            <Space>
              <Button
                type="primary"
                onClick={onStartOcr}
                loading={ocrRunning}
                disabled={!employeeId || !selectedOcrFileId || !selectedOcrDocumentType}
              >
                Распознать документ
              </Button>
              <Button
                onClick={onRefreshFiles}
                disabled={!employeeId || loadingOcrFiles || ocrRunning}
              >
                Обновить файлы
              </Button>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {selectedOcrDocumentLabel
                ? `Выбран OCR-тип: ${selectedOcrDocumentLabel}`
                : "Для выбранного файла OCR-тип не определен"}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {employeeId
                ? `Найдено файлов для OCR: ${ocrFiles.length}`
                : "Сначала сохраните карточку сотрудника"}
            </Typography.Text>
          </Space>
        }
      />
    </div>
  ),
);

EmployeeFormOcrSection.displayName = "EmployeeFormOcrSection";

export default EmployeeFormOcrSection;
