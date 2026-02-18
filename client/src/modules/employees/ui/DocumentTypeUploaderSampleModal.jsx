import { Empty, List, Modal, Typography } from "antd";
import {
  getSampleUrl,
  isImageSample,
  isPdfSample,
} from "@/modules/employees/lib/documentTypeUploaderUtils";

const DocumentTypeUploaderSampleModal = ({ visible, docType, onClose }) => {
  const sampleHighlightedFields = Array.isArray(
    docType?.sampleHighlightedFields,
  )
    ? docType.sampleHighlightedFields
    : [];

  return (
    <Modal
      title={docType?.label || "Образец документа"}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={860}
      centered
    >
      {docType?.description && (
        <Typography.Paragraph style={{ marginBottom: 12 }}>
          {docType.description}
        </Typography.Paragraph>
      )}

      {getSampleUrl(docType) ? (
        <div className="document-sample-preview">
          {isImageSample(docType) && (
            <img
              src={getSampleUrl(docType)}
              alt={`Образец: ${docType?.label || "документ"}`}
            />
          )}

          {isPdfSample(docType) && (
            <object
              data={getSampleUrl(docType)}
              type="application/pdf"
              width="100%"
              height="560"
            >
              <Typography.Paragraph>
                Не удалось встроить PDF.{" "}
                <a
                  href={getSampleUrl(docType)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть в новой вкладке
                </a>
              </Typography.Paragraph>
            </object>
          )}

          {!isImageSample(docType) && !isPdfSample(docType) && (
            <Typography.Paragraph>
              Формат образца не поддерживает встроенный просмотр.{" "}
              <a
                href={getSampleUrl(docType)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть образец
              </a>
            </Typography.Paragraph>
          )}
        </div>
      ) : (
        <Empty description="Образец для этого типа документа пока не загружен" />
      )}

      {sampleHighlightedFields.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Typography.Text strong>
            Поля, на которые нужно обратить внимание:
          </Typography.Text>
          <List
            size="small"
            dataSource={sampleHighlightedFields}
            renderItem={(field) => (
              <List.Item key={`highlighted-field-${String(field)}`}>
                {String(field)}
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
};

export default DocumentTypeUploaderSampleModal;
