import { getCookie, setCookie } from "@tanstack/react-start/server";
import jwt from "jsonwebtoken";

import { env } from "@/env";
import { AppError } from "@/lib/errors";

/**
 * The session establishes **who the user is** — never which workspace they are
 * acting in. Workspace comes from the URL slug plus a membership check on
 * every request, so revoking a membership takes effect immediately rather than
 * at token expiry. See docs/specs/2026-07-23-multitenant-foundation.md
 * (Decision 3).
 */
export interface SessionPayload {
  userId: string;
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, 401);
  }
}

function requireSecret(): string {
  const secret = env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Add it to .env.local (see .env.example) before using any authenticated feature.",
    );
  }

  return secret;
}

export function issueSessionCookie(payload: SessionPayload): void {
  const token = jwt.sign(payload, requireSecret(), {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  setCookie(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
  });
}

export function clearSessionCookie(): void {
  setCookie(env.AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Returns the session, or null when absent, malformed, or expired. */
export function getSession(): SessionPayload | null {
  const token = getCookie(env.AUTH_COOKIE_NAME);

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, requireSecret());

    if (typeof decoded === "string" || typeof decoded.userId !== "string") {
      return null;
    }

    return { userId: decoded.userId };
  } catch {
    // Expired or tampered — indistinguishable to the caller by design.
    return null;
  }
}

/** Throwing variant for server functions that require a signed-in user. */
export function requireSession(): SessionPayload {
  const session = getSession();

  if (!session) throw new UnauthenticatedError();

  return session;
}
