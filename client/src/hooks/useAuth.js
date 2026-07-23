import { useAuthStore } from "../stores/authStore";

/**
 * Auth Hook
 *
 * Returns:
 * - user: Current user object
 * - token: JWT token
 * - isAuthenticated: Boolean
 * - login(user, token): Login action
 * - logout(): Logout action
 */

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore(
    (state) => !!state.token && !!state.user
  );
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  };
}
