"use client";

/**
 * Reporting, laid out the way Meta, Google Ads and TikTok lay it out.
 *
 * That shape is deliberate rather than decorative. All three put a performance
 * graph on top, a level switcher under it — campaigns, then ad sets, then ads —
 * and a dense sortable table with a pinned totals row. Richard will open the
 * real Ads Manager sooner or later; if this screen has taught him where to look,
 * that one is already familiar.
 *
 * Our three levels map onto theirs exactly:
 *   Campañas      -> Campaigns   (one per episode)
 *   Plataformas   -> Ad sets     (where the money and audience are decided)
 *   Publicaciones -> Ads         (the individual post or ad)
 *
 * Still no money anywhere: no spend, no budget, no cost per result.
 */
import { useState } from "react";
import { useQuery } from "@/lib/useQuery";
import { useLang } from "@/lib/i18n";
import AdTable from "@/components/AdTable";
import type { Col, TableRow } from "@/components/AdTable";
import TimeSeries from "@/components/TimeSeries";
import type { Point } from "@/components/TimeSeries";
import {
  PLATFORMS,
  CAMPAIGN_STATUS,
  PLACEMENT_STATUS,
  count,
  shortDate,
} from "@/lib/types";
import type { Campaign, Placement, Platform } from "@/lib/types";

type Row = Campaign & { placements: Placement[] };
type Level = "campanas" | "plataformas" | "publicaciones";
type Metric = "reach" | "clicks" | "ctr";

const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(2)}%`);
const ctr = (reach: number, clicks: number) => (reach ? (clicks / reach) * 100 : null);

export default function AnalyticsPage() {
  const { t } = useLang();
  const [level, setLevel] = useState<Level>("campanas");
  const [metric, setMetric] = useState<Metric>("reach");

  const { data: campaigns, loading } = useQuery<Row[]>((sb) =>
    sb.from("campaigns").select("*").order("starts_at", { ascending: true }),
  );

  const all = campaigns ?? [];
  const placements = all.flatMap((c) => c.placements ?? []);
  const reported = placements.filter((p) => p.reach !== null);

  const reach = placements.reduce((s, p) => s + (p.reach ?? 0), 0);
  const clicks = placements.reduce((s, p) => s + (p.clicks ?? 0), 0);

  /* ---- The graph. One metric at a time, by day. ---- */
  const byDay = new Map<string, { reach: number; clicks: number }>();
  for (const p of reported) {
    const d = (p.run_at ?? "").slice(0, 10);
    if (!d) continue;
    const cur = byDay.get(d) ?? { reach: 0, clicks: 0 };
    cur.reach += p.reach ?? 0;
    cur.clicks += p.clicks ?? 0;
    byDay.set(d, cur);
  }
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const points: Point[] = days.map(([d, v]) => ({
    label: shortDate(d).replace(/ de /, " "),
    value:
      metric === "reach" ? v.reach : metric === "clicks" ? v.clicks : (ctr(v.reach, v.clicks) ?? 0),
  }));

  const fmt =
    metric === "ctr" ? (n: number) => `${n.toFixed(1)}%` : (n: number) => count(n);

  /* ---- The table, one shape per level. ---- */
  const cols: Col[] = [
    { key: "name", label: t("Nombre"), render: (r) => r.name },
    {
      key: "reach",
      label: t("Alcance"),
      numeric: true,
      render: (r) => count(r.metrics.reach),
    },
    {
      key: "clicks",
      label: t("Clics"),
      numeric: true,
      render: (r) => count(r.metrics.clicks),
    },
    {
      key: "ctr",
      label: "CTR",
      numeric: true,
      render: (r) => pct(r.metrics.ctr as number | null),
    },
    {
      key: "posts",
      label: t("Piezas"),
      numeric: true,
      render: (r) => String(r.metrics.posts ?? 0),
    },
  ];

  let rows: TableRow[] = [];

  if (level === "campanas") {
    rows = all.map((c) => {
      const ps = c.placements ?? [];
      const r = ps.reduce((s, p) => s + (p.reach ?? 0), 0);
      const k = ps.reduce((s, p) => s + (p.clicks ?? 0), 0);
      const st = CAMPAIGN_STATUS[c.status];
      return {
        id: c.id,
        name: c.name,
        statusLabel: t(st.label),
        statusColor: st.color,
        sub: shortDate(c.starts_at),
        metrics: { reach: r, clicks: k, ctr: ctr(r, k), posts: ps.length },
        href: `/campanas/ver?id=${c.id}`,
      };
    });
  } else if (level === "plataformas") {
    rows = (Object.keys(PLATFORMS) as Platform[])
      .map((pl) => {
        const ps = placements.filter((p) => p.platform === pl);
        const r = ps.reduce((s, p) => s + (p.reach ?? 0), 0);
        const k = ps.reduce((s, p) => s + (p.clicks ?? 0), 0);
        const live = ps.filter((p) => p.status === "live" || p.status === "posted").length;
        return {
          id: pl,
          name: PLATFORMS[pl].label,
          dot: PLATFORMS[pl].color,
          statusLabel: `${live} ${t("al aire")}`,
          statusColor: "var(--muted)",
          metrics: { reach: r, clicks: k, ctr: ctr(r, k), posts: ps.length },
        } as TableRow;
      })
      .filter((r) => (r.metrics.posts ?? 0) > 0);
  } else {
    rows = placements.map((p) => {
      const st = PLACEMENT_STATUS[p.status];
      const c = all.find((x) => x.id === p.campaign_id);
      return {
        id: p.id,
        name: p.copy?.slice(0, 60) || PLATFORMS[p.platform].label,
        dot: PLATFORMS[p.platform].color,
        statusLabel: t(st.label),
        statusColor: st.color,
        sub: `${PLATFORMS[p.platform].label}${c ? ` · ${c.name.split("—")[0].trim()}` : ""}`,
        metrics: {
          reach: p.reach,
          clicks: p.clicks,
          ctr: ctr(p.reach ?? 0, p.clicks ?? 0),
          posts: 1,
        },
        href: c ? `/campanas/ver?id=${c.id}` : undefined,
      } as TableRow;
    });
  }

  const totals: TableRow = {
    id: "totals",
    name: "",
    statusLabel: "",
    statusColor: "var(--muted)",
    metrics: { reach, clicks, ctr: ctr(reach, clicks), posts: rows.length },
  };

  const levels: { key: Level; label: string }[] = [
    { key: "campanas", label: t("Campañas") },
    { key: "plataformas", label: t("Plataformas") },
    { key: "publicaciones", label: t("Publicaciones") },
  ];

  const metrics: { key: Metric; label: string; value: string }[] = [
    { key: "reach", label: t("Alcance"), value: count(reach) },
    { key: "clicks", label: t("Clics"), value: count(clicks) },
    { key: "ctr", label: "CTR", value: pct(ctr(reach, clicks)) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight mb-1">{t("Analíticas")}</h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        {t("Igual que se ve en Meta, Google Ads y TikTok — para que sea el mismo idioma cuando abras los de verdad.")}
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
          {/* The metric tabs double as the KPI row — pressing one retargets the
              graph, which is how Meta's chart header behaves. */}
          <div className="card p-4 mb-4">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {metrics.map((m) => {
                const on = metric === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className="text-left px-3 py-2 rounded-xl transition-colors"
                    style={{
                      background: on ? "var(--surface-2)" : "transparent",
                      borderBottom: `2px solid ${on ? "var(--brass)" : "transparent"}`,
                    }}
                    aria-pressed={on}
                  >
                    <div className="text-lg font-black nums leading-tight">{m.value}</div>
                    <div
                      className="text-[11px]"
                      style={{ color: on ? "var(--brass)" : "var(--faint)" }}
                    >
                      {m.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <TimeSeries
              points={points}
              format={fmt}
              emptyLabel={t("Todavía no hay suficientes días para la gráfica.")}
            />
          </div>

          {/* Level switcher, in the ad managers' order. */}
          <div className="card p-0 overflow-hidden">
            <div
              className="flex gap-1 px-4 pt-3"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              {levels.map((l) => {
                const on = level === l.key;
                return (
                  <button
                    key={l.key}
                    onClick={() => setLevel(l.key)}
                    className="text-sm font-semibold px-3 pb-2.5 -mb-px"
                    style={{
                      color: on ? "var(--brass)" : "var(--muted)",
                      borderBottom: `2px solid ${on ? "var(--brass)" : "transparent"}`,
                    }}
                    aria-pressed={on}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              <AdTable
                cols={cols}
                rows={rows}
                totals={totals}
                totalsLabel={`${t("Resultados de")} ${rows.length}`}
                emptyLabel={t("Todavía no hay resultados")}
              />
            </div>
          </div>

          <p className="text-xs mt-3" style={{ color: "var(--faint)" }}>
            {t("CTR es cuánta de la gente que lo vio hizo clic. Toca cualquier columna para ordenar.")}
          </p>
        </>
      )}
    </div>
  );
}
