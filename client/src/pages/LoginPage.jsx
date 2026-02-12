import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, Input, Button, Card, Typography, Tabs, App } from "antd";
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/store/authStore";
import { forbiddenPasswordValidator } from "@/utils/forbiddenPasswords";
import { useTranslation } from "react-i18next";

const { Title, Text, Link } = Typography;

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuthStore();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [registrationCode, setRegistrationCode] = useState(null);

  useEffect(() => {
    // Получаем registration_code из URL (например: /login?registrationCode=12345678)
    const codeFromUrl = searchParams.get("registrationCode");
    if (codeFromUrl) {
      setRegistrationCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await login(values);

      message.success(t("auth.loginSuccess"));

      // Проверяем активацию аккаунта
      const userIsActive = response.data.user.isActive;
      if (!userIsActive) {
        // Если аккаунт не активирован - перенаправляем на профиль
        navigate("/profile");
        return;
      }

      // Перенаправление на страницу сотрудников для активных пользователей
      navigate("/employees");
    } catch (err) {
      console.error("Login error:", err);

      // Детальное сообщение об ошибке для входа
      let errorMessage = t("auth.loginError");

      if (err.response?.data?.message) {
        // Сообщение с сервера (например, "Неверный email или пароль")
        errorMessage = err.response.data.message;
      } else if (err.userMessage) {
        // Улучшенное сообщение из interceptor (например, "Ошибка сети")
        errorMessage = err.userMessage;
      } else if (err.code === "ERR_NETWORK") {
        errorMessage = t("auth.networkError");
      } else if (err.response?.status === 401) {
        errorMessage = t("auth.invalidCredentials");
      } else if (err.response?.status === 403) {
        errorMessage = t("auth.accountDisabled");
      } else if (err.message) {
        errorMessage = err.message;
      }

      message.error(errorMessage, 5); // Показываем на 5 секунд
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      console.log("Attempting registration with:", {
        ...values,
        password: "***",
      }); // Безопасное логирование

      // Добавляем registrationCode если он есть
      const registrationData = {
        ...values,
        ...(registrationCode && { registrationCode }),
      };

      const response = await register(registrationData);

      message.success({
        content: t("auth.registrationSuccess", {
          uin: response.data.user.identificationNumber,
        }),
        duration: 10,
      });

      // После регистрации перенаправляем на страницу профиля
      navigate("/profile");
    } catch (err) {
      console.error("Registration error:", err);

      // Детальное сообщение об ошибке
      let errorMessage = t("auth.registrationError");

      if (err.userMessage) {
        // Используем улучшенное сообщение из interceptor
        errorMessage = err.userMessage;
      } else if (err.response?.data?.errors) {
        // Если есть массив ошибок валидации
        const errors = err.response.data.errors;
        errorMessage = errors.map((e) => e.msg || e.message).join("; ");
      } else if (err.response?.data?.message) {
        // Обычное сообщение с сервера
        errorMessage = err.response.data.message;
      } else if (err.code === "ERR_NETWORK") {
        errorMessage = t("auth.networkError");
      } else if (err.message) {
        errorMessage = err.message;
      }

      message.error(errorMessage, 5); // Показываем на 5 секунд
    } finally {
      setLoading(false);
    }
  };

  const loginTabContent = (
    <Form
      form={loginForm}
      name="login"
      onFinish={handleLogin}
      layout="vertical"
      requiredMark={false}
      autoComplete="off"
    >
      <Form.Item
        name="email"
        label={t("auth.email")}
        rules={[
          { required: true, message: t("auth.emailRequired") },
          { type: "email", message: t("auth.invalidEmail") },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="user@example.com"
          size="large"
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label={t("auth.password")}
        rules={[{ required: true, message: t("auth.passwordRequired") }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="••••••••"
          size="large"
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
        >
          {t("auth.loginButton")}
        </Button>
      </Form.Item>
    </Form>
  );

  const registerTabContent = (
    <Form
      form={registerForm}
      name="register"
      onFinish={handleRegister}
      layout="vertical"
      requiredMark={true}
      autoComplete="off"
    >
      <Form.Item
        name="fullName"
        label={t("auth.fullName")}
        rules={[
          { required: true, message: t("auth.fullNameRequired") },
          {
            pattern: /^[А-Яа-яЁё\s-]+$/,
            message: t("auth.fullNameCyrillic"),
          },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              const parts = value.trim().split(/\s+/);
              if (parts.length < 2) {
                return Promise.reject(new Error(t("auth.fullNameMinWords")));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input
          placeholder="Иванов Иван Иванович"
          size="large"
          autoComplete="off"
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
        <Input
          prefix={<UserOutlined />}
          placeholder="user@example.com"
          size="large"
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label={t("auth.password")}
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
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label={t("auth.confirmPassword")}
        dependencies={["password"]}
        rules={[
          { required: true, message: t("auth.confirmPasswordRequired") },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
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
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
          icon={<UserAddOutlined />}
        >
          {t("auth.registerButton")}
        </Button>
      </Form.Item>

      {/* Ссылка для входа, если пользователь уже зарегистрирован */}
      {registrationCode && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text type="secondary">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link
              onClick={() => {
                setRegistrationCode(null);
                navigate("/login", { replace: true });
              }}
            >
              {t("auth.loginLink")}
            </Link>
          </Text>
        </div>
      )}
    </Form>
  );

  // Если есть registrationCode - показываем только форму регистрации
  if (registrationCode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "20px",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: 500,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "#2563eb",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserAddOutlined style={{ fontSize: 20, color: "#fff" }} />
              </div>
              <Title level={2} style={{ margin: 0 }}>
                {t("auth.register")}
              </Title>
            </div>
            <div style={{ textAlign: "center" }}>
              <Text type="secondary">{t("common.portalTitle")}</Text>
            </div>
          </div>

          {registerTabContent}

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <Link
                href="https://docs.google.com/document/d/12wNHmIGNUcLjdDeThLY-77F_ARR1o2hKF_CIWhauy88/edit?usp=sharing"
                target="_blank"
              >
                {t("common.instruction")}
              </Link>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t("common.copyright")}
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  // Обычная страница входа (без вкладки регистрации)
  const loginOnlyTabItems = [
    {
      key: "login",
      label: (
        <span>
          <LoginOutlined />
          {t("auth.login")}
        </span>
      ),
      children: loginTabContent,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: "#2563eb",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LoginOutlined style={{ fontSize: 20, color: "#fff" }} />
            </div>
            <Title level={2} style={{ margin: 0 }}>
              PassDesk
            </Title>
          </div>
          <div style={{ textAlign: "center" }}>
            <Text type="secondary">{t("common.portalTitle")}</Text>
          </div>
        </div>

        <Tabs activeKey="login" items={loginOnlyTabItems} centered />

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <Link
              href="https://docs.google.com/document/d/12wNHmIGNUcLjdDeThLY-77F_ARR1o2hKF_CIWhauy88/edit?usp=sharing"
              target="_blank"
            >
              {t("common.instruction")}
            </Link>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("common.copyright")}
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
