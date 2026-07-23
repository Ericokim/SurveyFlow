import request from "request";

const toArrayData = (payload) => {
  if (payload === null || payload === undefined) return [];
  if (Array.isArray(payload)) return payload;
  return [payload];
};

const normalizeResponse = (statusCode, body, fallbackMessage) => {
  const message =
    body?.status?.message ||
    body?.message ||
    fallbackMessage ||
    (statusCode >= 400 ? "Request failed" : "Request successful");

  const dataSource =
    body?.data !== undefined ? body.data : body !== undefined ? body : [];

  return {
    status: {
      code: statusCode,
      message,
    },
    data: toArrayData(dataSource),
    paging: body?.paging ?? null,
  };
};

export const Http = async (options, config = {}) => {
  const includeProviderResponse = config?.includeProviderResponse === true;

  return new Promise((resolve, reject) => {
    try {
      request(options, (error, response, body) => {
        if (error) {
          return reject({
            status: {
              code: 500,
              message: error.message || "Network request failed",
            },
            data: [],
            paging: null,
          });
        }

        const statusCode = response?.statusCode ?? 500;
        const rawBody = body;
        try {
          if (typeof body === "string") {
            body = JSON.parse(body);
          }
        } catch {
          // Keep raw body when response is not JSON.
        }

        const normalized = normalizeResponse(statusCode, body);
        const withProvider = includeProviderResponse
          ? {
              ...normalized,
              provider: {
                statusCode,
                headers: response?.headers || {},
                body,
                rawBody,
              },
            }
          : normalized;

        if (statusCode >= 400) return reject(withProvider);
        return resolve(withProvider);
      });
    } catch (error) {
      return reject({
        status: {
          code: 500,
          message: error.message || error.toString(),
        },
        data: [],
        paging: null,
      });
    }
  });
};
