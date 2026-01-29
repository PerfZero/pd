import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";

export const useAuthBootstrap = () => {
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const authStore = useAuthStore.getState();
      authStore.setBootstrapping(true);

      try {
        if (window.location.pathname === "/login") {
          return;
        }
        const response = await api.post("/auth/refresh");
        const { token } = response.data.data || {};

        if (token && isMounted) {
          authStore.updateTokens(token);
          await authStore.getCurrentUser();
        }
      } catch (error) {
        // Игнорируем: пользователь не авторизован
      } finally {
        if (isMounted) {
          authStore.setBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);
};
