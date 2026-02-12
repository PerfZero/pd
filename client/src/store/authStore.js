import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/services/api";
import { useReferencesStore } from "./referencesStore";
import { useEmployeesStore } from "./employeesStore";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isBootstrapping: true,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await api.post("/auth/login", credentials);
          const { user, token } = response.data.data;

          set({
            user,
            token,
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
          });

          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await api.post("/auth/register", userData);

          const { user, token } = response.data.data;

          set({
            user,
            token,
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
          });

          return response.data;
        } catch (error) {
          console.error("❌ Registration error:", {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status,
            baseURL: api.defaults.baseURL,
          });
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const currentToken = get().token;

        // Сначала очищаем локальное состояние
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });

        // Очищаем все кэши
        useReferencesStore.getState().clearAll();
        useEmployeesStore.getState().clear();

        // Если есть токен, пытаемся уведомить сервер (не критично если упадет)
        if (currentToken) {
          try {
            await api.post("/auth/logout");
          } catch (error) {
            // Игнорируем ошибки logout на сервере
          }
        }
      },

      getCurrentUser: async () => {
        try {
          const response = await api.get("/auth/me");
          // Сохраняем полный объект пользователя с ролью
          const userData = response.data.data.user || response.data.data;
          set({ user: userData });
          return response.data;
        } catch (error) {
          console.error("Get current user error:", error);
          throw error;
        }
      },

      updateToken: (token) => {
        set({ token, isAuthenticated: !!token });
      },

      updateTokens: (token, refreshToken = null) => {
        set({ token, refreshToken, isAuthenticated: !!token });
      },

      setBootstrapping: (isBootstrapping) => {
        set({ isBootstrapping });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) {
          return;
        }

        // Нормализуем состояние после восстановления из localStorage
        const hasToken = Boolean(state.token);
        state.isAuthenticated = hasToken;
        if (!hasToken) {
          state.user = null;
        }
      },
    },
  ),
);
