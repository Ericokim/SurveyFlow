import * as Sentry from "@sentry/tanstackstart-react";
import { createServerFn } from "@tanstack/react-start";
import { createWorkspaceWithOwner } from "@/features/workspace/create-workspace";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { clearSessionCookie, issueSessionCookie } from "@/server/auth/session";
import { connectToDatabase } from "@/server/db/mongoose";
import { Membership } from "@/server/models/membership.model";
import { User } from "@/server/models/user.model";

import { loginSchema, registerSchema } from "./schemas";

/**
 * Deliberately vague, and deliberately identical for "no such account" and
 * "wrong password" — a distinguishable message turns the login form into an
 * account-enumeration oracle.
 */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Email or password is incorrect.", 401);
  }
}

export class EmailTakenError extends AppError {
  constructor() {
    super("An account with that email already exists.", 409);
  }
}

/** Where to send the browser after authenticating. */
export interface AuthResult {
  workspaceSlug: string;
}

/**
 * Register a person and seed their first workspace.
 *
 * A new user with no invitation becomes the owner of a freshly created
 * workspace. The two writes are paired by `createWorkspaceWithOwner`, which
 * guarantees a workspace never exists without an owner.
 */
export const registerUser = createServerFn({ method: "POST" })
  .validator(registerSchema)
  .handler(async ({ data }) =>
    Sentry.startSpan(
      { name: "registerUser" },
      async (): Promise<AuthResult> => {
        await connectToDatabase();

        const existing = await User.exists({ email: data.email });
        if (existing) throw new EmailTakenError();

        const user = await User.create({
          name: data.name,
          email: data.email,
          passwordHash: await hashPassword(data.password),
          isEmailVerified: false,
        });

        try {
          const workspace = await createWorkspaceWithOwner({
            ownerId: user._id,
            workspaceName:
              data.workspaceName?.trim() || `${data.name}'s Workspace`,
          });

          issueSessionCookie({ userId: String(user._id) });

          return { workspaceSlug: workspace.slug };
        } catch (error) {
          // The account is useless without a workspace — do not strand it.
          await User.deleteOne({ _id: user._id }).catch(() => undefined);
          throw error;
        }
      },
    ),
  );

/**
 * Sign in and resolve a workspace to land in.
 *
 * A user with no memberships cannot reach `/app/:workspaceSlug/*` at all, so
 * that case is surfaced rather than silently redirecting into a dead end.
 */
export const loginUser = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) =>
    Sentry.startSpan({ name: "loginUser" }, async (): Promise<AuthResult> => {
      await connectToDatabase();

      const user = await User.findOne({ email: data.email }).select({
        passwordHash: 1,
        isActive: 1,
      });

      // Compare even when the user is missing so the response time does not
      // reveal whether the address exists.
      const hash =
        user?.passwordHash ??
        "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
      const matches = await verifyPassword(data.password, hash);

      if (!user || !user.isActive || !matches) {
        throw new InvalidCredentialsError();
      }

      const membership = await Membership.findOne({ userId: user._id })
        .select({ companyId: 1 })
        .populate<{ companyId: { slug: string } }>("companyId", "slug")
        .lean();

      if (!membership) {
        throw new Error(
          "This account is not a member of any workspace. Ask an administrator for an invitation.",
        );
      }

      issueSessionCookie({ userId: String(user._id) });
      await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

      return { workspaceSlug: membership.companyId.slug };
    }),
  );

export const logoutUser = createServerFn({ method: "POST" }).handler(
  async () => {
    clearSessionCookie();
    return { ok: true } as const;
  },
);
