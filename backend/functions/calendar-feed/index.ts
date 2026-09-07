/**
 * A live calendar subscription.
 *
 * The console can already hand someone a .ics file, but that is a snapshot —
 * change a campaign and the calendar keeps the old version. A *subscription*
 * needs a URL that something keeps serving, which is what this is.
 *
 * Subscribe once in Google Calendar or Apple Calendar and the week updates
 * itself from then on.
 *
 * Deploy:
 *   supabase functions deploy calendar-feed --no-verify-jwt
 *
 * `--no-verify-jwt` is required and is the one thing to understand here:
 * calendar clients cannot send an Authorization header, so the URL itself is
 * the credential. That is why it carries a token checked below, why the token
 * must be long and random, and why this returns only titles and times —
 * never a budget, a token, or anything about the accounts.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ok = (body: string, type = "text/calendar; charset=utf-8") =>
  new Response(body, {
    headers: {
      "content-type": type,
      // Calendar clients poll; let them, but not more than hourly.
      "cache-control": "public, max-age=3600",
    },
  });

/** ICS escaping — backslash first or it double-escapes everything after. */
const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 caps a line at 75 octets; longer lines get rejected outright. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let len = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
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

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const expected = Deno.env.get("FEED_TOKEN") ?? "";

  // Compare in constant time. A plain !== leaks the token a character at a
  // time to anyone willing to measure, and this URL is the only thing
  // standing between the internet and the show's schedule.
  const enc = new TextEncoder();
  const a = enc.encode(token);
  const b = enc.encode(expected);
  let same = a.length === b.length && b.length > 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) same = false;
  }
  if (!same) return new Response("Not found", { status: 404 });

  // Service role: this function is the only thing that reads the tables
  // without a signed-in user, and it never returns rows verbatim.
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: episodes } = await sb
    .from("episodes")
    .select("id, number, title, guest, publish_at, youtube_url, notes");

  const { data: placements } = await sb
    .from("placements")
    .select("id, platform, kind, run_at, copy, campaign_id");

  const { data: campaigns } = await sb.from("campaigns").select("id, name");
  const byId = new Map((campaigns ?? []).map((c) => [c.id, c.name as string]));

  const now = stamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Mesa del Reino//Campanas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:La Mesa del Reino",
    // Tells clients how often to re-poll. Without it some check daily.
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  const event = (
    uid: string,
    start: Date,
    minutes: number,
    title: string,
    description?: string,
    link?: string,
  ) => {
    const end = new Date(start.getTime() + minutes * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${esc(title)}`),
      ...(description ? [fold(`DESCRIPTION:${esc(description)}`)] : []),
      ...(link ? [fold(`URL:${esc(link)}`)] : []),
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      "END:VALARM",
      "END:VEVENT",
    );
  };

  for (const e of episodes ?? []) {
    const d = new Date(e.publish_at as string);
    if (isNaN(d.getTime())) continue;
    event(
      `episode-${e.id}@lamesadelreino`,
      d,
      60,
      `Episodio ${e.number} — ${e.title}`,
      [e.guest ? `Invitado: ${e.guest}` : "", e.notes ?? ""].filter(Boolean).join("\n\n"),
      (e.youtube_url as string) ?? undefined,
    );
  }

  for (const p of placements ?? []) {
    if (!p.run_at) continue;
    const d = new Date(p.run_at as string);
    if (isNaN(d.getTime())) continue;
    const kind = p.kind === "paid" ? "Anuncio" : "Post";
    const name = byId.get(p.campaign_id as string);
    event(
      `placement-${p.id}@lamesadelreino`,
      d,
      30,
      `${p.platform} · ${kind}${name ? ` — ${name}` : ""}`,
      (p.copy as string) || undefined,
    );
  }

  lines.push("END:VCALENDAR");

  // CRLF is required by the spec, not a preference — some parsers reject \n.
  return ok(lines.join("\r\n") + "\r\n");
});
