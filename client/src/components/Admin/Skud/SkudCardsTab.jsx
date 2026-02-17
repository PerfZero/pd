import { memo } from "react";
import { Button, Input, Select, Space, Table, Tag } from "antd";
import SkudStatsCards from "@/components/Admin/Skud/SkudStatsCards";

const SkudCardsTab = memo(
  ({
    stats,
    statsLoading,
    cardsSearch,
    setCardsSearch,
    setCardsPagination,
    cardsStatusFilter,
    setCardsStatusFilter,
    cardStatusOptions,
    loadCards,
    isCardsMock,
    registerCardNumber,
    setRegisterCardNumber,
    registerCardType,
    setRegisterCardType,
    registerCardExternalId,
    setRegisterCardExternalId,
    registerCardEmployeeId,
    setRegisterCardEmployeeId,
    searchEmployees,
    employeeOptions,
    employeeSearchLoading,
    registerCard,
    cardsColumns,
    cardItems,
    cardsLoading,
    cardsPagination,
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SkudStatsCards stats={stats} statsLoading={statsLoading} />
      <Space wrap>
        <Input
          placeholder="Номер карты / внешний ID"
          style={{ width: 300 }}
          value={cardsSearch}
          onChange={(event) => {
            setCardsSearch(event.target.value);
            setCardsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
        />
        <Select
          placeholder="Статус карты"
          style={{ width: 180 }}
          value={cardsStatusFilter}
          onChange={(value) => {
            setCardsStatusFilter(value);
            setCardsPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
          options={cardStatusOptions}
        />
        <Button onClick={loadCards}>Обновить</Button>
      </Space>

      <Space wrap>
        {isCardsMock ? (
          <Tag color="gold">Демо-данные: операции с картами недоступны</Tag>
        ) : null}
        <Input
          placeholder="Номер карты"
          style={{ width: 220 }}
          value={registerCardNumber}
          onChange={(event) => setRegisterCardNumber(event.target.value)}
          allowClear
        />
        <Select
          style={{ width: 120 }}
          value={registerCardType}
          onChange={setRegisterCardType}
          options={[
            { value: "rfid", label: "RFID" },
            { value: "nfc", label: "NFC" },
            { value: "barcode", label: "Barcode" },
          ]}
        />
        <Input
          placeholder="Внешний ID (опц.)"
          style={{ width: 190 }}
          value={registerCardExternalId}
          onChange={(event) => setRegisterCardExternalId(event.target.value)}
          allowClear
        />
        <Select
          showSearch
          value={registerCardEmployeeId}
          onSearch={searchEmployees}
          onChange={setRegisterCardEmployeeId}
          filterOption={false}
          options={employeeOptions}
          placeholder="Привязать к сотруднику (опц.)"
          style={{ width: 320 }}
          notFoundContent={employeeSearchLoading ? "Поиск..." : "Нет данных"}
          allowClear
        />
        <Button type="primary" disabled={isCardsMock} onClick={registerCard}>
          Зарегистрировать карту
        </Button>
      </Space>

      <Table
        size="small"
        rowKey="id"
        columns={cardsColumns}
        dataSource={cardItems}
        loading={cardsLoading}
        pagination={{
          current: cardsPagination.current,
          pageSize: cardsPagination.pageSize,
          total: cardsPagination.total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: (page, pageSize) =>
            setCardsPagination((prev) => ({
              ...prev,
              current: page,
              pageSize: pageSize || prev.pageSize,
            })),
        }}
      />
    </div>
  ),
);

SkudCardsTab.displayName = "SkudCardsTab";

export default SkudCardsTab;
