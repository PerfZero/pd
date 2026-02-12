import { Space, Typography } from "antd";
import DocumentTypeSamplesSettingsSection from "@/components/Admin/DocumentTypeSamplesSettingsSection";

const { Title, Text } = Typography;

const DocumentSamplesPage = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "auto",
        padding: 24,
      }}
    >
      <Space
        direction="vertical"
        size={16}
        style={{ width: "100%", flexShrink: 0 }}
      >
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            Образцы документов
          </Title>
          <Text type="secondary">
            Управление образцами для иконки i на вкладке документов сотрудника
          </Text>
        </div>
      </Space>

      <div
        style={{
          marginTop: 16,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          paddingRight: 4,
        }}
      >
        <DocumentTypeSamplesSettingsSection />
      </div>
    </div>
  );
};

export default DocumentSamplesPage;
