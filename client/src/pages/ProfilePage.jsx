import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  Spin,
  message,
  Grid,
  Modal,
  Divider,
  Select,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  IdcardOutlined,
  LogoutOutlined,
  LinkOutlined,
  QrcodeOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import profileService from "@/services/profileService";
import userProfileService from "@/services/userProfileService";
import { forbiddenPasswordValidator } from "@/utils/forbiddenPasswords";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/entities/settings";
import { setLanguage } from "@/i18n";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ProfilePage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const { defaultCounterpartyId } = useSettings();
  const isContractorUser =
    user?.role === "user" &&
    user?.counterpartyId &&
    user?.counterpartyId !== defaultCounterpartyId;
  const canChangeLanguage = isContractorUser || user?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [telegramBinding, setTelegramBinding] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramGenerating, setTelegramGenerating] = useState(false);
  const [telegramUnlinking, setTelegramUnlinking] = useState(false);
  const [telegramUnavailableReason, setTelegramUnavailableReason] =
    useState(null);

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const canUseTelegramBinding = user?.role === "user";

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await profileService.getMyProfile();
      setProfileData(response.data.user);
      profileForm.setFieldsValue({
        firstName: response.data.user.firstName,
        email: response.data.user.email,
        userLanguage: response.data.user.userLanguage || "ru",
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      // НЕ показываем message.error - пользователь и так видит что профиль не загрузился
    } finally {
      setLoading(false);
    }
  }, [profileForm]);

  // Загрузка профиля при монтировании
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadTelegramBinding = useCallback(async () => {
    if (!canUseTelegramBinding) {
      setTelegramBinding(null);
      setTelegramUnavailableReason(null);
      return;
    }

    try {
      setTelegramLoading(true);
      const response = await userProfileService.getTelegramBinding();
      setTelegramBinding(response?.data || null);
      setTelegramUnavailableReason(null);
    } catch (error) {
      console.error("Error loading telegram binding:", error);
      setTelegramBinding(null);
      setTelegramUnavailableReason(
        error?.response?.data?.message ||
          "Не удалось загрузить Telegram-статус",
      );
    } finally {
      setTelegramLoading(false);
    }
  }, [canUseTelegramBinding]);

  useEffect(() => {
    loadTelegramBinding();
  }, [loadTelegramBinding]);

  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();
      setSaving(true);

      await profileService.updateMyProfile(values);
      if (values.userLanguage) {
        setLanguage(values.userLanguage);
      }

      // Обновляем данные в store
      await useAuthStore.getState().getCurrentUser();

      message.success(t("profile.profileUpdated"));
      setIsEditing(false);
      await loadProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      message.error(error.response?.data?.message || t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    profileForm.setFieldsValue({
      firstName: profileData.firstName,
      email: profileData.email,
      userLanguage: profileData.userLanguage || "ru",
    });
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();

      await profileService.changePassword(
        values.currentPassword,
        values.newPassword,
      );

      message.success(t("profile.passwordChanged"));
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      console.error("Error changing password:", error);
      message.error(
        error.response?.data?.message || t("profile.passwordChangeError"),
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleGenerateTelegramCode = async () => {
    try {
      setTelegramGenerating(true);
      await userProfileService.generateTelegramLinkCode();
      message.success("Код привязки Telegram создан");
      await loadTelegramBinding();
    } catch (error) {
      console.error("Error generating telegram code:", error);
      message.error(
        error?.response?.data?.message || "Ошибка генерации кода Telegram",
      );
    } finally {
      setTelegramGenerating(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      setTelegramUnlinking(true);
      await userProfileService.unlinkTelegram();
      message.success("Telegram отвязан");
      await loadTelegramBinding();
    } catch (error) {
      console.error("Error unlinking telegram:", error);
      message.error(
        error?.response?.data?.message || "Ошибка отвязки Telegram",
      );
    } finally {
      setTelegramUnlinking(false);
    }
  };

  const handleCopyTelegramCommand = async () => {
    const command = telegramBinding?.activeCode?.command;
    if (!command) {
      return;
    }

    try {
      await navigator.clipboard.writeText(command);
      message.success("Команда скопирована");
    } catch (error) {
      console.error("Error copying telegram command:", error);
      message.error("Не удалось скопировать команду");
    }
  };

  // Форматирование УИН в формат XXX-XXX
  const formatUIN = (uin) => {
    if (!uin || uin.length !== 6) return uin;
    return `${uin.slice(0, 3)}-${uin.slice(3)}`;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f2f5",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      {/* Основная карточка профиля */}
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>{t("profile.title")}</span>
          </Space>
        }
        extra={
          !isEditing ? (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
              size={isMobile ? "small" : "default"}
            >
              {!isMobile && t("common.edit")}
            </Button>
          ) : (
            <Space size="small">
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
                size={isMobile ? "small" : "default"}
              >
                {!isMobile && t("common.cancel")}
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveProfile}
                loading={saving}
                size={isMobile ? "small" : "default"}
              >
                {!isMobile && t("common.save")}
              </Button>
            </Space>
          )
        }
      >
        {/* УИН */}
        <div
          style={{
            background: "#fafafa",
            padding: "12px 16px",
            borderRadius: 6,
            marginBottom: 16,
            border: "1px solid #d9d9d9",
          }}
        >
          <Space>
            <IdcardOutlined style={{ color: "#1890ff" }} />
            <Text strong>{t("profile.uin")}:</Text>
            <Text style={{ fontSize: 16, fontWeight: 500 }}>
              {formatUIN(profileData?.identificationNumber)}
            </Text>
          </Space>
        </div>

        {/* Сообщение о неактивации */}
        {!user?.isActive && (
          <Alert
            message={t("profile.notActivated")}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={profileForm} layout="vertical" disabled={!isEditing}>
          <Form.Item
            name="firstName"
            label={t("auth.fullName")}
            rules={[
              { required: true, message: t("auth.fullNameRequired") },
              {
                pattern: /^[А-Яа-яЁё\s-]+$/,
                message: t("auth.fullNameCyrillic"),
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Иванов Иван Иванович"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={t("auth.email")}
            rules={[
              { required: true, message: t("auth.emailRequired") },
              { type: "email", message: t("auth.invalidEmail") },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="user@example.com" />
          </Form.Item>

          {canChangeLanguage && (
            <Form.Item
              name="userLanguage"
              label={t("profile.language")}
              extra={isContractorUser ? t("profile.languageHint") : undefined}
            >
              <Select
                options={[
                  { value: "ru", label: t("languages.ru") },
                  { value: "uz", label: t("languages.uz") },
                  { value: "tj", label: t("languages.tj") },
                  { value: "kz", label: t("languages.kz") },
                ]}
              />
            </Form.Item>
          )}
        </Form>

        <Divider style={{ margin: "16px 0" }} />

        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {profileData?.createdAt && (
            <Text type="secondary">
              {t("profile.registrationDate")}:{" "}
              <Text strong>
                {new Date(profileData.createdAt).toLocaleDateString("ru-RU")}
              </Text>
            </Text>
          )}
        </Space>

        <Divider style={{ margin: "16px 0" }} />

        {/* Действия */}
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button
            icon={<LockOutlined />}
            onClick={() => setPasswordModalVisible(true)}
            block
          >
            {t("profile.changePassword")}
          </Button>

          <Button danger icon={<LogoutOutlined />} onClick={handleLogout} block>
            {t("common.logout")}
          </Button>

          <Divider style={{ margin: "8px 0" }} />

          <Typography.Link
            href="https://docs.google.com/document/d/12wNHmIGNUcLjdDeThLY-77F_ARR1o2hKF_CIWhauy88/edit?usp=sharing"
            target="_blank"
            style={{ display: "block", textAlign: "center" }}
          >
            {t("common.instruction")}
          </Typography.Link>
        </Space>
      </Card>

      {canUseTelegramBinding && (
        <Card
          title={
            <Space>
              <LinkOutlined />
              <span>Telegram-бот</span>
            </Space>
          }
          style={{ marginTop: 16 }}
          loading={telegramLoading}
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {telegramUnavailableReason ? (
              <Alert
                type="warning"
                showIcon
                message={telegramUnavailableReason}
              />
            ) : (
              <>
                <Alert
                  type={telegramBinding?.linked ? "success" : "info"}
                  showIcon
                  message={
                    telegramBinding?.linked
                      ? "Telegram привязан к вашему профилю"
                      : "Telegram не привязан"
                  }
                  description={
                    telegramBinding?.linked ? (
                      <div>
                        <div>
                          Username:{" "}
                          {telegramBinding?.account?.telegramUsername || "-"}
                        </div>
                        <div>
                          Язык: {telegramBinding?.account?.language || "ru"}
                        </div>
                        <div>
                          Привязан:{" "}
                          {telegramBinding?.account?.linkedAt
                            ? new Date(
                                telegramBinding.account.linkedAt,
                              ).toLocaleString("ru-RU")
                            : "-"}
                        </div>
                      </div>
                    ) : (
                      <div>
                        1. Нажмите «Сгенерировать код».
                        <br />
                        2. В Telegram отправьте боту команду вида{" "}
                        <b>/start КОД</b>.
                      </div>
                    )
                  }
                />

                {telegramBinding?.activeCode && (
                  <Card size="small">
                    <Space
                      direction="vertical"
                      size={8}
                      style={{ width: "100%" }}
                    >
                      <Space>
                        <QrcodeOutlined />
                        <Text strong>
                          Код привязки: {telegramBinding.activeCode.code}
                        </Text>
                      </Space>
                      <Text type="secondary">
                        Действует до:{" "}
                        {new Date(
                          telegramBinding.activeCode.expiresAt,
                        ).toLocaleString("ru-RU")}
                      </Text>
                      <Space wrap>
                        <Input
                          readOnly
                          value={telegramBinding.activeCode.command}
                          style={{ minWidth: isMobile ? 220 : 360 }}
                        />
                        <Button
                          icon={<CopyOutlined />}
                          onClick={handleCopyTelegramCommand}
                        >
                          Копировать
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                )}

                <Space wrap>
                  <Button
                    type="primary"
                    onClick={handleGenerateTelegramCode}
                    loading={telegramGenerating}
                  >
                    Сгенерировать код
                  </Button>
                  <Button
                    danger
                    onClick={handleUnlinkTelegram}
                    loading={telegramUnlinking}
                    disabled={!telegramBinding?.linked}
                  >
                    Отвязать Telegram
                  </Button>
                </Space>
              </>
            )}
          </Space>
        </Card>
      )}

      {/* Модальное окно смены пароля */}
      <Modal
        title={t("profile.changePasswordTitle")}
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="currentPassword"
            label={t("profile.currentPassword")}
            rules={[{ required: true, message: t("auth.passwordRequired") }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={t("profile.newPassword")}
            rules={[
              { required: true, message: t("auth.passwordRequired") },
              { min: 8, message: t("auth.passwordMin") },
              forbiddenPasswordValidator,
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t("profile.confirmNewPassword")}
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: t("auth.confirmPasswordRequired") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("auth.passwordsNotMatch")));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setPasswordModalVisible(false);
                  passwordForm.resetFields();
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="primary" htmlType="submit">
                {t("profile.changePassword")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
