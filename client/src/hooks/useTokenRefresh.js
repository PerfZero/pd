import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { jwtDecode } from "jwt-decode";
import { refreshAccessToken } from "@/services/api";

/**
 * Hook для автоматического обновления токена за 2 минуты до истечения
 * Обновляет токен в фоне каждые 30 секунд если нужно
 */
export const useTokenRefresh = () => {
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      try {
        const authStore = useAuthStore.getState();
        const { token } = authStore;

        if (!token) {
          return;
        }

        // Декодируем токен
        const decoded = jwtDecode(token);
        const expiryTime = decoded.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);

        // Если токен истекает в течение 2 минут - обновляем его
        if (minutesUntilExpiry <= 2 && minutesUntilExpiry > 0) {
          console.log(
            `⏱️ Token expiring in ${minutesUntilExpiry.toFixed(1)} minutes. Refreshing...`,
          );

          try {
            const refreshedToken = await refreshAccessToken();
            if (refreshedToken) {
              console.log("✅ Token refreshed proactively");
            } else {
              console.warn("⚠️ Proactive token refresh skipped/failed");
            }
          } catch (error) {
            console.error(
              "❌ Failed to refresh token:",
              error.response?.status,
            );
          }
        }
      } catch (error) {
        console.error("Error in token refresh check:", error.message);
      }
    };

    // Проверяем токен каждые 30 секунд
    const interval = setInterval(checkAndRefreshToken, 30 * 1000);

    return () => clearInterval(interval);
  }, []);
};
