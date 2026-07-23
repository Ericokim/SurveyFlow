export const buildRecipientUploadToast = (summary = {}) => {
  const { created = 0, duplicates = 0, errors = 0 } = summary;

  if (created > 0 && duplicates === 0 && errors === 0) {
    return {
      level: "success",
      message: `Successfully uploaded ${created} recipient${created > 1 ? "s" : ""}`,
    };
  }

  if (created > 0 && (duplicates > 0 || errors > 0)) {
    const parts = [`${created} uploaded`];
    if (duplicates > 0) {
      parts.push(`${duplicates} duplicate${duplicates > 1 ? "s" : ""} skipped`);
    }
    if (errors > 0) {
      parts.push(`${errors} error${errors > 1 ? "s" : ""}`);
    }

    return {
      level: "warning",
      message: `Upload completed: ${parts.join(", ")}`,
    };
  }

  if (created === 0 && duplicates > 0 && errors > 0) {
    return {
      level: "warning",
      message: `Upload completed: ${duplicates} duplicate${
        duplicates > 1 ? "s" : ""
      } skipped, ${errors} error${errors > 1 ? "s" : ""}`,
    };
  }

  if (duplicates > 0 && created === 0) {
    return {
      level: "warning",
      message: `All ${duplicates} recipient${
        duplicates > 1 ? "s are" : " is"
      } already in the list`,
    };
  }

  if (errors > 0 && created === 0) {
    return {
      level: "error",
      message: `Upload failed: ${errors} error${errors > 1 ? "s" : ""} found in CSV`,
    };
  }

  return {
    level: "info",
    message: "Upload completed",
  };
};
