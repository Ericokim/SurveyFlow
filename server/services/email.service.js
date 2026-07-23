/**
 * Email Service
 */
import { logger } from "../utils/logger.js";
import { Http } from "./http.service.js";

/**
 * Send an email via the Comms API.
 *
 * @param {Object} payload
 * @param {string} payload.to       - Recipient address
 * @param {string} payload.subject  - Email subject
 * @param {string} payload.message  - Plain-text body
 * @param {string} [payload.cc]     - Optional CC address
 * @returns {Promise<Object>}
 */
export const sendEMAIL = async ({ to, subject, message, cc = "" }) => {
  const COMMS_API_URL = process.env.COMMS_API_URL;
  const COMMS_APP_ID = process.env.COMMS_APP_ID;
  const FROM_ADDRESS = process.env.EMAIL_FROM;

  if (!COMMS_API_URL || !COMMS_APP_ID) {
    logger?.warn?.(
      `[EMAIL] Comms API not configured. Would send to <${to}>:\nSubject: ${subject}\n${message}`
    );
    throw {
      status: {
        code: 500,
        message: "Comms API not configured. Email was not sent.",
      },
      data: [],
      paging: null,
    };
  }

  try {
    const options = {
      method: "POST",

      url: `${COMMS_API_URL}/api/v1.0/email/sendHtml`,
      headers: {
        "Content-Type": "application/json",
        "x-app-id": COMMS_APP_ID,
      },

      json: {
        to,
        cc,
        from: FROM_ADDRESS || "info@enauli.co.ke",
        subject,
        message,
        priority: "0",
        product: "survey",
        notificationURL: "POST-URL",
        externalId: "NA",
      },
    };

    logger?.info?.(
      `[EMAIL] Calling Comms API: POST ${options.url} (to=<${to}>)`
    );

    const resp = await Http(options, { includeProviderResponse: true });
    const providerBody = resp?.provider?.body;
    const queuedId = providerBody?.data?.id || resp?.data?.[0]?.id;
    if (!queuedId) {
      throw {
        status: {
          code: 502,
          message:
            providerBody?.message ||
            resp?.status?.message ||
            "Comms API did not return a queue id for this email.",
        },
        data: resp?.data || [],
        paging: null,
        provider: resp?.provider || null,
      };
    }

    logger?.info?.(
      `[EMAIL] Email queued to <${to}> via Comms API. queueId=${queuedId}`
    );
    return {
      status: resp?.status,
      data: resp?.data,
      paging: resp?.paging,
      provider: resp?.provider || null,
    };
  } catch (error) {
    logger?.error?.(
      `[EMAIL] Failed to send email to <${to}> via Comms API: ${JSON.stringify(error)}`
    );
    throw error;
  }
};

/**
 * Send a password-reset link email.
 *
 * @param {string} to       - Recipient email address
 * @param {string} name     - Recipient's display name
 * @param {string} resetUrl - Full URL the user clicks to reset their password
 * @returns {Promise<Object>}
 */
export const sendPasswordResetLinkEmail = async (to, name, resetUrl) => {
  const subject = "Reset Your Password";
  const message =
    `Hi ${name},\n\n` +
    `You are receiving this email because you requested ` +
    `the reset of a password. Please click the link below to reset your password:\n\n` +
    `${resetUrl}\n\n` +
    `This link expires in 10 minutes.\n\n` +
    `If you did not request this, you can safely ignore this email.`;

  const response = await sendEMAIL({ to, subject, message });

  logger.info(`[EMAIL] Password reset link sent to <${to}>`);
  return response;
};
