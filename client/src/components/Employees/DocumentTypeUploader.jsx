import { useState, useEffect, useRef, useCallback } from "react";
import {
  Row,
  Col,
  Button,
  Upload,
  App,
  Tooltip,
  Spin,
  List,
  Space,
  Popconfirm,
  Modal,
  Empty,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { FileViewer } from "../../shared/ui/FileViewer";
import { employeeService } from "../../services/employeeService";
import {
  ALLOWED_MIME_TYPES,
  SUPPORTED_FORMATS,
  ALLOWED_EXTENSIONS,
} from "../../shared/constants/fileTypes.js";

// Типы документов
const DEFAULT_DOCUMENT_TYPES = [
  { value: "passport", label: "Паспорт" },
  { value: "bank_details", label: "Реквизиты счета" },
  { value: "kig", label: "КИГ" },
  { value: "patent_front", label: "Патент (лиц.)" },
  { value: "patent_back", label: "Патент (спин.)" },
  { value: "biometric_consent", label: "Согласие на перс.дан. Генподряд" },
  {
    value: "biometric_consent_developer",
    label: "Согласие на перс.дан. Застройщ",
  },
  { value: "diploma", label: "Диплом" },
  { value: "med_book", label: "Мед.книжка" },
  { value: "migration_card", label: "Миграционная карта" },
  { value: "arrival_notice", label: "Уведомление о прибытии" },
  { value: "patent_payment_receipt", label: "Чек оплаты патента" },
  { value: "mvd_notification", label: "Уведомление МВД" },
];

const splitIntoColumns = (items, columnsCount = 3) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const chunkSize = Math.max(1, Math.ceil(items.length / columnsCount));
  const columns = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    columns.push(items.slice(i, i + chunkSize));
  }

  return columns;
};

const getSampleMimeType = (docType) =>
  docType?.sampleMimeType || docType?.sample_mime_type || "";

const getSampleUrl = (docType) =>
  docType?.sampleUrl || docType?.sample_url || "";

const isImageSample = (docType) => {
  const sampleMimeType = getSampleMimeType(docType).toLowerCase();
  const sampleUrl = getSampleUrl(docType);
  return (
    sampleMimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(sampleUrl)
  );
};

const isPdfSample = (docType) => {
  const sampleMimeType = getSampleMimeType(docType).toLowerCase();
  const sampleUrl = getSampleUrl(docType);
  return sampleMimeType.includes("pdf") || /\.pdf(\?.*)?$/i.test(sampleUrl);
};

/**
 * Компонент для загрузки документов по типам с автоматической загрузкой
 * Каждый тип документа имеет отдельную кнопку с множественным выбором файлов
 */
const DocumentTypeUploader = ({
  employeeId,
  onFilesUpdated,
  readonly = false,
}) => {
  const { message } = App.useApp();
  const [uploadingTypes, setUploadingTypes] = useState({}); // { docType: true/false }
  const [allFiles, setAllFiles] = useState([]); // все загруженные файлы
  const [documentTypes, setDocumentTypes] = useState(DEFAULT_DOCUMENT_TYPES);
  const [loadingDocumentTypes, setLoadingDocumentTypes] = useState(false);
  const uploadingRef = useRef(new Set()); // Отслеживаем уже отправленные файлы
  const [viewerVisible, setViewerVisible] = useState(false); // Видимость модального окна
  const [viewingFile, setViewingFile] = useState(null); // Файл для просмотра
  const [sampleModalVisible, setSampleModalVisible] = useState(false);
  const [selectedSampleDocType, setSelectedSampleDocType] = useState(null);

  // Загрузить все файлы и обновить счетчики по типам
  const fetchAllFiles = useCallback(async () => {
    try {
      const response = await employeeService.getFiles(employeeId);
      const files = response?.data || response || [];
      setAllFiles(files);
    } catch (error) {
      console.error("Error loading files:", error);
      message.error("Ошибка загрузки файлов");
    }
  }, [employeeId, message]);

  // Загрузить файлы при инициализации и при изменении employeeId
  useEffect(() => {
    if (employeeId) {
      fetchAllFiles();
    }
  }, [employeeId, fetchAllFiles]);

  const fetchDocumentTypes = useCallback(async () => {
    setLoadingDocumentTypes(true);
    try {
      const response = await employeeService.getDocumentTypes();
      const types = response?.data || response || [];

      if (!Array.isArray(types) || types.length === 0) {
        setDocumentTypes(DEFAULT_DOCUMENT_TYPES);
        return;
      }

      const normalized = types
        .map((item) => ({
          value: item.value || item.code || "",
          label: item.label || item.name || item.code || "Без названия",
          description: item.description || "",
          sampleUrl: item.sampleUrl || item.sample_url || "",
          sampleMimeType: item.sampleMimeType || item.sample_mime_type || "",
          sampleHighlightedFields: Array.isArray(item.sampleHighlightedFields)
            ? item.sampleHighlightedFields
            : Array.isArray(item.sample_highlighted_fields)
              ? item.sample_highlighted_fields
              : [],
          sortOrder: Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : Number.isFinite(item.sort_order)
              ? item.sort_order
              : 0,
        }))
        .filter((item) => item.value);

      setDocumentTypes(
        normalized.length > 0 ? normalized : DEFAULT_DOCUMENT_TYPES,
      );
    } catch (error) {
      console.error("Error loading document types:", error);
      setDocumentTypes(DEFAULT_DOCUMENT_TYPES);
      message.warning(
        "Не удалось загрузить типы документов из БД. Используется базовый список.",
      );
    } finally {
      setLoadingDocumentTypes(false);
    }
  }, [message]);

  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  // Получить файлы для конкретного типа документа
  const getFilesForType = (documentType) => {
    return allFiles.filter((f) => f.documentType === documentType);
  };

  const getDocumentTypeLabel = (documentTypeValue) => {
    return (
      documentTypes.find((item) => item.value === documentTypeValue)?.label ||
      documentTypeValue
    );
  };

  const handleOpenSample = (docType) => {
    setSelectedSampleDocType(docType);
    setSampleModalVisible(true);
  };

  // Компонент для рендеринга одного типа документа
  const DocumentTypeItem = ({ docType }) => {
    const filesOfType = getFilesForType(docType.value);

    return (
      <div key={docType.value} className="document-uploader-item">
        <div className="document-uploader-header">
          <span className="document-uploader-label">
            <Tooltip title={docType.label}>{docType.label}</Tooltip>
          </span>
          <Tooltip
            title={
              getSampleUrl(docType)
                ? "Показать образец документа"
                : "Образец пока не добавлен"
            }
          >
            <Button
              type="text"
              size="small"
              className="document-uploader-info-button"
              icon={<InfoCircleOutlined />}
              onClick={() => handleOpenSample(docType)}
            />
          </Tooltip>

          {!readonly ? (
            <>
              <Upload
                accept={ALLOWED_EXTENSIONS}
                multiple={true}
                beforeUpload={(file) => {
                  // Проверка типа файла
                  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                    message.error(
                      `❌ ${file.name}: неподдерживаемый тип файла\n✅ Поддерживаются: ${SUPPORTED_FORMATS}`,
                    );
                    return Upload.LIST_IGNORE;
                  }

                  // Проверка размера файла (макс. 100 МБ)
                  const fileSizeMB = file.size / 1024 / 1024;
                  if (fileSizeMB > 100) {
                    message.error(
                      `❌ ${file.name}: размер файла ${fileSizeMB.toFixed(2)}MB превышает максимум 100MB`,
                    );
                    return Upload.LIST_IGNORE;
                  }

                  return false;
                }}
                onChange={(info) => handleChange(info, docType.value)}
                showUploadList={false}
                disabled={uploadingTypes[docType.value] || !employeeId}
              >
                <Button
                  size="small"
                  loading={uploadingTypes[docType.value]}
                  className="document-uploader-button"
                  disabled={!employeeId}
                >
                  {uploadingTypes[docType.value] ? "Загруз." : "Загрузить"}
                </Button>
              </Upload>

              <span className="document-uploader-count">
                {uploadingTypes[docType.value] ? (
                  <Spin size="small" />
                ) : (
                  <>
                    <CheckCircleOutlined
                      style={{ color: "#52c41a", marginRight: 4 }}
                    />
                    {filesOfType.length}
                  </>
                )}
              </span>
            </>
          ) : (
            <span className="document-uploader-count">
              <CheckCircleOutlined
                style={{ color: "#52c41a", marginRight: 4 }}
              />
              {filesOfType.length}
            </span>
          )}
        </div>

        {/* Список загруженных файлов */}
        {filesOfType.length > 0 && (
          <div className="document-uploader-files">
            <List
              size="small"
              dataSource={filesOfType}
              renderItem={(file) => {
                const displayName =
                  file.fileName ||
                  file.file_name ||
                  file.filename ||
                  file.original_name ||
                  file.originalName ||
                  "Неизвестный файл";

                return (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span style={{ fontSize: "12px" }}>{displayName}</span>
                      }
                    />
                    {!readonly && (
                      <Space size="small">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewFile(file)}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadFile(file)}
                        />
                        <Popconfirm
                          title="Удалить файл?"
                          description="Вы уверены, что хотите удалить этот файл?"
                          onConfirm={() => handleDeleteFile(file.id)}
                          okText="Да"
                          cancelText="Отмена"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </Space>
                    )}
                  </List.Item>
                );
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Обработка выбора файлов и их загрузка
  const handleChange = async (info, documentType) => {
    const { fileList } = info;

    if (fileList.length === 0) {
      return;
    }

    // Проверяем, не загружаются ли уже файлы
    if (uploadingTypes[documentType]) {
      return;
    }

    // Создаем уникальный ключ для этой загрузки (по размерам файлов)
    const uploadKey = fileList.map((f) => `${f.name}_${f.size}`).join("|");

    // Если эта загрузка уже в процессе, выходим
    if (uploadingRef.current.has(uploadKey)) {
      return;
    }

    // Добавляем в отслеживание
    uploadingRef.current.add(uploadKey);

    // Показываем индикатор загрузки
    setUploadingTypes((prev) => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();

      // Добавляем все выбранные файлы
      fileList.forEach((fileObj) => {
        const actualFile = fileObj.originFileObj || fileObj;
        formData.append("files", actualFile);
      });

      // Добавляем тип документа
      formData.append("documentType", documentType);

      // Загружаем файлы
      await employeeService.uploadFiles(employeeId, formData);

      message.success(`${getDocumentTypeLabel(documentType)} загружен(ы)`);

      // Небольшая задержка чтобы сервер обновил имена файлов
      setTimeout(() => {
        fetchAllFiles();
      }, 300);

      // Уведомляем родителя об обновлении
      if (onFilesUpdated) {
        onFilesUpdated();
      }
    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error);
      message.error(`Ошибка загрузки файла`);
    } finally {
      setUploadingTypes((prev) => ({ ...prev, [documentType]: false }));
      // Удаляем из отслеживания
      uploadingRef.current.delete(uploadKey);
    }
  };

  // Удаление файла
  const handleDeleteFile = async (fileId) => {
    try {
      await employeeService.deleteFile(employeeId, fileId);
      message.success("Файл удален");
      await fetchAllFiles();
      if (onFilesUpdated) {
        onFilesUpdated();
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      message.error("Ошибка удаления файла");
    }
  };

  // Скачать файл
  const handleDownloadFile = async (file) => {
    try {
      const downloadLink = await employeeService.getFileDownloadLink(
        employeeId,
        file.id,
      );

      // Извлекаем URL из ответа
      const url = downloadLink?.data?.downloadUrl || downloadLink?.downloadUrl;

      if (url && typeof url === "string") {
        window.open(url, "_blank");
      } else {
        console.error("❌ No download URL found in response:", downloadLink);
        message.error("Ошибка при получении ссылки скачивания");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      message.error("Ошибка скачивания файла");
    }
  };

  // Просмотр файла
  const handleViewFile = async (file) => {
    try {
      const viewLink = await employeeService.getFileViewLink(
        employeeId,
        file.id,
      );

      // Извлекаем URL из ответа
      const url = viewLink?.data?.viewUrl || viewLink?.viewUrl;

      if (url && typeof url === "string") {
        // Открываем модальное окно с просмотром
        setViewingFile({
          url,
          mimeType: file.mimeType || "application/pdf",
          fileName: file.fileName,
        });
        setViewerVisible(true);
      } else {
        console.error("❌ No view URL found in response:", viewLink);
        message.error("Ошибка при получении ссылки просмотра");
      }
    } catch (error) {
      console.error("Error viewing file:", error);
      message.error("Ошибка просмотра файла");
    }
  };

  const documentTypeColumns = splitIntoColumns(documentTypes, 3);
  const sampleHighlightedFields = Array.isArray(
    selectedSampleDocType?.sampleHighlightedFields,
  )
    ? selectedSampleDocType.sampleHighlightedFields
    : [];

  return (
    <div style={{ padding: "16px 0" }}>
      <style>{`
        .document-uploader-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .document-uploader-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          border-radius: 4px;
          background: #fafafa;
          border: 1px solid #f0f0f0;
        }
        .document-uploader-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .document-uploader-label {
          min-width: 140px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 0 0 auto;
        }
        .document-uploader-info-button {
          flex-shrink: 0;
          color: #1677ff;
        }
        .document-uploader-button {
          flex: 0 0 auto;
          width: 90px;
        }
        .document-uploader-count {
          font-size: 12px;
          color: #8c8c8c;
          min-width: 50px;
          text-align: right;
          flex: 0 0 auto;
        }
        .document-uploader-files {
          padding-left: 4px;
          margin-top: 4px;
          border-top: 1px solid #e8e8e8;
          padding-top: 6px;
        }
        .document-uploader-files .ant-list {
          padding: 0;
          background: transparent;
        }
        .document-uploader-files .ant-list-item {
          padding: 4px 0;
          border: none;
        }
        .document-sample-preview {
          max-height: 60vh;
          overflow: auto;
          border: 1px solid #f0f0f0;
          border-radius: 6px;
          padding: 8px;
          background: #fff;
        }
        .document-sample-preview img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
      `}</style>

      <div
        style={{
          marginBottom: 16,
          padding: "10px 12px",
          backgroundColor: "#f0f5ff",
          borderRadius: 4,
          fontSize: "12px",
          color: "#1890ff",
          border: "1px solid #b3d8ff",
        }}
      >
        ℹ️ Укажите тип документа и выберите файл (поддерживаемые форматы:{" "}
        {SUPPORTED_FORMATS})
        {loadingDocumentTypes && (
          <span style={{ marginLeft: 8 }}>
            <Spin size="small" />
          </span>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {documentTypeColumns.map((column, index) => (
          <Col key={`doc-column-${index}`} xs={24} sm={12} lg={8}>
            <div className="document-uploader-column">
              {column.map((docType) => (
                <DocumentTypeItem key={docType.value} docType={docType} />
              ))}
            </div>
          </Col>
        ))}
      </Row>

      {/* Встроенный просмотрщик файлов */}
      {viewingFile && (
        <FileViewer
          visible={viewerVisible}
          fileUrl={viewingFile.url}
          fileName={viewingFile.fileName}
          mimeType={viewingFile.mimeType}
          onClose={() => setViewerVisible(false)}
        />
      )}

      <Modal
        title={selectedSampleDocType?.label || "Образец документа"}
        open={sampleModalVisible}
        onCancel={() => setSampleModalVisible(false)}
        footer={null}
        width={860}
        centered
      >
        {selectedSampleDocType?.description && (
          <Typography.Paragraph style={{ marginBottom: 12 }}>
            {selectedSampleDocType.description}
          </Typography.Paragraph>
        )}

        {getSampleUrl(selectedSampleDocType) ? (
          <div className="document-sample-preview">
            {isImageSample(selectedSampleDocType) && (
              <img
                src={getSampleUrl(selectedSampleDocType)}
                alt={`Образец: ${selectedSampleDocType?.label || "документ"}`}
              />
            )}

            {isPdfSample(selectedSampleDocType) && (
              <object
                data={getSampleUrl(selectedSampleDocType)}
                type="application/pdf"
                width="100%"
                height="560"
              >
                <Typography.Paragraph>
                  Не удалось встроить PDF.{" "}
                  <a
                    href={getSampleUrl(selectedSampleDocType)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Открыть в новой вкладке
                  </a>
                </Typography.Paragraph>
              </object>
            )}

            {!isImageSample(selectedSampleDocType) &&
              !isPdfSample(selectedSampleDocType) && (
                <Typography.Paragraph>
                  Формат образца не поддерживает встроенный просмотр.{" "}
                  <a
                    href={getSampleUrl(selectedSampleDocType)}
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
              renderItem={(field, index) => (
                <List.Item key={`highlighted-field-${index}`}>
                  {String(field)}
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentTypeUploader;
