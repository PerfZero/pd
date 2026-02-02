import {
  Card,
  Space,
  Typography,
  Select,
  Statistic,
  Row,
  Col,
  Tag,
  Button,
  Empty,
} from "antd";

const { Title, Text } = Typography;

const ObjectTab = ({
  constructionSiteOptions,
  selectedConstructionSiteId,
  onSelectConstructionSite,
  selectCollapsedStyle,
  selectDropdownStyle,
  objectStatusSummary,
  objectStatusLoading,
  objectStatuses,
  contractorStatusMeta,
  isStaff,
  onTempAdmit,
  onRecalculateStatus,
  onOpenContractor,
}) => (
  <Space direction="vertical" size={12} style={{ width: "100%" }}>
    <Card size="small">
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Text>Выберите объект</Text>
        <Select
          placeholder="Объект строительства"
          size="large"
          options={constructionSiteOptions}
          value={selectedConstructionSiteId}
          onChange={onSelectConstructionSite}
          style={selectCollapsedStyle}
          popupMatchSelectWidth={false}
          styles={{ popup: { root: selectDropdownStyle } }}
        />
      </Space>
    </Card>
    <Card size="small">
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8}>
          <Statistic title="Допущены" value={objectStatusSummary.admitted} />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Не допущены"
            value={objectStatusSummary.not_admitted}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Временно допущены"
            value={objectStatusSummary.temp_admitted}
          />
        </Col>
      </Row>
    </Card>
    <Card size="small">
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Title level={5} style={{ margin: 0 }}>
          Подрядчики по объекту
        </Title>
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {objectStatusLoading && (
            <Card size="small" styles={{ body: { padding: 8 } }}>
              <Text type="secondary">Загрузка...</Text>
            </Card>
          )}
          {!objectStatusLoading && objectStatuses.length === 0 && (
            <Empty description="Нет подрядчиков на объекте" />
          )}
          {!objectStatusLoading &&
            objectStatuses.map((item) => {
              const meta =
                contractorStatusMeta[item.status] ||
                contractorStatusMeta.not_admitted;
              const totalRequired = item.totalRequired || 0;
              const approvedRequired = item.approvedRequired || 0;
              const missingRequired = item.missingRequired || 0;
              return (
                <Card
                  size="small"
                  key={item.counterparty?.id || item.status}
                  styles={{ body: { padding: 8 } }}
                >
                  <Space
                    direction="vertical"
                    size={6}
                    style={{ width: "100%" }}
                  >
                    <Space
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text strong>
                        {item.counterparty?.name || item.counterparty?.id}
                      </Text>
                      <Tag color={meta.color}>{meta.text}</Tag>
                    </Space>
                    <Space wrap>
                      {totalRequired > 0 ? (
                        <Tag color="blue">
                          Обязательные: {approvedRequired}/{totalRequired}
                        </Tag>
                      ) : (
                        <Tag color="default">Нет обязательных документов</Tag>
                      )}
                      {missingRequired > 0 && (
                        <Tag color="red">Не хватает: {missingRequired}</Tag>
                      )}
                      {item.isManual && <Tag color="gold">Ручной статус</Tag>}
                    </Space>
                    {isStaff && (
                      <Space size={8} wrap>
                        <Button
                          size="small"
                          onClick={() => onTempAdmit(item.counterparty?.id)}
                          disabled={!item.counterparty?.id}
                        >
                          Временно допустить
                        </Button>
                        <Button
                          size="small"
                          onClick={() =>
                            onRecalculateStatus(item.counterparty?.id)
                          }
                          disabled={!item.counterparty?.id}
                        >
                          Пересчитать
                        </Button>
                      </Space>
                    )}
                    <Button
                      size="small"
                      onClick={() => onOpenContractor(item.counterparty?.id)}
                    >
                      Открыть подрядчика
                    </Button>
                  </Space>
                </Card>
              );
            })}
        </Space>
      </Space>
    </Card>
  </Space>
);

export default ObjectTab;
