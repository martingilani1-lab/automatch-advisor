// The daily reminder email (pure: builds subject/HTML/text; sending lives in the cron route).
import type { Reminder } from "./reminders";
import { fmtDate } from "./reminders";

export interface EmailVehicleBlock {
  vehicleName: string;
  reminders: Reminder[];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtKm = (n: number) => `${n.toLocaleString("en-US").replace(/,/g, " ")} km`;

export function reminderLine(r: Reminder): string {
  const when: string[] = [];
  if (r.dueOn && r.daysLeft != null) {
    when.push(r.daysLeft < 0 ? `overdue since ${fmtDate(r.dueOn)}` : r.daysLeft === 0 ? "due today" : `due ${r.source === "service" ? "around " : ""}${fmtDate(r.dueOn)} (in ${r.daysLeft} days)`);
  }
  if (r.kmLeft != null) when.push(r.kmLeft < 0 ? `${fmtKm(-r.kmLeft)} past the interval` : `in about ${fmtKm(r.kmLeft)}`);
  return `${r.label}: ${when.join(", ")}`;
}

export function buildReminderEmail(blocks: EmailVehicleBlock[], siteUrl: string | null): { subject: string; html: string; text: string } {
  const count = blocks.reduce((n, b) => n + b.reminders.length, 0);
  const anyOverdue = blocks.some((b) => b.reminders.some((r) => r.status === "overdue"));
  const first = blocks[0]?.reminders[0];
  const subject =
    count === 1 && first
      ? `${blocks[0].vehicleName}: ${first.label}${first.status === "overdue" ? " is overdue" : " is coming up"}`
      : `My Garage: ${count} things ${anyOverdue ? "due or overdue" : "coming up"}`;
  const link = siteUrl ? `${siteUrl.replace(/\/$/, "")}/garage` : null;

  const text = [
    ...blocks.flatMap((b) => [b.vehicleName, ...b.reminders.map((r) => `  - ${reminderLine(r)}`), ""]),
    link ? `Open My Garage: ${link}` : "",
    "You get this because email reminders are on in My Garage. Turn them off there anytime.",
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:520px">
${blocks
  .map(
    (b) => `<h3 style="margin:18px 0 6px;font-size:16px">${esc(b.vehicleName)}</h3><ul style="margin:0;padding-left:18px">${b.reminders
      .map((r) => `<li style="margin:4px 0;${r.status === "overdue" ? "color:#c0392b" : ""}">${esc(reminderLine(r))}</li>`)
      .join("")}</ul>`
  )
  .join("\n")}
${link ? `<p style="margin-top:20px"><a href="${esc(link)}" style="color:#2563eb">Open My Garage</a> to log what's done -- that stops the reminder.</p>` : ""}
<p style="margin-top:20px;font-size:12px;color:#888">You get this because email reminders are on in My Garage. Turn them off there anytime.</p>
</div>`;
  return { subject, html, text };
}
