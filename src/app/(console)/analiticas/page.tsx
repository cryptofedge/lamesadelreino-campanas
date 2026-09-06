"use client";

/**
 * How the campaigns actually performed.
 *
 * Deliberately no money anywhere on this page — not spend, not budget, not cost
 * per anything. It reports reach, clicks and response rate, which is what tells
 * you whether an episode landed.
 *
 * Reach and response rate get separate charts rather than one chart with two
 * y-axes: they are different scales, and a dual axis lets the reader believe
 * two lines crossing means something.
 */
import Link from "next/link";
import { useQuery } from "@/lib/useQuery";
import { useLang } from "@/lib/i18n";
import { BarChart, ColumnChart, TableView } from "@/components/Charts";
import type { Row as ChartRow } from "@/components/Charts";
import { PLATFORMS, CAMPAIGN_STATUS, count, shortDate } from "@/lib/types";
import type { Campaign, Placement, Platform } from "@/lib/types";

type Row = Campaign & { placements: Placement[] };

/** Clicks over reach. Null when nothing has been reported — a campaign that has
 *  not run is not a campaign that performed at 0%. */
function rate(reach: number, clicks: number): number | null {
  if (!reach) return null;
  return (clicks / reach) * 100;
}

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

export default function AnalyticsPage() {
  const { t } = useLang();

  const { data: campaigns, loading } = useQuery<Row[]>((sb) =>
    sb.from("campaigns").select("*").order("starts_at", { ascending: true }),
  );

  const all = campaigns ?? [];
  const placements = all.flatMap((c) => c.placements ?? []);
  const reported = placements.filter((p) => p.reach !== null);

  const reach = placements.reduce((s, p) => s + (p.reach ?? 0), 0);
  const clicks = placements.reduce((s, p) => s + (p.clicks ?? 0), 0);

  const byPlatform = (Object.keys(PLATFORMS) as Platform[])
    .map((pl) => {
      const rows = placements.filter((p) => p.platform === pl);
      const r = rows.reduce((s, p) => s + (p.reach ?? 0), 0);
      const c = rows.reduce((s, p) => s + (p.clicks ?? 0), 0);
      return { platform: pl, posts: rows.length, reach: r, clicks: c, rate: rate(r, c) };
    })
    .filter((x) => x.reach > 0)
    .sort((a, b) => b.reach - a.reach);

  const best = [...byPlatform].filter((x) => x.rate !== null).sort((a, b) => b.rate! - a.rate!)[0];
  const widest = byPlatform[0];

  // Chronological, so the columns read as time rather than as a ranking.
  const overTime: ChartRow[] = all
    .map((c) => {
      const r = (c.placements ?? []).reduce((s, p) => s + (p.reach ?? 0), 0);
      return {
        key: c.id,
        label: c.name.split("—")[0].trim(),
        value: r,
        note: `${c.name} · ${shortDate(c.starts_at)}`,
      };
    })
    .filter((r) => r.value > 0);

  const reachRows: ChartRow[] = byPlatform.map((x) => ({
    key: x.platform,
    label: PLATFORMS[x.platform].label,
    dot: PLATFORMS[x.platform].color,
    value: x.reach,
    note: `${count(x.clicks)} ${t("clics")} · ${pct(x.rate)}`,
  }));

  const rateRows: ChartRow[] = [...byPlatform]
    .filter((x) => x.rate !== null)
    .sort((a, b) => b.rate! - a.rate!)
    .map((x) => ({
      key: x.platform,
      label: PLATFORMS[x.platform].label,
      dot: PLATFORMS[x.platform].color,
      value: x.rate!,
      note: `${count(x.reach)} ${t("de alcance")}`,
    }));

  return (
    <div className="max-w-3xl">
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
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label={t("Alcance total")} value={count(reach)} />
            <Stat label={t("Clics")} value={count(clicks)} />
            <Stat label={t("Respuesta")} value={pct(rate(reach, clicks))} />
          </div>

          {best && widest && (
            <div className="card p-4 mb-5">
              <p className="text-sm leading-relaxed">
                {t("Lo que más responde")}:{" "}
                <strong style={{ color: "var(--brass)" }}>
                  {PLATFORMS[best.platform].label}
                </strong>{" "}
                ({pct(best.rate)}). {t("Lo que más gente ve")}:{" "}
                <strong style={{ color: "var(--brass)" }}>
                  {PLATFORMS[widest.platform].label}
                </strong>{" "}
                ({count(widest.reach)}).
              </p>
            </div>
          )}

          <Panel title={t("Alcance por plataforma")}>
            <BarChart rows={reachRows} emptyLabel={t("Todavía no hay resultados")} />
            <TableView
              label={t("Ver como tabla")}
              headers={[t("Plataforma"), t("Alcance"), t("Clics"), t("Respuesta")]}
              rows={byPlatform.map((x) => [
                PLATFORMS[x.platform].label,
                count(x.reach),
                count(x.clicks),
                pct(x.rate),
              ])}
            />
          </Panel>

          <Panel title={t("Respuesta por plataforma")}>
            <BarChart
              rows={rateRows}
              format={(n) => `${n.toFixed(1)}%`}
              emptyLabel={t("Todavía no hay resultados")}
            />
            <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
              {t("Cuánta de la gente que lo vio hizo clic. Es la señal de si el mensaje pegó.")}
            </p>
          </Panel>

          <Panel title={t("Alcance por campaña")}>
            <ColumnChart rows={overTime} emptyLabel={t("Todavía no hay resultados")} />
            <TableView
              label={t("Ver como tabla")}
              headers={[t("Campaña"), t("Alcance"), t("Clics"), t("Respuesta")]}
              rows={all.map((c) => {
                const rows = c.placements ?? [];
                const r = rows.reduce((s, p) => s + (p.reach ?? 0), 0);
                const k = rows.reduce((s, p) => s + (p.clicks ?? 0), 0);
                return [c.name, count(r), count(k), pct(rate(r, k))];
              })}
            />
          </Panel>

          <h2
            className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--faint)" }}
          >
            {t("Por campaña")}
          </h2>

          <div className="space-y-2">
            {[...all].reverse().map((c) => {
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 mb-4">
      <h2
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: "var(--faint)" }}
      >
        {title}
      </h2>
      {children}
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
