import { test } from "node:test";
import { deepEqual } from "node:assert";

import { buildRecipientUploadToast } from "../../src/lib/utils/recipientUploadSummary.js";

test("buildRecipientUploadToast handles mixed duplicate and error results with no created rows", () => {
  const result = buildRecipientUploadToast({
    totalRows: 3,
    created: 0,
    duplicates: 1,
    errors: 1,
  });

  deepEqual(result, {
    level: "warning",
    message: "Upload completed: 1 duplicate skipped, 1 error",
  });
});

test("buildRecipientUploadToast keeps all-duplicate message when there are no errors", () => {
  const result = buildRecipientUploadToast({
    created: 0,
    duplicates: 2,
    errors: 0,
  });

  deepEqual(result, {
    level: "warning",
    message: "All 2 recipients are already in the list",
  });
});

test("buildRecipientUploadToast keeps all-error message when there are no duplicates", () => {
  const result = buildRecipientUploadToast({
    created: 0,
    duplicates: 0,
    errors: 2,
  });

  deepEqual(result, {
    level: "error",
    message: "Upload failed: 2 errors found in CSV",
  });
});
