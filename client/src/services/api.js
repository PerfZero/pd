import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { jwtDecode } from "jwt-decode";
import i18n from "@/i18n";

// Флаг для предотвращения множественных уведомлений
let isRedirecting = false;
// Единый in-flight refresh запрос (защита от гонок при параллельных запросах)
let refreshRequestPromise = null;

const resetAuthState = () => {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
  });
  localStorage.removeItem("auth-storage");
};

// Функция для получения базового URL
export const getBaseURL = () => {
  // Всегда используем относительный путь '/api/v1'
  // Это позволяет Vite проксировать запросы:
  // Browser (HTTPS) -> Vite Dev Server (HTTPS) -> Backend (HTTP)
  // Тем самым устраняется ошибка Mixed Content
  return "/api/v1";
};

// Функция для проверки, истекает ли токен в течение N минут
const isTokenExpiringSoon = (token, minutesBeforeExpiry = 1) => {
  try {
    if (!token) return false;

    const decoded = jwtDecode(token);
    const expiryTime = decoded.exp * 1000; // exp в секундах, переводим в миллисекунды
    const currentTime = Date.now();
    const timeUntilExpiry = expiryTime - currentTime;
    const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);

    return minutesUntilExpiry <= minutesBeforeExpiry;
  } catch (error) {
    console.error("❌ Error checking token expiry:", error);
    return false;
  }
};

const performRefreshTokenRequest = async () => {
  try {
    const response = await axios.post(
      `${getBaseURL()}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const { token: newToken } = response.data.data || {};

    if (!newToken) {
      throw new Error("Refresh endpoint returned empty access token");
    }

    useAuthStore.getState().updateTokens(newToken);
    console.log("✅ Token refreshed successfully");
    return newToken;
  } catch (error) {
    const status = error.response?.status;
    console.error("❌ Error refreshing token:", status, error.message);

    // Разлогиниваем только при невалидной refresh-сессии.
    // Для сетевых/временных ошибок не сбрасываем авторизацию мгновенно.
    if (status === 401 || status === 403) {
      resetAuthState();
    }

    return null;
  }
};

// Экспортируем, чтобы все места (hooks/interceptors) использовали один и тот же refresh flow
export const refreshAccessToken = async () => {
  if (!refreshRequestPromise) {
    refreshRequestPromise = performRefreshTokenRequest().finally(() => {
      refreshRequestPromise = null;
    });
  }

  return refreshRequestPromise;
};

// Создаем базовый экземпляр с правильным baseURL
const api = axios.create({
  baseURL: getBaseURL(), // Устанавливаем при создании
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
  timeout: 60000, // Увеличиваем до 60 секунд для импорта больших файлов
});

// Request interceptor - добавляем токен и проверяем его жизненный цикл
api.interceptors.request.use(
  async (config) => {
    const authStore = useAuthStore.getState();
    const token = authStore.token;
    const isRefreshRequest = config?.url?.includes("/auth/refresh");

    if (token && !isRefreshRequest) {
      let authToken = token;
      // Проверяем, истекает ли токен в течение 1 минуты
      if (isTokenExpiringSoon(token, 1)) {
        console.log("⏱️ Token expiring soon. Attempting to refresh...");

        // Пытаемся обновить токен
        const newToken = await refreshAccessToken();
        if (newToken) {
          authToken = newToken;
        }
      }

      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
      }
    }

    if (i18n?.language) {
      config.headers["Accept-Language"] = i18n.language;
    }

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor - обработка ошибок
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isAuthRefreshRequest =
      originalRequest?.url?.includes("/auth/refresh");

    // Логируем ошибку для отладки (кроме 404 для check-inn, это нормально)
    const isCheckInnNotFound =
      error.response?.status === 404 &&
      error.config?.url?.includes("/check-inn");

    if (!isCheckInnNotFound) {
      console.error("API Error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Обработка 401 ошибки (неавторизован / истек токен)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/logout") &&
      !isAuthRefreshRequest
    ) {
      originalRequest._retry = true;

      // Попытаемся обновить токен и повторить запрос
      console.log("🔄 Attempting to refresh token and retry request...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        // Обновляем токен в заголовке и повторяем запрос
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Если не удалось обновить токен - разлогиниваем пользователя
      // Предотвращаем множественные редиректы
      if (!isRedirecting) {
        isRedirecting = true;

        const errorMessage = error.response?.data?.message || "";

        console.warn("🚪 Logging out user due to 401 error:", errorMessage);

        // Логируем сообщение для отладки (было: message.warning в interceptor)
        // Сообщения отображаются в компонентах через App.useApp() hook

        // Разлогиниваем пользователя локально
        resetAuthState();

        if (window.location.pathname === "/login") {
          isRedirecting = false;
          return Promise.reject(error);
        }
        // Небольшая задержка перед редиректом, чтобы пользователь увидел сообщение
        setTimeout(() => {
          isRedirecting = false;
          window.location.href = "/login";
        }, 1000);
      }
    }
    if (error.response?.status === 401 && isAuthRefreshRequest) {
      if (!isRedirecting) {
        isRedirecting = true;
        resetAuthState();
        if (window.location.pathname === "/login") {
          isRedirecting = false;
          return Promise.reject(error);
        }
        setTimeout(() => {
          isRedirecting = false;
          window.location.href = "/login";
        }, 100);
      }
    }

    // Обработка 403 ошибки (нет прав доступа)
    if (error.response?.status === 403) {
      const errorMessage =
        error.response?.data?.message ||
        "У вас нет прав для выполнения этого действия";
      // Не логируем в консоль для уменьшения шума
      error.userMessage = errorMessage;
    }

    // Улучшенное сообщение об ошибке
    if (error.code === "ECONNABORTED") {
      error.userMessage =
        "Превышено время ожидания. Проверьте подключение к интернету.";
    } else if (error.code === "ERR_NETWORK") {
      error.userMessage =
        "Ошибка сети. Убедитесь, что сервер запущен и доступен.";
    } else if (
      error.response &&
      error.response.status !== 401 &&
      error.response.status !== 403
    ) {
      // Для других ошибок (кроме 401 и 403, которые уже обработаны)
      error.userMessage =
        error.response.data?.message ||
        `Ошибка сервера (${error.response.status})`;
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      error.userMessage = "Нет ответа от сервера. Проверьте подключение.";
    } else if (!error.userMessage) {
      error.userMessage = error.message || "Неизвестная ошибка";
    }

    return Promise.reject(error);
  },
);

export default api;
