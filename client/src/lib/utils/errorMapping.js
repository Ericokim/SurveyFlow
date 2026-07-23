const defaultTitles = {
  not_found: "We couldn’t find that",
  auth: "Sign-in required",
  validation: "Let’s fix a few things",
  conflict: "That didn’t go through",
  network: "Connection issue",
  server: "We hit a snag",
  unknown: "Something went wrong",
};

const defaultMessages = {
  not_found:
    "The page or survey may have moved, or the link might be outdated.",
  auth: "Please sign in again or ask an admin to grant access.",
  validation: "Review the details and try again.",
  conflict: "Another change happened first. Refresh and try again.",
  network: "We can’t reach the service. Check your connection and try again.",
  server: "This one’s on us. Please try again in a moment.",
  unknown: "Something unexpected happened. Please try again.",
};

const typeByStatus = {
  400: "validation",
  401: "auth",
  403: "auth",
  404: "not_found",
  409: "conflict",
  422: "validation",
  429: "network",
  500: "server",
  502: "server",
  503: "server",
  504: "server",
};

const normalizeStatus = (error) => {
  const statusFromPayload = error?.response?.data?.status?.code;
  return statusFromPayload || error?.response?.status || error?.status || null;
};

const isNetworkError = (error) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  const message = error?.message?.toLowerCase?.() || "";
  return (
    !error?.response &&
    (message.includes("network") ||
      message.includes("failed to fetch") ||
      message.includes("timeout") ||
      error?.code === "ECONNABORTED")
  );
};

export const resolveErrorDisplay = (error, overrides = {}) => {
  const statusCode = normalizeStatus(error);
  const network = isNetworkError(error);
  const type =
    overrides.type ||
    (network ? "network" : typeByStatus[statusCode] || "unknown");

  const payloadMessage = error?.response?.data?.status?.message;
  const fallbackTitle = defaultTitles[type];
  const fallbackMessage = defaultMessages[type];

  const title = overrides.title || payloadMessage || fallbackTitle;
  const description = overrides.description || fallbackMessage;
  const debugId = error?.response?.data?.errorId || error?.errorId || null;

  return {
    type,
    statusCode: overrides.statusCode || (network ? 503 : statusCode),
    title,
    description,
    debugId,
    variant: overrides.variant || (type === "auth" ? "warning" : "error"),
  };
};
