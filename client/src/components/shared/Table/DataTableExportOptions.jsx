import { Button } from "../../ui/button";
import * as Dw from "../../ui/dropdown-menu";
import { FileText, FileIcon, PrinterIcon } from "lucide-react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import printJS from "print-js";
import { format } from "date-fns";

export function DataTableExportOptions({
  table,
  transformedData,
  tableKey = "surveys",
  fileName = "export",
  extraActions = [],
}) {
  const PRINT_FONT_STACK = "DM Sans, Inter, ui-sans-serif, system-ui, sans-serif";

  const removePunctuation = (text) =>
    text.replace(/[.,#:;*%$()'"><>`~?!]/g, "");

  const ExportActions = {
    CSV: "CSV",
    PDF: "PDF",
    Excel: "Excel",
    Print: "Print",
  };

  const rows = table.getRowModel().rows || [];
  const columns = table.getVisibleFlatColumns() || [];
  const selectedRows = table.getFilteredSelectedRowModel().rows || [];
  const selectedCount = selectedRows.length;

  const tableColumns = columns
    .filter((col) => col.id && !["select", "space", "actions"].includes(col.id))
    .map((c) => removePunctuation(c.id));

  const tableRows = transformedData
    ? transformedData
    : rows.map((row) => row.original || {});

  const headerMap = {};
  columns
    .filter((col) => col.id && !["select", "space", "actions"].includes(col.id))
    .forEach((col) => {
      const h = col.columnDef.header;
      let headerText =
        typeof h === "string" ? h : col.id.replace(/([a-z])([A-Z])/g, "$1 $2");
      headerMap[col.id] = headerText;
    });

  const formattedTitle = tableKey
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (str) => str.toUpperCase());

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd-MMM-yyyy hh:mm a");
    } catch {
      return date;
    }
  };

  const formatValue = (value, key) => {
    if (value === null || value === undefined) return "-";

    // Handle boolean fields
    if (key.toLowerCase().includes("whitelist") || typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    // Handle dates
    if (
      key.toLowerCase().includes("createdat") ||
      key.toLowerCase().includes("date")
    ) {
      return formatDate(value);
    }

    // Handle numbers (but not IDs or phone numbers)
    if (
      typeof value === "number" &&
      !key.toLowerCase().includes("id") &&
      !key.toLowerCase().includes("phone")
    ) {
      return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.length;
    }

    return value;
  };

  const handleElements = (rows, columns) => {
    return rows.map((item) => {
      const filteredItem = {};
      columns.forEach((key) => {
        let value = item[key];

        // Special handling for computed fields
        if (key === "questionCount" && !value) {
          value = item.questions?.length || 0;
        }

        filteredItem[key] = formatValue(value, key);
      });
      return filteredItem;
    });
  };

  const downloadData = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${format(new Date(), "yyyy-MM-dd-HHmmss")}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async (type) => {
    // Use selected rows if any, otherwise use all rows
    const rowsToExport =
      selectedCount > 0 ? selectedRows.map((row) => row.original) : tableRows;

    const matchedData = handleElements(rowsToExport, tableColumns);

    try {
      switch (type) {
        case ExportActions.CSV: {
          const fields = tableColumns.map((col) => headerMap[col]);
          const data = matchedData.map((row) =>
            tableColumns.map((col) => row[col])
          );
          const csvString = Papa.unparse({ fields, data });
          const csvData = new Blob([csvString], {
            type: "text/csv;charset=utf-8;",
          });
          const csvLink = window.URL.createObjectURL(csvData);
          downloadData(csvLink, `${fileName}.csv`);
          break;
        }

        case ExportActions.PDF: {
          const doc = new jsPDF("l", "pt", "a4");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(17, 24, 39);
          doc.text(
            formattedTitle.toUpperCase(),
            doc.internal.pageSize.width / 2,
            28,
            { align: "center" }
          );
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          doc.text(
            `Generated ${format(new Date(), "dd-MMM-yyyy hh:mm a")}`,
            doc.internal.pageSize.width / 2,
            43,
            { align: "center" }
          );

          const formattedData = matchedData.map((row) =>
            tableColumns.map((col) => {
              const value = row[col];
              return value === "-" ? "N/A" : value;
            })
          );

          const uppercaseHeaders = tableColumns.map((col) =>
            headerMap[col].toUpperCase().replace(/ /g, "\u00A0")
          );

          autoTable(doc, {
            head: [uppercaseHeaders],
            body: formattedData,
            startY: 58,
            headStyles: {
              fillColor: "#EEF2F7",
              textColor: [17, 24, 39],
              font: "Helvetica",
              fontStyle: "bold",
              fontSize: 8.5,
              cellPadding: 5,
              halign: "center",
              valign: "middle",
            },
            bodyStyles: {
              font: "Helvetica",
              fontSize: 9.5,
              cellPadding: 4.5,
              textColor: [31, 41, 55],
              valign: "middle",
              fillColor: [255, 255, 255],
            },
            margin: { top: 58, left: 34, right: 34, bottom: 40 },
            theme: "plain",
            styles: {
              overflow: "linebreak",
              lineWidth: 0.45,
              lineColor: [209, 213, 219],
            },
            columnStyles: tableColumns.reduce((acc, col, index) => {
              acc[index] = { cellWidth: "auto", maxCellHeight: 80 };
              return acc;
            }, {}),
            didDrawPage: (data) => {
              doc.setFontSize(8);
              doc.setTextColor(107, 114, 128);
              doc.text(
                `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`,
                doc.internal.pageSize.width - 34,
                doc.internal.pageSize.height - 18,
                { align: "right" }
              );
            },
          });

          doc.save(
            `${fileName}-${format(new Date(), "yyyy-MM-dd-HHmmss")}.pdf`
          );
          break;
        }

        case ExportActions.Excel: {
          const wb = XLSX.utils.book_new();

          const titleCaseData = matchedData.map((item) => {
            const newItem = {};
            tableColumns.forEach((key) => {
              const header = headerMap[key];
              newItem[header] = item[key];
            });
            return newItem;
          });

          const ws = XLSX.utils.json_to_sheet(titleCaseData);
          XLSX.utils.book_append_sheet(wb, ws, formattedTitle);
          XLSX.writeFile(
            wb,
            `${fileName}-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`
          );
          break;
        }

        case ExportActions.Print: {
          const properties = tableColumns.map((col) => ({
            field: col,
            displayName: headerMap[col].replace(/ /g, "\u00A0"),
          }));

          const reportHeader = `
            <div id="export_from_html">
              <div class="texts">
                <h4>${formattedTitle}</h4>
                <p>Generated ${format(new Date(), "dd-MMM-yyyy hh:mm a")}</p>
              </div>
            </div>
          `;

          printJS({
            printable: matchedData,
            properties: properties,
            type: "json",
            showModal: true,
            documentTitle: formattedTitle,
            header: reportHeader,
            gridHeaderStyle:
              `border: 1px solid #d1d5db; padding: 6px 8px; font-family:${PRINT_FONT_STACK}; font-weight: 700; font-size: 10px; color:#1f2937; text-align: left; white-space: nowrap;`,
            gridStyle:
              `border: 1px solid #e5e7eb; padding: 6px 8px; font-family:${PRINT_FONT_STACK}; font-size: 10px; color:#374151; background-color:#fff;`,
            style: `
            @page {
              size: landscape;
              margin: 14mm;
            }
            body {
              font-family: ${PRINT_FONT_STACK};
              color: #1f2937;
            }
            #export_from_html {
              display: flex;
              justify-content: center;
              margin-bottom: 8px;
              padding: 0;
            }
            #export_from_html .texts {
              text-align: center;
            }
            #export_from_html h4 {
              margin: 0;
              font-size: 16px;
              font-weight: 700;
              color: #111827;
            }
            #export_from_html p {
              margin: 2px 0 0;
              font-size: 11px;
              color: #6b7280;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }`,
            targetStyles: ["*"],
          });
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <Dw.DropdownMenu>
      <Dw.DropdownMenuTrigger asChild>
        <Button size="sm" type="button" variant="outline" className="h-8 gap-1">
          <FileIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            {selectedCount > 0 ? `Export (${selectedCount})` : "Export"}
          </span>
        </Button>
      </Dw.DropdownMenuTrigger>
      <Dw.DropdownMenuContent align="end" className="w-37.5 px-1">
        <Dw.DropdownMenuLabel className="flex items-center w-full justify-between">
          {selectedCount > 0
            ? `${selectedCount} row${selectedCount === 1 ? "" : "s"} selected`
            : "Export File"}
        </Dw.DropdownMenuLabel>
        <Dw.DropdownMenuSeparator />
        {Object.values(ExportActions).map((action) => (
          <Dw.DropdownMenuItem
            key={action}
            onClick={() => handleExport(action)}
          >
            {action}
            <Dw.DropdownMenuShortcut>
              {action === ExportActions.CSV && (
                <FileText className="h-4 w-4 text-green-600" />
              )}
              {action === ExportActions.PDF && (
                <FileIcon className="h-4 w-4 text-red-600" />
              )}
              {action === ExportActions.Excel && (
                <FileText className="h-4 w-4 text-blue-600" />
              )}
              {action === ExportActions.Print && (
                <PrinterIcon className="h-4 w-4 text-purple-600" />
              )}
            </Dw.DropdownMenuShortcut>
          </Dw.DropdownMenuItem>
        ))}
        {extraActions.length > 0 && (
          <>
            <Dw.DropdownMenuSeparator />
            {extraActions.map((action) => (
              <Dw.DropdownMenuItem
                key={action.key}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Dw.DropdownMenuItem>
            ))}
          </>
        )}
      </Dw.DropdownMenuContent>
    </Dw.DropdownMenu>
  );
}
