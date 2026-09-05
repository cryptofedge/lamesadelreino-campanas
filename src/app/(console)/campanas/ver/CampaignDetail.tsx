"use client";

/**
 * One campaign, and the only screen where money leaves the building.
 *
 * The important design decision: the "Publicar" button is honest about which
 * tier each placement is on. Organic goes out by itself. Paid opens the ad
 * manager with a brief already written, because the API access to spend money
 * directly is an approval process, not a coding problem — see lib/launch.ts.
 * Pretending otherwise would mean a button that silently does nothing.
 */
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { useQuery } from "@/lib/useQuery";
import { handoff, ADAPTERS } from "@/lib/launch";
import {
  CAMPAIGN_STATUS,
  PLACEMENT_STATUS,
  PLATFORMS,
  GOALS,
  money,
  count,
  shortDate,
} from "@/lib/types";
import type { Campaign, Episode, Placement } from "@/lib/types";

type Row = Campaign & { placements: Placement[]; approved_by_name?: string | null };

export default function CampaignDetail() {
  const id = useSearchParams().get("id") ?? "";
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: campaign, loading, reload } = useQuery<Row>(
    (sb) => sb.from("campaigns").select("*").eq("id", id).single(),
    [id],
  );
  const { data: episode } = useQuery<Episode>(
    (sb) =>
      sb
        .from("episodes")
        .select("*")
        .eq("id", campaign?.episode_id ?? "")
        .single(),
    [campaign?.episode_id],
  );

  if (loading) {
    return (
      <p className="text-sm" style={{ color: "var(--faint)" }}>
        Cargando…
      </p>
    );
  }
  if (!campaign) {
    return (
      <div className="card p-8 text-center">
        <p className="font-bold mb-2">No encontramos esa campaña</p>
        <Link href="/campanas" style={{ color: "var(--brass)" }}>
          Volver a campañas
        </Link>
      </div>
    );
  }

  const placements = campaign.placements ?? [];
  const st = CAMPAIGN_STATUS[campaign.status];
  const committed = placements.reduce((s, p) => s + (p.budget ?? 0), 0);
  const spent = placements.reduce((s, p) => s + (p.spend ?? 0), 0);
  const reach = placements.reduce((s, p) => s + (p.reach ?? 0), 0);

  async function approve() {
    setBusy(true);
    await browserClient()
      .from("campaigns")
      .update({ status: "scheduled" })
      .eq("id", id);
    setBusy(false);
    reload();
  }

  async function queueOrganic(p: Placement) {
    setBusy(true);
    await browserClient()
      .from("placements")
      .update({ status: "queued" })
      .eq("id", p.id);
    setBusy(false);
    reload();
  }

  return (
    <div>
      <Link
        href="/campanas"
        className="text-sm inline-block mb-4"
        style={{ color: "var(--faint)" }}
      >
        ← Campañas
      </Link>

      <div className="flex items-start gap-3 mb-5 flex-wrap">
        <div className="mr-auto min-w-0">
          <span className="chip mb-2" style={{ color: st.color }}>
            {st.label}
          </span>
          <h1 className="text-2xl font-black tracking-tight leading-tight">
            {campaign.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {GOALS[campaign.goal].label} · {shortDate(campaign.starts_at)} →{" "}
            {shortDate(campaign.ends_at)}
            {episode ? ` · Ep. ${episode.number}` : ""}
          </p>
        </div>

        {campaign.status === "draft" && (
          <button
            onClick={() => void approve()}
            disabled={busy}
            className="px-4 py-2 rounded-full font-bold text-sm disabled:opacity-50"
            style={{ background: "var(--brass)", color: "#17130a" }}
          >
            Aprobar campaña
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Presupuesto" value={money(committed)} />
        <Stat label="Gastado" value={money(spent)} />
        <Stat label="Alcance" value={count(reach)} />
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--faint)" }}>
        Publicaciones y anuncios
      </h2>

      <div className="space-y-3">
        {placements.map((p) => {
          const pf = PLATFORMS[p.platform];
          const ps = PLACEMENT_STATUS[p.status];
          const paid = p.kind === "paid";
          const adapter = ADAPTERS[p.platform];
          const h = episode ? handoff(p, campaign, episode) : null;
          const isOpen = open === p.id;

          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: pf.color }}
                />
                <span className="font-bold">{pf.label}</span>
                <span
                  className="chip"
                  style={{
                    color: paid ? "var(--amber)" : "var(--muted)",
                    borderColor: "var(--line)",
                  }}
                >
                  {paid ? "Pagado" : "Orgánico"}
                </span>
                <span className="chip" style={{ color: ps.color }}>
                  {ps.label}
                </span>
                <span className="ml-auto text-sm nums" style={{ color: "var(--muted)" }}>
                  {paid ? money(p.budget) : shortDate(p.run_at)}
                </span>
              </div>

              <div className="flex gap-3 mb-3">
                {/* A post with no creative is a post somebody still has to
                    finish, so the gap is shown rather than left implicit. */}
                {p.creative_url ? (
                  <img
                    src={p.creative_url}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover shrink-0"
                    style={{ border: "1px solid var(--line)" }}
                    // A stored filename from a seeded row is not a real URL;
                    // hide the broken icon rather than showing it.
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="h-14 w-14 rounded-lg shrink-0 grid place-items-center text-[10px] text-center leading-tight"
                    style={{
                      border: "1px dashed var(--line)",
                      color: "var(--faint)",
                    }}
                  >
                    sin
                    <br />
                    imagen
                  </div>
                )}

                <p className="text-sm" style={{ color: "var(--text)" }}>
                  {p.copy || (
                    <span style={{ color: "var(--faint)" }}>Sin texto todavía</span>
                  )}
                </p>
              </div>

              {(p.reach !== null || p.clicks !== null) && (
                <div className="flex gap-4 text-xs mb-3 nums" style={{ color: "var(--muted)" }}>
                  <span>Alcance {count(p.reach)}</span>
                  <span>Clics {count(p.clicks)}</span>
                  {paid && <span>Gastado {money(p.spend)}</span>}
                </div>
              )}

              {/* The two tiers, stated plainly. */}
              {!paid && p.status === "draft" && (
                <button
                  onClick={() => void queueOrganic(p)}
                  disabled={busy}
                  className="text-sm px-3 py-1.5 rounded-full font-semibold disabled:opacity-50"
                  style={{ background: "var(--surface-3)", color: "var(--text)" }}
                >
                  Poner en cola
                </button>
              )}

              {paid && (
                <div>
                  <button
                    onClick={() => setOpen(isOpen ? null : p.id)}
                    className="text-sm px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: "var(--surface-3)", color: "var(--text)" }}
                  >
                    {isOpen ? "Ocultar" : "Preparar anuncio"}
                  </button>

                  {isOpen && h && (
                    <div
                      className="mt-3 p-3 rounded-xl"
                      style={{ background: "var(--ink)", border: "1px solid var(--line)" }}
                    >
                      {!adapter.apiReady && (
                        <p
                          className="text-xs mb-3 leading-relaxed"
                          style={{ color: "var(--amber)" }}
                        >
                          <strong>Todavía no se puede lanzar solo.</strong>{" "}
                          {adapter.blocker} Mientras tanto, aquí está todo listo
                          para pegarlo en un minuto.
                        </p>
                      )}

                      <pre
                        className="text-[11px] whitespace-pre-wrap mb-3 leading-relaxed"
                        style={{ color: "var(--muted)" }}
                      >
                        {h.brief}
                      </pre>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => void navigator.clipboard?.writeText(h.brief)}
                          className="text-xs px-3 py-1.5 rounded-full font-semibold"
                          style={{ background: "var(--surface-3)", color: "var(--text)" }}
                        >
                          Copiar
                        </button>
                        <a
                          href={h.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-full font-semibold"
                          style={{ background: "var(--brass)", color: "#17130a" }}
                        >
                          Abrir {pf.label} Ads ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
