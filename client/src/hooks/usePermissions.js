import { useUser } from "./useUser";

/**
 * Permissions Hook - RBAC helpers
 *
 * Rules:
 * - admin: Full CRUD on surveys, recipients, responses
 * - viewer: Read-only access, cannot create/edit/publish
 *
 * Returns:
 * - canEdit: Can create/update surveys
 * - canPublish: Can publish surveys
 * - canDelete: Can delete surveys
 * - canManageRecipients: Can add/remove recipients
 * - canViewResponses: Can view response data
 */

export function usePermissions() {
  const { isAdmin, isViewer } = useUser();

  return {
    canEdit: isAdmin,
    canPublish: isAdmin,
    canDelete: isAdmin,
    canManageRecipients: isAdmin,
    canViewResponses: isAdmin || isViewer, // Both roles can view
  };
}
