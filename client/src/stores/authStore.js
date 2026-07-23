import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Auth Store - Zustand with localStorage persistence
 *
 * State:
 * - user: Current user object { _id, name, email, role, company }
 * - token: JWT token
 * - isAuthenticated: Computed boolean
 *
 * Actions:
 * - login(user, token): Set user + token
 * - logout(): Clear state
 * - updateUser(updates): Partial user update
 */

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      // Computed
      isAuthenticated: () => !!get().token && !!get().user,

      // Actions
      login: (user, token) => {
        set({ user, token });
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      },

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          set({ user: updatedUser });
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      },

      setUser: (user) => {
        set({ user });
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }
      },

      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem("token", token);
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
