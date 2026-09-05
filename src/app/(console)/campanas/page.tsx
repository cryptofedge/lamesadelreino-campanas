"use client";

/**
 * The campaign board — the screen this whole tool exists for.
 *
 * One row per campaign, one campaign per episode. The platform chips are the
 * important part: they are the answer to "where is this week actually going
 * out", which today lives in Richard's head and five browser tabs.
 */
import Link from "next/link";
import { useQuery } from "@/lib/useQuery";
import {
  CAMPAIGN_STATUS,
  PLATFORMS,
  PLACEMENT_STATUS,
  GOALS,
  money,
  count,
  shortDate,
  daysUntil,
} from "@/lib/types";
import type { Campaign, Episode, Placement } from "@/lib/types";
import { useLang } from "@/lib/i18n";

type Row = Campaign & { placements: Placement[]; approved_by_name?: string | null };

export default function CampaignsPage() {
  const { t, lang } = useLang();
  const { data: campaigns, loading } = useQuery<Row[]>((sb) =>
    sb.from("campaigns").select("*").order("starts_at", { ascending: false }),
  );
  const { data: episodes } = useQuery<Episode[]>((sb) =>
    sb.from("episodes").select("*"),
  );

  const byId = new Map((episodes ?? []).map((e) => [e.id, e]));

  // Money already committed this month, so the number that matters is on
  // screen without anyone opening a spreadsheet.
  const live = (campaigns ?? []).filter((c) => c.status === "active");
  const spent = (campaigns ?? [])
    .flatMap((c) => c.placements ?? [])
    .reduce((s, p) => s + (p.spend ?? 0), 0);
  const reach = (campaigns ?? [])
    .flatMap((c) => c.placements ?? [])
    .reduce((s, p) => s + (p.reach ?? 0), 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-black tracking-tight mr-auto">{t("Campañas")}</h1>
        <Link
          href="/campanas/nueva"
          className="px-4 py-2 rounded-full font-bold text-sm"
          style={{ background: "var(--brass)", color: "#17130a" }}
        >
          {t("+ Nueva campaña")}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label={t("Activas")} value={String(live.length)} />
        <Stat label={t("Gastado")} value={money(spent)} />
        <Stat label={t("Alcance")} value={count(reach)} />
      </div>

      {loading && (
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          {t("Cargando…")}
        </p>
      )}

      {!loading && (campaigns ?? []).length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-bold mb-1">{t("Todavía no hay campañas")}</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {t("Crea la primera para el próximo episodio.")}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(campaigns ?? []).map((c) => {
          const ep = byId.get(c.episode_id);
          const st = CAMPAIGN_STATUS[c.status];
          const days = daysUntil(ep?.publish_at);
          const placements = c.placements ?? [];
          const committed = placements.reduce((s, p) => s + (p.budget ?? 0), 0);

          return (
            <Link
              key={c.id}
              // A query param, not /campanas/<id>: a static export has no server
              // to resolve an unknown dynamic segment, and campaign ids do not
              // exist at build time.
              href={`/campanas/ver?id=${c.id}`}
              className="card p-4 block hover:brightness-110 transition"
            >
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 mr-auto">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="chip"
                      style={{ color: st.color, borderColor: "var(--line)" }}
                    >
                      {t(st.label)}
                    </span>
                    <span className="text-xs" style={{ color: "var(--faint)" }}>
                      {t(GOALS[c.goal].label)}
                    </span>
                  </div>

                  <div className="font-bold leading-tight">{c.name}</div>

                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--muted)" }}
                  >
                    {ep ? (
                      <>
                        {t("Sale")} {shortDate(ep.publish_at)}
                        {days !== null && days >= 0 && (
                          <>
                            {" · "}
                            <span style={{ color: days <= 2 ? "var(--amber)" : "inherit" }}>
                              {days === 0 ? t("hoy") : days === 1 ? t("mañana") : lang === "en" ? `in ${days} days` : `en ${days} días`}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      t("Sin episodio")
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold nums">{money(committed || c.budget_total)}</div>
                  <div className="text-[11px]" style={{ color: "var(--faint)" }}>
                    {t("presupuesto")}
                  </div>
                </div>
              </div>

              {/* Where this week is going out. The single most useful line. */}
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {placements.length === 0 && (
                  <span className="text-xs" style={{ color: "var(--faint)" }}>
                    {t("Sin publicaciones todavía")}
                  </span>
                )}
                {placements.map((p) => {
                  const pf = PLATFORMS[p.platform];
                  const ps = PLACEMENT_STATUS[p.status];
                  return (
                    <span
                      key={p.id}
                      className="chip nums"
                      style={{
                        borderColor: "var(--line)",
                        color: "var(--text)",
                        background: "var(--surface-2)",
                      }}
                      title={`${pf.label} · ${p.kind === "paid" ? "pagado" : "orgánico"} · ${ps.label}`}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: pf.color }}
                      />
                      {pf.short}
                      {p.kind === "paid" && p.budget ? ` ${money(p.budget)}` : ""}
                      <span style={{ color: ps.color }}>•</span>
                    </span>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-xl font-black nums leading-tight">{value}</div>
      <div className="text-[11px]" style={{ color: "var(--faint)" }}>
        {label}
      </div>
    </div>
  );
}
