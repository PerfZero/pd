import {
  Card,
  Space,
  Typography,
  Select,
  Statistic,
  Row,
  Col,
  List,
  Input,
  Button,
  Divider,
  Empty,
  Modal,
  Form,
  Tooltip,
} from "antd";
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import ContractorDocumentsTable from "@/widgets/occupational-safety/contractor-documents-table/ContractorDocumentsTable";

const { Title, Text } = Typography;

const ContractorTab = ({
  isStaff,
  isContractorUser,
  uploadInputRef,
  onFileChange,
  constructionSiteOptions,
  selectedConstructionSiteId,
  onSelectConstructionSite,
  contractorSelectStyle,
  selectCollapsedStyle,
  selectDropdownStyle,
  counterpartyOptions,
  selectedCounterpartyId,
  onSelectCounterparty,
  hasContractorSelection,
  contractorLoading,
  normalizedStats,
  contractorCommentsLoading,
  contractorComments,
  contractorCommentText,
  onContractorCommentTextChange,
  contractorCommentEnabled,
  onAddContractorComment,
  contractorCommentEditOpen,
  contractorCommentForm,
  onCloseContractorCommentEdit,
  onUpdateContractorComment,
  onOpenEditContractorComment,
  onDeleteContractorComment,
  contractorTree,
  statusMeta,
  uploadingDocId,
  onDownloadTemplate,
  onDownloadContractorFile,
  onPreviewContractorFile,
  onDeleteContractorFile,
  onOpenDocumentComments,
  onUploadClick,
  onApprove,
  onReject,
  latestInstruction,
  settingsInstructions,
  onDownloadInstructionFile,
  onTempAdmit,
  onManualAdmit,
  onBlockContractor,
}) => (
  <Space direction="vertical" size={12} style={{ width: "100%" }}>
    <input
      ref={uploadInputRef}
      type="file"
      multiple
      style={{ display: "none" }}
      onChange={onFileChange}
    />
    {!isStaff && (
      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Text strong>Инструкции</Text>
              {latestInstruction ? (
                <>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    disabled={!latestInstruction.fileId}
                    onClick={() => onDownloadInstructionFile(latestInstruction)}
                  >
                    Скачать инструкцию
                  </Button>
                  {settingsInstructions.length > 1 && (
                    <>
                      <Divider style={{ margin: "8px 0" }} />
                      <List
                        size="small"
                        dataSource={settingsInstructions}
                        locale={{ emptyText: "Инструкции не найдены" }}
                        renderItem={(item) => (
                          <List.Item
                            actions={[
                              item.fileId ? (
                                <Button
                                  size="small"
                                  icon={<DownloadOutlined />}
                                  onClick={() =>
                                    onDownloadInstructionFile(item)
                                  }
                                >
                                  Скачать
                                </Button>
                              ) : null,
                            ]}
                          >
                            <List.Item.Meta
                              title={dayjs(item.createdAt).format(
                                "DD.MM.YYYY HH:mm",
                              )}
                              description={item.text || "Без текста"}
                            />
                          </List.Item>
                        )}
                      />
                    </>
                  )}
                </>
              ) : (
                <Empty description="Инструкции не добавлены" />
              )}
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Text>Объект строительства</Text>
              <Select
                placeholder="Объект"
                size="large"
                options={constructionSiteOptions}
                value={selectedConstructionSiteId}
                onChange={onSelectConstructionSite}
                allowClear
                style={contractorSelectStyle || selectCollapsedStyle}
                popupMatchSelectWidth={false}
                styles={{ popup: { root: selectDropdownStyle } }}
              />
            </Space>
          </Col>
        </Row>
      </Card>
    )}
    {isStaff && (
      <Card size="small">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text>Фильтры</Text>
          <Space direction="horizontal" size={8} style={{ width: "100%" }} wrap>
            <Select
              placeholder="Объект"
              size="large"
              options={constructionSiteOptions}
              value={selectedConstructionSiteId}
              onChange={onSelectConstructionSite}
              allowClear
              style={selectCollapsedStyle}
              popupMatchSelectWidth={false}
              styles={{ popup: { root: selectDropdownStyle } }}
            />
            <Select
              placeholder="Подрядчик"
              size="large"
              options={counterpartyOptions}
              value={selectedCounterpartyId}
              onChange={onSelectCounterparty}
              allowClear
              style={selectCollapsedStyle}
              popupMatchSelectWidth={false}
              styles={{ popup: { root: selectDropdownStyle } }}
            />
            <Button
              size="small"
              onClick={() => onTempAdmit?.(selectedCounterpartyId)}
              disabled={!selectedConstructionSiteId || !selectedCounterpartyId}
              style={{
                borderColor: "#faad14",
                color: "#d48806",
              }}
            >
              Временно допустить
            </Button>
            <Button
              size="small"
              onClick={() => onManualAdmit?.(selectedCounterpartyId)}
              disabled={!selectedConstructionSiteId || !selectedCounterpartyId}
              style={{
                borderColor: "#52c41a",
                color: "#389e0d",
              }}
            >
              Допустить
            </Button>
            <Button
              size="small"
              danger
              onClick={() => onBlockContractor?.(selectedCounterpartyId)}
              disabled={!selectedConstructionSiteId || !selectedCounterpartyId}
            >
              Заблокировать
            </Button>
          </Space>
        </Space>
      </Card>
    )}
    {hasContractorSelection && (
      <>
        <Card size="small" loading={contractorLoading}>
          <Row gutter={[12, 12]} align="middle">
            <Col flex="auto">
              <Space size={24} wrap>
                <Statistic
                  title="Всего документов"
                  value={normalizedStats.total}
                />
                <Statistic title="Загружены" value={normalizedStats.uploaded} />
                <Statistic
                  title="Подтверждены"
                  value={normalizedStats.approved}
                />
                <Statistic title="Отклонены" value={normalizedStats.rejected} />
              </Space>
            </Col>
          </Row>
        </Card>
        {isStaff && (
          <Card size="small">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Title level={5} style={{ margin: 0 }}>
                Комментарии по подрядчику
              </Title>
              <List
                loading={contractorCommentsLoading}
                dataSource={contractorComments}
                locale={{ emptyText: "Комментариев пока нет" }}
                renderItem={(item) => {
                  const creatorName = [
                    item.creator?.lastName,
                    item.creator?.firstName,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const title = creatorName
                    ? `${creatorName} • ${dayjs(item.createdAt).format(
                        "DD.MM.YYYY HH:mm",
                      )}`
                    : dayjs(item.createdAt).format("DD.MM.YYYY HH:mm");

                  return (
                    <List.Item
                      actions={[
                        <Tooltip key="edit" title="Редактировать">
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onOpenEditContractorComment(item)}
                          />
                        </Tooltip>,
                        <Tooltip key="delete" title="Удалить">
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onDeleteContractorComment(item)}
                          />
                        </Tooltip>,
                      ]}
                    >
                      <List.Item.Meta title={title} description={item.text} />
                    </List.Item>
                  );
                }}
              />
              <Input.TextArea
                rows={3}
                placeholder="Добавить комментарий"
                value={contractorCommentText}
                onChange={onContractorCommentTextChange}
                disabled={!contractorCommentEnabled}
              />
              <Button
                type="primary"
                onClick={onAddContractorComment}
                disabled={
                  !contractorCommentEnabled || !contractorCommentText.trim()
                }
              >
                Добавить комментарий
              </Button>
            </Space>
            <Modal
              open={contractorCommentEditOpen}
              title="Редактировать комментарий"
              onCancel={onCloseContractorCommentEdit}
              onOk={onUpdateContractorComment}
              okText="Сохранить"
              cancelText="Отмена"
            >
              <Form form={contractorCommentForm} layout="vertical">
                <Form.Item
                  name="text"
                  label="Комментарий"
                  rules={[{ required: true, message: "Введите комментарий" }]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Form>
            </Modal>
          </Card>
        )}
        <Card size="small">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Title level={5} style={{ margin: 0 }}>
              Документы подрядчика
            </Title>
            <ContractorDocumentsTable
              contractorTree={contractorTree}
              statusMeta={statusMeta}
              isStaff={isStaff}
              isContractorUser={isContractorUser}
              collapseSingleDocumentSubgroups
              uploadingDocId={uploadingDocId}
              onDownloadTemplate={onDownloadTemplate}
              onDownloadContractorFile={onDownloadContractorFile}
              onPreviewContractorFile={onPreviewContractorFile}
              onDeleteContractorFile={onDeleteContractorFile}
              onOpenDocumentComments={onOpenDocumentComments}
              onUploadClick={onUploadClick}
              onApprove={onApprove}
              onReject={onReject}
            />
          </Space>
        </Card>
      </>
    )}
  </Space>
);

export default ContractorTab;
