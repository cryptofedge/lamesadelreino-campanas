"use client";

/**
 * Everything going out, in date order, across every platform.
 *
 * This is the view that replaces "which tab was that scheduled in?" — the one
 * question a scattered setup can never answer quickly.
 */
import Link from "next/link";
import { useQuery } from "@/lib/useQuery";
import {
  PLATFORMS,
  PLACEMENT_STATUS,
  shortDate,
  daysUntil,
} from "@/lib/types";
import type { Campaign, Placement } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { AddOne, AddAll } from "@/components/CalendarExport";
import { placementEvent, episodeEvent } from "@/lib/calendar";
import type { CalEvent } from "@/lib/calendar";
import type { Episode } from "@/lib/types";

export default function CalendarPage() {
  const { t, lang } = useLang();
  const { data: placements, loading } = useQuery<Placement[]>((sb) =>
    sb.from("placements").select("*").order("run_at", { ascending: true }),
  );
  const { data: campaigns } = useQuery<Campaign[]>((sb) =>
    sb.from("campaigns").select("*"),
  );
  const { data: episodes } = useQuery<Episode[]>((sb) =>
    sb.from("episodes").select("*"),
  );

  const byId = new Map((campaigns ?? []).map((c) => [c.id, c]));

  // Group by calendar day so the page reads like a week, not a list.
  const groups = new Map<string, Placement[]>();
  for (const p of placements ?? []) {
    const key = (p.run_at ?? "").slice(0, 10) || "sin-fecha";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // Everything in one file: the episodes themselves plus every post and ad
  // around them. Exporting only the posts would leave the show missing from
  // the calendar it is meant to organise.
  const allEvents: CalEvent[] = [
    ...(episodes ?? []).map((e) => episodeEvent(e, lang)),
    ...(placements ?? []).map((p) => placementEvent(p, byId.get(p.campaign_id), lang)),
  ].filter((e): e is CalEvent => e !== null);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-2xl font-black tracking-tight mr-auto">
          {t("Calendario")}
        </h1>
        <AddAll
          events={allEvents}
          label={t("Añadir todo al calendario")}
          filename="la-mesa-del-reino"
        />
      </div>

      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        {t("Funciona con Google, Apple y Outlook. Es una copia del momento: si cambias algo aquí, vuelve a añadirlo.")}
      </p>

      {loading && (
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          {t("Cargando…")}
        </p>
      )}

      {!loading && groups.size === 0 && (
        <div className="card p-8 text-center">
          <p className="font-bold mb-1">{t("Nada programado")}</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {t("Crea una campaña y las publicaciones aparecerán aquí.")}
          </p>
        </div>
      )}

      <div className="space-y-5">
        {[...groups.entries()].map(([day, items]) => {
          const days = day === "sin-fecha" ? null : daysUntil(day);
          return (
            <div key={day}>
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="font-bold">
                  {day === "sin-fecha" ? t("Sin fecha") : shortDate(day)}
                </h2>
                {days !== null && (
                  <span
                    className="text-xs"
                    style={{
                      color:
                        days < 0
                          ? "var(--faint)"
                          : days <= 1
                            ? "var(--amber)"
                            : "var(--muted)",
                    }}
                  >
                    {days < 0
                      ? t("ya pasó")
                      : days === 0
                        ? t("hoy")
                        : days === 1
                          ? t("mañana")
                          : lang === "en" ? `in ${days} days` : `en ${days} días`}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {items.map((p) => {
                  const pf = PLATFORMS[p.platform];
                  const ps = PLACEMENT_STATUS[p.status];
                  const c = byId.get(p.campaign_id);
                  const ev = placementEvent(p, c, lang);
                  return (
                    <Link
                      key={p.id}
                      href={`/campanas/ver?id=${p.campaign_id}`}
                      className="card p-3 flex items-center gap-3 hover:brightness-110 transition"
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ background: pf.color }}
                      />
                      <div className="min-w-0 mr-auto">
                        <div className="text-sm font-semibold truncate">
                          {p.copy || pf.label}
                        </div>
                        <div className="text-xs truncate" style={{ color: "var(--faint)" }}>
                          {pf.label} · {p.kind === "paid" ? t("Anuncio") : t("Post")}
                          {c ? ` · ${c.name}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold" style={{ color: ps.color }}>
                          {t(ps.label)}
                        </div>
                      </div>

                      {ev && <AddOne event={ev} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
