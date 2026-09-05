"use client";

/**
 * How the campaigns actually performed.
 *
 * Deliberately no money anywhere on this page — not spend, not budget, not cost
 * per anything. It reports reach, clicks and engagement rate, which is what
 * tells you whether an episode landed. What it cost to get there is a separate
 * conversation and not one this screen has.
 *
 * Engagement rate is shown per platform rather than only as a total, because a
 * single blended number hides the thing worth knowing: the same clip usually
 * performs very differently on TikTok than on Facebook, and that is what
 * decides where next week goes.
 */
import Link from "next/link";
import { useQuery } from "@/lib/useQuery";
import { useLang } from "@/lib/i18n";
import {
  PLATFORMS,
  CAMPAIGN_STATUS,
  count,
  shortDate,
} from "@/lib/types";
import type { Campaign, Placement, Platform } from "@/lib/types";

type Row = Campaign & { placements: Placement[] };

/** Clicks over reach. Null when nothing has been reported yet — a campaign that
 *  has not run is not a campaign that performed at 0%. */
function rate(reach: number, clicks: number): number | null {
  if (!reach) return null;
  return (clicks / reach) * 100;
}

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

export default function AnalyticsPage() {
  const { t } = useLang();

  const { data: campaigns, loading } = useQuery<Row[]>((sb) =>
    sb.from("campaigns").select("*").order("starts_at", { ascending: false }),
  );

  const all = campaigns ?? [];
  const placements = all.flatMap((c) => c.placements ?? []);
  const reported = placements.filter((p) => p.reach !== null);

  const reach = placements.reduce((s, p) => s + (p.reach ?? 0), 0);
  const clicks = placements.reduce((s, p) => s + (p.clicks ?? 0), 0);

  // Per platform, so the comparison that matters is on screen.
  const byPlatform = (Object.keys(PLATFORMS) as Platform[])
    .map((pl) => {
      const rows = placements.filter((p) => p.platform === pl);
      const r = rows.reduce((s, p) => s + (p.reach ?? 0), 0);
      const c = rows.reduce((s, p) => s + (p.clicks ?? 0), 0);
      return { platform: pl, posts: rows.length, reach: r, clicks: c, rate: rate(r, c) };
    })
    .filter((x) => x.posts > 0)
    .sort((a, b) => b.reach - a.reach);

  const best = byPlatform.filter((x) => x.rate !== null).sort((a, b) => b.rate! - a.rate!)[0];
  const widest = byPlatform[0];

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-1">{t("Analíticas")}</h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        {t("Cómo le fue a cada campaña. Alcance, clics y qué tan bien respondió la gente.")}
      </p>

      {loading && (
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          {t("Cargando…")}
        </p>
      )}

      {!loading && reported.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-bold mb-1">{t("Todavía no hay resultados")}</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {t("Los números aparecen cuando las plataformas empiezan a reportar.")}
          </p>
        </div>
      )}

      {reported.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat label={t("Alcance total")} value={count(reach)} />
            <Stat label={t("Clics")} value={count(clicks)} />
            <Stat label={t("Respuesta")} value={pct(rate(reach, clicks))} />
          </div>

          {/* One plain-language sentence, because a table of numbers does not
              tell anybody what to do differently next week. */}
          {best && widest && (
            <div className="card p-4 mb-6">
              <p className="text-sm leading-relaxed">
                {t("Lo que más responde")}:{" "}
                <strong style={{ color: "var(--brass)" }}>
                  {PLATFORMS[best.platform].label}
                </strong>{" "}
                ({pct(best.rate)}).{" "}
                {t("Lo que más gente ve")}:{" "}
                <strong style={{ color: "var(--brass)" }}>
                  {PLATFORMS[widest.platform].label}
                </strong>{" "}
                ({count(widest.reach)}).
              </p>
            </div>
          )}

          <h2
            className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--faint)" }}
          >
            {t("Por plataforma")}
          </h2>

          <div className="space-y-2 mb-7">
            {byPlatform.map((x) => {
              const pf = PLATFORMS[x.platform];
              // Bars are relative to the widest reach, so the comparison is
              // visual rather than arithmetic.
              const w = widest.reach ? (x.reach / widest.reach) * 100 : 0;
              return (
                <div key={x.platform} className="card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ background: pf.color }}
                    />
                    <span className="font-bold text-sm mr-auto">{pf.label}</span>
                    <span className="text-xs nums" style={{ color: "var(--muted)" }}>
                      {count(x.reach)} · {count(x.clicks)} {t("clics")} · {pct(x.rate)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--surface-3)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${w}%`, background: pf.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <h2
            className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--faint)" }}
          >
            {t("Por campaña")}
          </h2>

          <div className="space-y-2">
            {all.map((c) => {
              const rows = c.placements ?? [];
              const r = rows.reduce((s, p) => s + (p.reach ?? 0), 0);
              const k = rows.reduce((s, p) => s + (p.clicks ?? 0), 0);
              const st = CAMPAIGN_STATUS[c.status];

              return (
                <Link
                  key={c.id}
                  href={`/campanas/ver?id=${c.id}`}
                  className="card p-3 flex items-center gap-3 hover:brightness-110 transition"
                >
                  <div className="min-w-0 mr-auto">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-xs" style={{ color: "var(--faint)" }}>
                      <span style={{ color: st.color }}>{t(st.label)}</span> ·{" "}
                      {shortDate(c.starts_at)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 nums">
                    <div className="text-sm font-bold">{count(r)}</div>
                    <div className="text-[11px]" style={{ color: "var(--faint)" }}>
                      {count(k)} {t("clics")} · {pct(rate(r, k))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
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
