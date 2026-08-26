import { useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { TICKETS } from "../graphql/operations";
import type { Ticket, TicketConnection } from "../types";
import { formatDateTime, formatRemainingMinutes } from "../utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ReportExportModal({ open, onClose }: Props) {
  const [fetchTickets, { loading, data }] = useLazyQuery<{ tickets: TicketConnection }>(TICKETS, {
    fetchPolicy: "network-only",
  });
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!open) return null;

  const getAllTickets = async (): Promise<Ticket[]> => {
    if (data?.tickets.nodes) {
      return data.tickets.nodes;
    }
    const res = await fetchTickets({ variables: { take: 1000 } });
    return res.data?.tickets.nodes ?? [];
  };

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleExportCSV = async () => {
    setExporting(true);
    setSuccessMessage(null);
    try {
      const tickets = await getAllTickets();

      // Headers
      const headers = [
        "Ticket ID",
        "Title",
        "Description",
        "Priority",
        "Status",
        "Reporter Name",
        "Reporter Email",
        "Assignee Name",
        "Assignee Email",
        "Created At",
        "Updated At",
        "First Response At",
        "Resolved At",
        "First Response SLA Due",
        "First Response SLA State",
        "First Response Remaining Time",
        "Resolution SLA Due",
        "Resolution SLA State",
        "Resolution Remaining Time",
      ];

      // Rows
      const rows = tickets.map((t) => [
        t.id,
        t.title,
        t.description,
        t.priority,
        t.status,
        t.reporter.name,
        t.reporter.email,
        t.assignee?.name ?? "Unassigned",
        t.assignee?.email ?? "",
        formatDateTime(t.createdAt),
        formatDateTime(t.updatedAt),
        t.firstResponseAt ? formatDateTime(t.firstResponseAt) : "Pending",
        t.resolvedAt ? formatDateTime(t.resolvedAt) : "Pending",
        formatDateTime(t.sla.firstResponseDueAt),
        t.sla.firstResponseState,
        formatRemainingMinutes(t.sla.firstResponseRemainingMinutes),
        formatDateTime(t.sla.resolutionDueAt),
        t.sla.resolutionState,
        formatRemainingMinutes(t.sla.resolutionRemainingMinutes),
      ]);

      const csvContent =
        "\uFEFF" + // UTF-8 BOM for Excel compatibility
        headers.map(escapeCSV).join(",") +
        "\n" +
        rows.map((row) => row.map(escapeCSV).join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `sla_tickets_report_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Successfully exported ${tickets.length} tickets to Excel (CSV)!`);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPDF = async () => {
    setExporting(true);
    try {
      const tickets = await getAllTickets();
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>SLA Support Tickets Report - ${new Date().toLocaleDateString()}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; }
              h1 { font-size: 20px; margin-bottom: 4px; }
              p.meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
              th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
              th { background-color: #f8fafc; font-weight: 600; color: #334155; }
              .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px; }
              .resolved { background: #dcfce7; color: #15803d; }
              .in-progress { background: #dbeafe; color: #1e40af; }
              .open { background: #fef3c7; color: #92400e; }
              .breached { background: #ffe4e6; color: #be123c; }
              .on-track { background: #dcfce7; color: #15803d; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>SLA Support Tickets Summary Report</h1>
            <p class="meta">Generated on ${new Date().toLocaleString()} • Total Tickets: ${tickets.length}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reporter</th>
                  <th>Assignee</th>
                  <th>Created</th>
                  <th>First Response SLA</th>
                  <th>Resolution SLA</th>
                </tr>
              </thead>
              <tbody>
                ${tickets
                  .map(
                    (t) => `
                  <tr>
                    <td><strong>${t.id.slice(0, 8)}</strong></td>
                    <td>${t.title}</td>
                    <td>${t.priority}</td>
                    <td><span class="badge ${t.status.toLowerCase()}">${t.status}</span></td>
                    <td>${t.reporter.name}</td>
                    <td>${t.assignee?.name ?? "Unassigned"}</td>
                    <td>${formatDateTime(t.createdAt)}</td>
                    <td><span class="badge ${t.sla.firstResponseState === "BREACHED" ? "breached" : "on-track"}">${t.sla.firstResponseState}</span></td>
                    <td><span class="badge ${t.sla.resolutionState === "BREACHED" ? "breached" : "on-track"}">${t.sla.resolutionState}</span></td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Export Tickets Report</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          Export a complete summary report of all tickets raised, including priority, lifecycle status, SLA target times, remaining business hours, and resolution milestones.
        </p>

        {successMessage && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            ✓ {successMessage}
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          {/* Excel / CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left text-xs shadow-2xs transition hover:border-indigo-600 hover:bg-indigo-50/40 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900">Microsoft Excel / CSV Sheet</p>
                <p className="text-[11px] text-slate-400">Download formatted .csv file for Excel &amp; Sheets</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600">Download →</span>
          </button>

          {/* Print / PDF Summary Button */}
          <button
            onClick={handlePrintPDF}
            disabled={exporting || loading}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left text-xs shadow-2xs transition hover:border-indigo-600 hover:bg-indigo-50/40 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-900">Print / Save as PDF</p>
                <p className="text-[11px] text-slate-400">Clean print view of all tickets and SLA states</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600">Print / PDF →</span>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
