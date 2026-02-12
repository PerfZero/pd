import { Card, Space, Typography, Tag, Button, Empty } from "antd";

const { Title, Text } = Typography;

const AllSitesTab = ({ allSiteSummaries, allSiteLoading, onOpenObject }) => (
  <Card size="small">
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Title level={5} style={{ margin: 0 }}>
        Сводка по объектам
      </Title>
      <Text type="secondary">
        Количество допущенных, не допущенных, временно допущенных и
        заблокированных подрядчиков по каждому объекту.
      </Text>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        {allSiteSummaries.length === 0 && allSiteLoading && (
          <Card size="small" styles={{ body: { padding: 12 } }}>
            <Text type="secondary">Загрузка...</Text>
          </Card>
        )}
        {allSiteSummaries.length === 0 && !allSiteLoading && (
          <Empty description="Нет данных по объектам" />
        )}
        {allSiteSummaries.length > 0 &&
          allSiteSummaries.map(({ site, counts, loading, error }) => (
            <Card size="small" key={site.id} styles={{ body: { padding: 8 } }}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <Text strong>
                    {site.shortName || site.fullName || site.id}
                  </Text>
                  <Button size="small" onClick={() => onOpenObject(site.id)}>
                    Открыть
                  </Button>
                </Space>
                <Space wrap>
                  {counts ? (
                    <>
                      <Tag color="green">Допущены: {counts.admitted}</Tag>
                      <Tag color="red">Не допущены: {counts.not_admitted}</Tag>
                      <Tag color="gold">Временно: {counts.temp_admitted}</Tag>
                      <Tag color="volcano">Заблокированы: {counts.blocked}</Tag>
                    </>
                  ) : loading ? (
                    <Tag color="default">Загрузка...</Tag>
                  ) : null}
                  {error && <Tag color="red">Ошибка загрузки</Tag>}
                </Space>
              </Space>
            </Card>
          ))}
      </Space>
    </Space>
  </Card>
);

export default AllSitesTab;
