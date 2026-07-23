import test from "node:test";
import assert from "node:assert/strict";

import { deriveRecipientStatus } from "../../controllers/recipients.controllers.js";

test("deriveRecipientStatus returns completed when the active-version response is completed", () => {
  const status = deriveRecipientStatus(
    {
      status: "completed",
      invitedAt: new Date("2026-02-14T00:00:00.000Z"),
      completedAt: new Date("2026-02-15T00:00:00.000Z"),
    },
    {
      responseStatus: "completed",
    }
  );

  assert.equal(status, "completed");
});

test("deriveRecipientStatus keeps completed recipients completed even without an active-version response", () => {
  const status = deriveRecipientStatus({
    status: "completed",
    invitedAt: new Date("2026-02-14T00:00:00.000Z"),
    completedAt: new Date("2026-02-15T00:00:00.000Z"),
  });

  assert.equal(status, "completed");
});

test("deriveRecipientStatus keeps completedAt-only recipients completed", () => {
  const status = deriveRecipientStatus({
    status: "pending",
    invitedAt: null,
    completedAt: new Date("2026-02-15T00:00:00.000Z"),
  });

  assert.equal(status, "completed");
});
