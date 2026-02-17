import { memo } from "react";
import { Card, Statistic } from "antd";

const SkudStatsCards = memo(({ stats, statsLoading }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 12,
      marginBottom: 16,
    }}
  >
    <Card size="small" loading={statsLoading}>
      <Statistic title="События всего" value={stats?.events?.total || 0} />
    </Card>
    <Card size="small" loading={statsLoading}>
      <Statistic
        title="Разрешено"
        value={stats?.events?.allow || 0}
        valueStyle={{ color: "#3f8600" }}
      />
    </Card>
    <Card size="small" loading={statsLoading}>
      <Statistic
        title="Запрещено"
        value={stats?.events?.deny || 0}
        valueStyle={{ color: "#cf1322" }}
      />
    </Card>
    <Card size="small" loading={statsLoading}>
      <Statistic
        title="Сейчас разрешено"
        value={stats?.accessStates?.allowed || 0}
      />
    </Card>
  </div>
));

SkudStatsCards.displayName = "SkudStatsCards";

export default SkudStatsCards;
