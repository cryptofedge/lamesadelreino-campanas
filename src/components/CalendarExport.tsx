"use client";

/**
 * "Put this in my calendar."
 *
 * Two buttons, because the two platforms want different things and neither
 * needs an account here: Google takes a prefilled URL, everything else
 * (Apple, Outlook, Thunderbird) takes a .ics file. See lib/calendar.ts for why
 * there is no OAuth in sight.
 */
import { toIcs, downloadIcs, googleUrl } from "@/lib/calendar";
import type { CalEvent } from "@/lib/calendar";
import { useLang } from "@/lib/i18n";

export function AddOne({ event }: { event: CalEvent }) {
  const { t } = useLang();
  return (
    <div className="flex gap-1.5 shrink-0">
      <a
        href={googleUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
        style={{ background: "var(--surface-3)", color: "var(--text)" }}
        title={t("Añadir a Google Calendar")}
      >
        Google
      </a>
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          downloadIcs(toIcs([event]), event.title.slice(0, 40));
        }}
        className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
        style={{ background: "var(--surface-3)", color: "var(--text)" }}
        title={t("Descargar para Apple u Outlook")}
      >
        Apple
      </button>
    </div>
  );
}

export function AddAll({
  events,
  label,
  filename,
}: {
  events: CalEvent[];
  label: string;
  filename: string;
}) {
  const { t } = useLang();
  if (events.length === 0) return null;

  return (
    <button
      onClick={() => downloadIcs(toIcs(events), filename)}
      className="px-4 py-2 rounded-full font-bold text-sm"
      style={{ background: "var(--brass)", color: "#17130a" }}
      title={t("Se abre en Apple Calendar, Google o cualquier otro.")}
    >
      {label}
    </button>
  );
}
