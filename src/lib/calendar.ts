/**
 * Getting the week into Google Calendar, Apple Calendar, or anything else.
 *
 * There is no OAuth here and none is needed. Google's API and Apple's CalDAV
 * both want a server to hold credentials, which a static export cannot have —
 * but both platforms already speak two things that need no account at all:
 *
 *   GOOGLE — a `render?action=TEMPLATE` URL opens Google Calendar with the
 *            event already filled in. The person presses save. No token, no
 *            app review, works while signed into any Google account.
 *
 *   APPLE  — and Outlook, and Thunderbird, and Google's own importer: a `.ics`
 *            file. On iPhone and Mac, opening one offers to add it directly.
 *
 * The one thing this cannot do is a *live subscription* that updates itself
 * when a campaign changes — that needs a URL something keeps serving, which
 * means a server endpoint (a Supabase Edge Function would do it). Until then
 * these are snapshots, and the UI says so rather than implying a sync.
 */
import type { Campaign, Episode, Placement } from "./types";
import { PLATFORMS } from "./types";

/* ------------------------------------------------------------------ */
/* iCalendar                                                          */
/* ------------------------------------------------------------------ */

/** ICS escaping: backslash first, or it would double-escape the others. */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** UTC basic format: 20260912T230000Z */
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * RFC 5545 says lines are at most 75 octets, continued with a leading space.
 * Calendar apps genuinely reject long unfolded lines, and a description with
 * the post's copy in it goes past 75 almost every time.
 */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let cur = "";
  let len = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    // 74 leaves room for the leading space on continuation lines.
    if (len + n > 74) {
      out.push(cur);
      cur = " " + ch;
      len = 1 + n;
    } else {
      cur += ch;
      len += n;
    }
  }
  out.push(cur);
  return out.join("\r\n");
}

export interface CalEvent {
  uid: string;
  start: Date;
  minutes: number;
  title: string;
  description?: string;
  url?: string;
}

export function toIcs(events: CalEvent[], calName = "La Mesa del Reino"): string {
  const now = stamp(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Mesa del Reino//Campanas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`,
  ];

  for (const e of events) {
    const end = new Date(e.start.getTime() + e.minutes * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.description ? [fold(`DESCRIPTION:${esc(e.description)}`)] : []),
      ...(e.url ? [fold(`URL:${esc(e.url)}`)] : []),
      // A reminder an hour before is the point of putting a post in a calendar.
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // CRLF is required by the spec, not a preference — some parsers fail on \n.
  return lines.join("\r\n") + "\r\n";
}

/** Hands the browser a .ics file. */
export function downloadIcs(ics: string, filename: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Google Calendar's prefilled-event URL. No API, no token. */
export function googleUrl(e: CalEvent): string {
  const end = new Date(e.start.getTime() + e.minutes * 60000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(end)}`,
  });
  if (e.description) p.set("details", e.description);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Turning our rows into events                                       */
/* ------------------------------------------------------------------ */

export function placementEvent(
  p: Placement,
  campaign?: Campaign,
  lang: "es" | "en" = "es",
): CalEvent | null {
  if (!p.run_at) return null;
  const start = new Date(p.run_at);
  if (Number.isNaN(start.getTime())) return null;

  const pf = PLATFORMS[p.platform];
  const kind =
    p.kind === "paid"
      ? lang === "en" ? "Ad" : "Anuncio"
      : lang === "en" ? "Post" : "Post";

  return {
    uid: `placement-${p.id}@lamesadelreino`,
    start,
    minutes: 30,
    title: `${pf.label} · ${kind}${campaign ? ` — ${campaign.name}` : ""}`,
    description: [p.copy, campaign?.name].filter(Boolean).join("\n\n"),
  };
}

export function episodeEvent(
  e: Episode,
  lang: "es" | "en" = "es",
): CalEvent | null {
  const start = new Date(e.publish_at);
  if (Number.isNaN(start.getTime())) return null;

  return {
    uid: `episode-${e.id}@lamesadelreino`,
    start,
    minutes: 60,
    title:
      lang === "en"
        ? `Episode ${e.number} — ${e.title}`
        : `Episodio ${e.number} — ${e.title}`,
    description: [e.guest ? `Invitado: ${e.guest}` : "", e.notes ?? ""]
      .filter(Boolean)
      .join("\n\n"),
    url: e.youtube_url ?? undefined,
  };
}
