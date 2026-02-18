import { memo } from "react";
import { ArrowLeftOutlined, SearchOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Select, Typography } from "antd";

const { Title } = Typography;

const ApplicationRequestHeader = memo(
  ({
    onBack,
    userRole,
    searchText,
    onSearchTextChange,
    selectedCounterparty,
    onCounterpartyChange,
    counterpartiesLoading,
    availableCounterparties,
    selectedSite,
    onSiteChange,
    sitesLoading,
    availableSites,
    includeFired,
    onIncludeFiredChange,
    onOpenColumns,
  }) => (
    <div
      style={{
        padding: "16px",
        borderBottom: "1px solid #f0f0f0",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} size="large" />
        <Title level={3} style={{ margin: 0 }}>
          Создать заявку
        </Title>
      </div>

      <Input
        placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(event) => onSearchTextChange(event.target.value)}
        allowClear
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {userRole === "admin" ? (
          <Select
            placeholder="Все контрагенты"
            allowClear
            value={selectedCounterparty}
            onChange={onCounterpartyChange}
            loading={counterpartiesLoading}
            showSearch
            filterOption={(input, option) => {
              const value = input.toLowerCase();
              return (
                option?.label?.toLowerCase().includes(value) ||
                option?.children?.toLowerCase().includes(value)
              );
            }}
            options={availableCounterparties.map((counterparty) => ({
              label: `${counterparty.name} (ИНН: ${counterparty.inn || "-"})`,
              value: counterparty.id,
              children: counterparty.name,
            }))}
            style={{ width: "100%" }}
          />
        ) : null}

        <Select
          placeholder="Объект строительства (опционально)"
          allowClear
          value={selectedSite}
          onChange={onSiteChange}
          loading={sitesLoading}
          options={availableSites.map((site) => ({
            label: site.shortName || site.name,
            value: site.id,
          }))}
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Checkbox
            checked={includeFired}
            onChange={(event) => onIncludeFiredChange(event.target.checked)}
          >
            Включить уволенных
          </Checkbox>

          <Button
            icon={<SettingOutlined />}
            onClick={onOpenColumns}
            size="small"
            title="Выбрать столбцы для экспорта"
          >
            Столбцы
          </Button>
        </div>
      </div>
    </div>
  ),
);

ApplicationRequestHeader.displayName = "ApplicationRequestHeader";

export default ApplicationRequestHeader;
