import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import { Input } from "../ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { useUploadRecipientsCsv } from "../../lib/queries/recipients";
import { cn } from "../../lib/utils";
import {
  Upload,
  FileText,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from "lucide-react";

const TEMPLATE_CSV = `name,phone,email
John Doe,254712345678,john@example.com
,,jane@example.com
Bob Wilson,254798765432,`;
const SCIENTIFIC_NOTATION_PATTERN = /^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i;

const createValidationState = () => ({
  status: "idle",
  errors: [],
  generalErrors: [],
  warnings: [],
  preview: [],
  totalRows: 0,
});

const normalizeCellValue = (value) => String(value ?? "");
const stripRowPrefix = (message = "") => message.replace(/^Row \d+:\s*/, "");

const issueLabelForMessage = (message = "") => {
  const normalized = stripRowPrefix(message);

  if (/scientific notation/i.test(normalized)) {
    return "Scientific notation detected";
  }

  if (/At least phone or email is required/i.test(normalized)) {
    return "Missing contact info";
  }

  if (/Phone is duplicated in this CSV/i.test(normalized)) {
    return "Duplicate phone";
  }

  if (/Email is duplicated in this CSV/i.test(normalized)) {
    return "Duplicate email";
  }

  if (/Email format may be invalid/i.test(normalized)) {
    return "Check email format";
  }

  return normalized;
};

const createEditableRows = (data = []) =>
  data.map((row, index) => ({
    rowNumber: index + 2,
    name: normalizeCellValue(row.name),
    phone: normalizeCellValue(row.phone),
    email: normalizeCellValue(row.email),
  }));

const reindexRows = (rows = []) =>
  rows.map((row, index) => ({
    ...row,
    rowNumber: index + 2,
  }));

const groupIssuesByMessage = (items = []) =>
  Array.from(
    items.reduce((groups, item) => {
      const normalizedMessage = stripRowPrefix(item.message);
      const existing = groups.get(normalizedMessage) || {
        id: normalizedMessage,
        message: normalizedMessage,
        label: issueLabelForMessage(normalizedMessage),
        rows: [],
      };

      existing.rows.push(item.rowNumber);
      groups.set(normalizedMessage, existing);
      return groups;
    }, new Map()).values()
  );

const createUploadFile = (rows, fileName = "recipient-template.csv") => {
  const csvText = Papa.unparse(
    rows.map((row) => ({
      name: row.name.trim(),
      phone: row.phone.trim(),
      email: row.email.trim(),
    }))
  );

  return new File([csvText], fileName, {
    type: "text/csv;charset=utf-8",
  });
};

export function UploadRecipientsDialog({ open, onOpenChange, surveyId }) {
  const [file, setFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [validationState, setValidationState] = useState(createValidationState);
  const [selectedRowNumber, setSelectedRowNumber] = useState(null);
  const [editingRowNumber, setEditingRowNumber] = useState(null);
  const [isValidationExpanded, setIsValidationExpanded] = useState(true);
  const rowRefs = useRef(new Map());

  const { mutate: uploadCsv, isPending } = useUploadRecipientsCsv();

  const validateCsvData = useCallback((rows, headers = []) => {
    const errors = [];
    const generalErrors = [];
    const warnings = [];
    const preview = (rows || []).map((row) => ({
      rowNumber: row.rowNumber,
      name: normalizeCellValue(row.name),
      phone: normalizeCellValue(row.phone),
      email: normalizeCellValue(row.email),
      errors: [],
      warnings: [],
    }));
    const phoneCounts = new Map();
    const emailCounts = new Map();

    if (!rows || rows.length === 0) {
      return {
        ...createValidationState(),
        status: "error",
        generalErrors: ["CSV file is empty"],
      };
    }

    const addRowError = (rowIndex, message) => {
      const rowNumber = preview[rowIndex].rowNumber;
      preview[rowIndex].errors.push(message);
      errors.push({
        id: `error-${rowNumber}-${errors.length}`,
        rowNumber,
        message,
      });
    };

    const addRowWarning = (rowIndex, message) => {
      const rowNumber = preview[rowIndex].rowNumber;
      preview[rowIndex].warnings.push(message);
      warnings.push({
        id: `warning-${rowNumber}-${warnings.length}`,
        rowNumber,
        message,
      });
    };

    if (!headers.includes("phone") && !headers.includes("email")) {
      generalErrors.push("At least one of phone or email column is required");
    }

    rows.forEach((row) => {
      const normalizedPhone = row.phone.trim();
      const normalizedEmail = row.email.trim().toLowerCase();

      if (normalizedPhone) {
        phoneCounts.set(
          normalizedPhone,
          (phoneCounts.get(normalizedPhone) || 0) + 1
        );
      }

      if (normalizedEmail) {
        emailCounts.set(
          normalizedEmail,
          (emailCounts.get(normalizedEmail) || 0) + 1
        );
      }
    });

    preview.forEach((row, index) => {
      const rowNum = row.rowNumber;
      const normalizedPhone = row.phone.trim();
      const normalizedEmail = row.email.trim().toLowerCase();

      if (!normalizedPhone && !normalizedEmail) {
        addRowError(index, `Row ${rowNum}: At least phone or email is required`);
      }

      if (normalizedPhone && (phoneCounts.get(normalizedPhone) || 0) > 1) {
        addRowError(index, `Row ${rowNum}: Phone is duplicated in this CSV`);
      }

      if (normalizedEmail && (emailCounts.get(normalizedEmail) || 0) > 1) {
        addRowError(index, `Row ${rowNum}: Email is duplicated in this CSV`);
      }

      if (
        normalizedPhone &&
        SCIENTIFIC_NOTATION_PATTERN.test(normalizedPhone)
      ) {
        addRowError(
          index,
          `Row ${rowNum}: Phone number appears to be in scientific notation. Format the phone column as text before saving the CSV`
        );
      }

      if (
        normalizedEmail &&
        !normalizedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ) {
        addRowWarning(index, `Row ${rowNum}: Email format may be invalid`);
      }
    });

    return {
      ...createValidationState(),
      status: errors.length > 0 || generalErrors.length > 0 ? "error" : "ready",
      errors,
      generalErrors,
      warnings,
      preview,
      totalRows: rows.length,
    };
  }, []);

  const applyValidation = useCallback(
    (rows, headers = csvHeaders) => {
      const nextValidation = validateCsvData(rows, headers);
      setValidationState(nextValidation);
      if (
        nextValidation.errors.length > 0 ||
        nextValidation.generalErrors.length > 0
      ) {
        setIsValidationExpanded(true);
      }
      return nextValidation;
    },
    [csvHeaders, validateCsvData]
  );

  const closeRowEditor = useCallback(() => {
    setEditingRowNumber(null);
    setSelectedRowNumber(null);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setCsvRows([]);
    setCsvHeaders([]);
    setSelectedRowNumber(null);
    setEditingRowNumber(null);
    setIsValidationExpanded(true);
    rowRefs.current.clear();
    setValidationState(createValidationState());
  }, []);

  const scrollToRow = useCallback((rowNumber) => {
    const rowNode = rowRefs.current.get(rowNumber);
    setSelectedRowNumber(rowNumber);
    setEditingRowNumber(rowNumber);
    if (!rowNode) return;

    rowNode.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  const handleCellChange = useCallback(
    (rowNumber, field, value) => {
      setCsvRows((previousRows) => {
        const nextRows = previousRows.map((row) =>
          row.rowNumber === rowNumber ? { ...row, [field]: value } : row
        );
        applyValidation(nextRows, csvHeaders);
        return nextRows;
      });
    },
    [applyValidation, csvHeaders]
  );

  const removeRow = useCallback(
    (rowNumber) => {
      setCsvRows((previousRows) => {
        const nextRows = reindexRows(
          previousRows.filter((row) => row.rowNumber !== rowNumber)
        );
        applyValidation(nextRows, csvHeaders);
        return nextRows;
      });
      closeRowEditor();
    },
    [applyValidation, closeRowEditor, csvHeaders]
  );

  useEffect(() => {
    if (!editingRowNumber) return undefined;

    const handlePointerDown = (event) => {
      const activeRow = rowRefs.current.get(editingRowNumber);
      if (!activeRow) return;

      if (!activeRow.contains(event.target)) {
        closeRowEditor();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closeRowEditor, editingRowNumber]);

  const onDrop = useCallback(
    (acceptedFiles) => {
      const nextFile = acceptedFiles[0];
      if (!nextFile) return;

      setFile(nextFile);
      setSelectedRowNumber(null);
      setEditingRowNumber(null);
      setValidationState({
        ...createValidationState(),
        status: "validating",
      });

      Papa.parse(nextFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = createEditableRows(results.data);
          const headers = results.meta?.fields || [];
          setCsvRows(rows);
          setCsvHeaders(headers);
          const nextValidation = validateCsvData(rows, headers);
          setValidationState(nextValidation);
          setIsValidationExpanded(
            nextValidation.errors.length > 0 ||
              nextValidation.generalErrors.length > 0
          );
        },
        error: (error) => {
          setCsvRows([]);
          setCsvHeaders([]);
          setValidationState({
            ...createValidationState(),
            status: "error",
            generalErrors: [`Failed to parse CSV: ${error.message}`],
          });
          setIsValidationExpanded(true);
        },
      });
    },
    [validateCsvData]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const handleUpload = () => {
    if (!file || validationState.status !== "ready") return;

    const uploadFile = createUploadFile(csvRows, file.name);

    uploadCsv(
      { surveyId, file: uploadFile },
      {
        onSuccess: () => {
          setTimeout(() => {
            handleReset();
            onOpenChange(false);
          }, 150);
        },
      }
    );
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recipient-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const groupedErrors = groupIssuesByMessage(validationState.errors);
  const groupedWarnings = groupIssuesByMessage(validationState.warnings);
  const hasValidationIssues =
    validationState.generalErrors.length > 0 || groupedErrors.length > 0;
  const showAllRows =
    validationState.status === "error" || editingRowNumber !== null;
  const previewRows = showAllRows
    ? validationState.preview
    : validationState.preview.slice(0, 5);
  const hasRowIssues = previewRows.some(
    (row) => row.errors.length > 0 || row.warnings.length > 0
  );
  const affectedRowCount = new Set(
    validationState.errors.map((error) => error.rowNumber)
  ).size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload Recipients (CSV)</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing recipient information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText className="h-4 w-4" />
              <span>Need help? Download the CSV template</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>

          {validationState.status === "idle" && (
            <div
              {...getRootProps()}
              className={cn(
                "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                isDragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              {isDragActive ? (
                <p className="text-sm text-gray-600">
                  Drop your CSV file here...
                </p>
              ) : (
                <>
                  <p className="mb-2 text-sm text-gray-600">
                    Drag and drop a CSV file here, or click to select
                  </p>
                  <p className="text-xs text-gray-500">
                    File must include phone or email. Use `254...` for phone numbers.
                  </p>
                </>
              )}
            </div>
          )}

          {validationState.status === "validating" && (
            <div className="p-6 text-center">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600">Validating CSV data...</p>
            </div>
          )}

          {(validationState.status === "ready" ||
            validationState.status === "error") && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-gray-500">
                    {validationState.totalRows} recipient(s) found
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Change
                </Button>
              </div>

              {hasValidationIssues && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <Collapsible
                      open={isValidationExpanded}
                      onOpenChange={setIsValidationExpanded}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">Validation Failed</p>
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700">
                              {affectedRowCount} row
                              {affectedRowCount === 1 ? "" : "s"} need attention
                            </span>
                            <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700">
                              {groupedErrors.length} issue type
                              {groupedErrors.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="text-xs text-red-600">
                            Open the details to review grouped issues, then click
                            a row or row chip to edit the affected cells.
                          </p>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" type="button">
                            {isValidationExpanded ? "Hide details" : "Show details"}
                            {isValidationExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="space-y-3 pt-4">
                        {validationState.generalErrors.length > 0 && (
                          <ul className="space-y-1 text-xs">
                            {validationState.generalErrors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        )}
                        {groupedErrors.length > 0 && (
                          <ul className="space-y-2">
                            {groupedErrors.map((group) => (
                              <li
                                key={group.id}
                                className="rounded-md border border-red-200 bg-white px-3 py-2"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-red-700">
                                      {group.label}
                                    </p>
                                    <p className="text-xs text-red-600">
                                      {group.message}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {group.rows.map((rowNumber) => (
                                      <button
                                        key={`${group.id}-${rowNumber}`}
                                        type="button"
                                        onClick={() => scrollToRow(rowNumber)}
                                        className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100"
                                      >
                                        Row {rowNumber}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </AlertDescription>
                </Alert>
              )}

              {groupedWarnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="mb-2 font-medium">Warnings</p>
                    <ul className="space-y-2">
                      {groupedWarnings.map((group) => (
                        <li
                          key={group.id}
                          className="rounded-md border border-amber-200 bg-white px-3 py-2"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-amber-800">
                                {group.label}
                              </p>
                              <p className="text-xs text-amber-700">
                                {group.message}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {group.rows.map((rowNumber) => (
                                <button
                                  key={`${group.id}-${rowNumber}`}
                                  type="button"
                                  onClick={() => scrollToRow(rowNumber)}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                                >
                                  Row {rowNumber}
                                </button>
                              ))}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {previewRows.length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                  <div className="flex items-center justify-between border-b bg-gray-50 p-2">
                    <p className="text-xs font-medium text-gray-700">
                      {showAllRows ? "Preview (all rows)" : "Preview (first 5 rows)"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Click a row to edit it in place.
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 border-b bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Phone
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                            Email
                          </th>
                          {hasRowIssues && (
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                              Issue
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {previewRows.map((row) => {
                          const hasErrors = row.errors.length > 0;
                          const hasWarnings = row.warnings.length > 0;
                          const isEditingRow = editingRowNumber === row.rowNumber;

                          return (
                            <tr
                              key={row.rowNumber}
                              ref={(node) => {
                                if (node) {
                                  rowRefs.current.set(row.rowNumber, node);
                                } else {
                                  rowRefs.current.delete(row.rowNumber);
                                }
                              }}
                              onClick={() => {
                                setSelectedRowNumber(row.rowNumber);
                                setEditingRowNumber(row.rowNumber);
                              }}
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-gray-50",
                                selectedRowNumber === row.rowNumber &&
                                  "ring-2 ring-slate-300 ring-inset bg-slate-50/50"
                              )}
                            >
                              <td className="px-3 py-2 text-xs align-top">
                                {isEditingRow ? (
                                  <Input
                                    value={row.name}
                                    onChange={(event) =>
                                      handleCellChange(
                                        row.rowNumber,
                                        "name",
                                        event.target.value
                                      )
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Name for row ${row.rowNumber}`}
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  row.name || "—"
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs align-top text-gray-600">
                                {isEditingRow ? (
                                  <Input
                                    value={row.phone}
                                    onChange={(event) =>
                                      handleCellChange(
                                        row.rowNumber,
                                        "phone",
                                        event.target.value
                                      )
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Phone for row ${row.rowNumber}`}
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  row.phone || "—"
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs align-top text-gray-600">
                                {isEditingRow ? (
                                  <Input
                                    value={row.email}
                                    onChange={(event) =>
                                      handleCellChange(
                                        row.rowNumber,
                                        "email",
                                        event.target.value
                                      )
                                    }
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Email for row ${row.rowNumber}`}
                                    className="h-8 text-xs"
                                  />
                                ) : (
                                  row.email || "—"
                                )}
                              </td>
                              {hasRowIssues && (
                                <td className="px-3 py-2 text-xs align-top">
                                  <div className="flex flex-wrap gap-1.5">
                                    {hasErrors &&
                                      row.errors.map((error, index) => (
                                        <span
                                          key={`${row.rowNumber}-error-${index}`}
                                          className="inline-flex rounded-full bg-red-100 px-2 py-1 text-[11px] font-medium text-red-700"
                                        >
                                          {issueLabelForMessage(error)}
                                        </span>
                                      ))}
                                    {!hasErrors &&
                                      hasWarnings &&
                                      row.warnings.map((warning, index) => (
                                        <span
                                          key={`${row.rowNumber}-warning-${index}`}
                                          className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800"
                                        >
                                          {issueLabelForMessage(warning)}
                                        </span>
                                      ))}
                                    {!hasErrors && !hasWarnings && (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  {isEditingRow && (
                                    <div className="mt-2">
                                      <div className="mt-2 flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon-xs"
                                          aria-label={`Apply row ${row.rowNumber} changes`}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            closeRowEditor();
                                          }}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon-xs"
                                          aria-label={`Remove row ${row.rowNumber}`}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            removeRow(row.rowNumber);
                                          }}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            {validationState.status === "ready" && (
              <Button onClick={handleUpload} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {validationState.totalRows} Recipients
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
