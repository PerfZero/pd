import { useMemo, useState } from "react";
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
  onManualAdmit,
  onBlockContractor,
  onOpenContractor,
}) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Все статусы" },
      ...Object.entries(contractorStatusMeta || {}).map(([value, meta]) => ({
        value,
        label: meta?.text || value,
      })),
    ],
    [contractorStatusMeta],
  );

  const filteredStatuses = useMemo(() => {
    if (statusFilter === "all") return objectStatuses;
    return objectStatuses.filter((item) => item.status === statusFilter);
  }, [objectStatuses, statusFilter]);

  return (
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
            allowClear
            style={selectCollapsedStyle}
            popupMatchSelectWidth={false}
            styles={{ popup: { root: selectDropdownStyle } }}
          />
        </Space>
      </Card>
      <Card size="small">
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <Statistic title="Допущены" value={objectStatusSummary.admitted} />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Не допущены"
              value={objectStatusSummary.not_admitted}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Временно допущены"
              value={objectStatusSummary.temp_admitted}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Заблокированы"
              value={objectStatusSummary.blocked}
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
            <Select
              size="middle"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              style={{ maxWidth: 260 }}
            />
            {objectStatusLoading && (
              <Card size="small" styles={{ body: { padding: 8 } }}>
                <Text type="secondary">Загрузка...</Text>
              </Card>
            )}
            {!objectStatusLoading && filteredStatuses.length === 0 && (
              <Empty
                description={
                  statusFilter === "all"
                    ? "Нет подрядчиков на объекте"
                    : "Нет подрядчиков с выбранным статусом"
                }
              />
            )}
            {!objectStatusLoading &&
              filteredStatuses.map((item) => {
                const meta =
                  contractorStatusMeta[item.status] ||
                  contractorStatusMeta.not_admitted;
                const totalRequired = item.totalRequired || 0;
                const approvedRequired = item.approvedRequired || 0;
                const missingRequired = item.missingRequired || 0;
                const contractorId = item.counterparty?.id;
                const contractorName =
                  item.counterparty?.name || item.counterparty?.id;
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
                          alignItems: "center",
                        }}
                        wrap
                      >
                        <Space size={8} wrap>
                          <Typography.Link
                            onClick={() => {
                              if (contractorId) {
                                onOpenContractor(contractorId);
                              }
                            }}
                            disabled={!contractorId}
                            style={{ fontWeight: 600 }}
                          >
                            {contractorName}
                          </Typography.Link>
                          <Tag
                            color="default"
                            style={{ marginInlineEnd: 0, borderRadius: 10 }}
                          >
                            {meta.text}
                          </Tag>
                        </Space>
                        {isStaff && (
                          <Space
                            size={8}
                            wrap
                            style={{ justifyContent: "flex-end" }}
                          >
                            <Button
                              size="small"
                              onClick={() => onTempAdmit(contractorId)}
                              disabled={!contractorId}
                            >
                              Временно допустить
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => onManualAdmit(contractorId)}
                              disabled={!contractorId}
                            >
                              Допустить
                            </Button>
                            <Button
                              size="small"
                              danger
                              onClick={() => onBlockContractor(contractorId)}
                              disabled={!contractorId}
                            >
                              Заблокировать
                            </Button>
                          </Space>
                        )}
                      </Space>
                      <Space size={8} wrap>
                        {totalRequired > 0 ? (
                          <Tag
                            color="default"
                            style={{ marginInlineEnd: 0, borderRadius: 10 }}
                          >
                            Обязательные: {approvedRequired}/{totalRequired}
                          </Tag>
                        ) : (
                          <Tag
                            color="default"
                            style={{ marginInlineEnd: 0, borderRadius: 10 }}
                          >
                            Нет обязательных документов
                          </Tag>
                        )}
                        {missingRequired > 0 && (
                          <Tag
                            color="default"
                            style={{ marginInlineEnd: 0, borderRadius: 10 }}
                          >
                            Не хватает: {missingRequired}
                          </Tag>
                        )}
                        {item.isManual && (
                          <Tag
                            color="default"
                            style={{ marginInlineEnd: 0, borderRadius: 10 }}
                          >
                            Ручной статус
                          </Tag>
                        )}
                      </Space>
                    </Space>
                  </Card>
                );
              })}
          </Space>
        </Space>
      </Card>
    </Space>
  );
};

export default ObjectTab;
