import { useAuthStore } from "../stores/authStore";

/**
 * User Hook - Access current user data
 *
 * Returns:
 * - user: Current user object
 * - role: User role (admin | viewer)
 * - companyId: Company ID
 * - isAdmin: Boolean
 * - isViewer: Boolean
 */

export function useUser() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return {
      user: null,
      role: null,
      companyId: null,
      isAdmin: false,
      isViewer: false,
    };
  }

  return {
    user,
    role: user.role,
    companyId: user.company?._id || user.company,
    isAdmin: user.role === "admin",
    isViewer: user.role === "viewer",
  };
}
