import { memo } from "react";
import { Button, Card, Input, QRCode, Select, Space, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import SkudStatsCards from "@/components/Admin/Skud/SkudStatsCards";

const { Text } = Typography;

const SkudQrTab = memo(
  ({
    stats,
    statsLoading,
    isQrMock,
    qrEmployeeId,
    setQrEmployeeId,
    searchEmployees,
    employeeOptions,
    employeeSearchLoading,
    qrTokenType,
    setQrTokenType,
    qrTtlMinutes,
    setQrTtlMinutes,
    handleGenerateQr,
    generatedQrPayload,
    qrValidateToken,
    setQrValidateToken,
    handleValidateQr,
    qrValidationResult,
    getReasonCodeLabel,
    qrStatusFilter,
    setQrStatusFilter,
    setQrTokensPagination,
    qrStatusOptions,
    loadQrData,
    qrTokenColumns,
    qrTokens,
    qrTokensLoading,
    qrTokensPagination,
    qrDenyColumns,
    qrDenies,
    qrDeniesLoading,
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SkudStatsCards stats={stats} statsLoading={statsLoading} />
      <Space wrap>
        {isQrMock ? <Tag color="gold">Демо-данные: операции QR недоступны</Tag> : null}
        <Select
          showSearch
          value={qrEmployeeId}
          onSearch={searchEmployees}
          onChange={setQrEmployeeId}
          filterOption={false}
          options={employeeOptions}
          placeholder="Сотрудник для генерации QR"
          style={{ width: 360 }}
          notFoundContent={employeeSearchLoading ? "Поиск..." : "Нет данных"}
          allowClear
        />
        <Select
          style={{ width: 160 }}
          value={qrTokenType}
          onChange={setQrTokenType}
          options={[
            { value: "persistent", label: "Постоянный" },
            { value: "one_time", label: "Одноразовый" },
          ]}
        />
        <Input
          placeholder="TTL (минуты)"
          value={qrTtlMinutes}
          onChange={(event) => setQrTtlMinutes(event.target.value)}
          style={{ width: 140 }}
        />
        <Button type="primary" disabled={isQrMock} onClick={handleGenerateQr}>
          Сгенерировать QR
        </Button>
      </Space>

      {generatedQrPayload?.token ? (
        <Card size="small" title="Последний сгенерированный QR">
          <Space wrap align="start">
            <QRCode value={generatedQrPayload.token} size={128} />
            <Space direction="vertical">
              <Text type="secondary">
                Истекает:{" "}
                {generatedQrPayload.expiresAt
                  ? dayjs(generatedQrPayload.expiresAt).format("DD.MM.YYYY HH:mm:ss")
                  : "-"}
              </Text>
              <Input.TextArea value={generatedQrPayload.token} rows={4} readOnly />
            </Space>
          </Space>
        </Card>
      ) : null}

      <Card size="small" title="Проверка QR">
        <Space wrap>
          <Input.TextArea
            value={qrValidateToken}
            onChange={(event) => setQrValidateToken(event.target.value)}
            placeholder="Вставьте токен QR"
            rows={3}
            style={{ width: 520 }}
          />
          <Button onClick={handleValidateQr}>Проверить</Button>
        </Space>
        {qrValidationResult ? (
          <Space style={{ marginTop: 12 }} wrap>
            <Tag color={qrValidationResult.allow ? "green" : "red"}>
              {qrValidationResult.allow ? "Разрешено" : "Запрещено"}
            </Tag>
            <Text>{qrValidationResult.message || "-"}</Text>
            <Text type="secondary">
              Код: {getReasonCodeLabel(qrValidationResult.reasonCode)}
            </Text>
          </Space>
        ) : null}
      </Card>

      <Space wrap>
        <Select
          placeholder="Статус QR"
          style={{ width: 180 }}
          value={qrStatusFilter}
          onChange={(value) => {
            setQrStatusFilter(value);
            setQrTokensPagination((prev) => ({ ...prev, current: 1 }));
          }}
          allowClear
          options={qrStatusOptions}
        />
        <Button onClick={loadQrData}>Обновить</Button>
      </Space>

      <Card size="small" title="Выданные QR">
        <Table
          size="small"
          rowKey="id"
          columns={qrTokenColumns}
          dataSource={qrTokens}
          loading={qrTokensLoading}
          pagination={{
            current: qrTokensPagination.current,
            pageSize: qrTokensPagination.pageSize,
            total: qrTokensPagination.total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            onChange: (page, pageSize) =>
              setQrTokensPagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize,
              })),
          }}
        />
      </Card>

      <Card size="small" title="Журнал отказов QR">
        <Table
          size="small"
          rowKey="id"
          columns={qrDenyColumns}
          dataSource={qrDenies}
          loading={qrDeniesLoading}
          pagination={false}
        />
      </Card>
    </div>
  ),
);

SkudQrTab.displayName = "SkudQrTab";

export default SkudQrTab;
