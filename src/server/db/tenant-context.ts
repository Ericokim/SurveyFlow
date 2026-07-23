import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Which workspace is the current request working in?
 *
 * One server handles many requests at the same time, so we cannot keep this in
 * a normal variable — one request would overwrite another's value and we would
 * show the wrong workspace's data. `AsyncLocalStorage` keeps a separate value
 * per request for us.
 *
 * Read it as: a variable that is private to one request.
 */
const store = new AsyncLocalStorage<string>();

/** Run `fn` with `companyId` as the current workspace. */
export function withTenantContext<T>(
  companyId: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  // The `await` inside matters. A Mongoose query does not hit the database
  // until it is awaited. If we awaited outside this call, the workspace would
  // already be forgotten by the time the query ran.
  return store.run(companyId, async () => await fn());
}

/** The current workspace id, or null when we are not inside a request. */
export function getTenantCompanyId(): string | null {
  return store.getStore() ?? null;
}
