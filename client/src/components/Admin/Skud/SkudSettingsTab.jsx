import { memo } from "react";
import { Button, Card, Input, Select, Space, Switch, Tag, Typography } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

const SkudSettingsTab = memo(
  ({
    settingsLoading,
    skudSettings,
    updateSkudSettingField,
    settingsSaving,
    handleSaveSkudSettings,
    settingsCheckLoading,
    handleCheckSkudConnection,
    loadSkudSettings,
    settingsCheckResult,
  }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card
        size="small"
        title="Интеграция WebDel / Sigur"
        loading={settingsLoading}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space wrap>
            <Text>Включить WebDel</Text>
            <Switch
              checked={Boolean(skudSettings.webdelEnabled)}
              onChange={(checked) =>
                updateSkudSettingField("webdelEnabled", checked)
              }
            />
          </Space>
          <Input
            placeholder="WebDel Base URL"
            value={skudSettings.webdelBaseUrl || ""}
            onChange={(event) =>
              updateSkudSettingField("webdelBaseUrl", event.target.value)
            }
          />
          <Input
            placeholder="Basic Auth логин"
            value={skudSettings.webdelBasicUser || ""}
            onChange={(event) =>
              updateSkudSettingField("webdelBasicUser", event.target.value)
            }
          />
          <Input.Password
            placeholder="Basic Auth пароль"
            value={skudSettings.webdelBasicPassword || ""}
            onChange={(event) =>
              updateSkudSettingField("webdelBasicPassword", event.target.value)
            }
          />
          <Input.TextArea
            rows={3}
            placeholder="IP allowlist (через запятую)"
            value={skudSettings.webdelIpAllowlist || ""}
            onChange={(event) =>
              updateSkudSettingField("webdelIpAllowlist", event.target.value)
            }
          />
          <Select
            value={skudSettings.integrationMode || "webdel"}
            onChange={(value) => updateSkudSettingField("integrationMode", value)}
            options={[
              { value: "mock", label: "Mock" },
              { value: "webdel", label: "WebDel" },
              { value: "sigur_rest", label: "Sigur REST" },
            ]}
            style={{ width: 240 }}
          />
        </Space>
      </Card>

      <Card size="small" title="Feature Flags" loading={settingsLoading}>
        <Space direction="vertical">
          <Space wrap>
            <Text>QR</Text>
            <Switch
              checked={Boolean(skudSettings.featureQrEnabled)}
              onChange={(checked) =>
                updateSkudSettingField("featureQrEnabled", checked)
              }
            />
          </Space>
          <Space wrap>
            <Text>Карты</Text>
            <Switch
              checked={Boolean(skudSettings.featureCardsEnabled)}
              onChange={(checked) =>
                updateSkudSettingField("featureCardsEnabled", checked)
              }
            />
          </Space>
          <Space wrap>
            <Text>Sigur REST</Text>
            <Switch
              checked={Boolean(skudSettings.featureSigurRestEnabled)}
              onChange={(checked) =>
                updateSkudSettingField("featureSigurRestEnabled", checked)
              }
            />
          </Space>
        </Space>
      </Card>

      <Space wrap>
        <Button
          type="primary"
          loading={settingsSaving}
          onClick={handleSaveSkudSettings}
        >
          Сохранить настройки
        </Button>
        <Button
          loading={settingsCheckLoading}
          onClick={handleCheckSkudConnection}
        >
          Проверить подключение
        </Button>
        <Button onClick={loadSkudSettings}>Обновить</Button>
      </Space>

      {settingsCheckResult ? (
        <Card size="small" title="Результат проверки подключения">
          <Space direction="vertical">
            <Tag color={settingsCheckResult.ok ? "green" : "red"}>
              {settingsCheckResult.ok ? "Успешно" : "Ошибка"}
            </Tag>
            <Text>{settingsCheckResult.message || "-"}</Text>
            <Text type="secondary">
              Проверено:{" "}
              {settingsCheckResult.checkedAt
                ? dayjs(settingsCheckResult.checkedAt).format(
                    "DD.MM.YYYY HH:mm:ss",
                  )
                : "-"}
            </Text>
            {settingsCheckResult.status ? (
              <Text type="secondary">
                HTTP статус: {settingsCheckResult.status}
              </Text>
            ) : null}
          </Space>
        </Card>
      ) : null}
    </div>
  ),
);

SkudSettingsTab.displayName = "SkudSettingsTab";

export default SkudSettingsTab;
