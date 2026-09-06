"use client";

/**
 * Build a week's campaign.
 *
 * One screen, not a wizard. This is a job Richard does every Sunday — a
 * five-step flow would add four clicks to a task he already knows by heart.
 * Defaults are chosen so that picking an episode and pressing the button
 * produces a sane campaign; everything else is an override.
 */
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { useQuery } from "@/lib/useQuery";
import { PLATFORMS, GOALS, money, shortDate } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import type { Episode, Goal, Platform, PlacementKind } from "@/lib/types";

/** What a normal week looks like, so the form starts already filled in. */
const DEFAULT_MIX: Record<Platform, PlacementKind | null> = {
  youtube: "paid",
  instagram: "paid",
  facebook: "organic",
  tiktok: "organic",
  x: null,
};

/** Copy the bot would draft. Real generation happens in WhatsApp via El Mini;
 *  this is the starting point so nobody faces an empty box. */
function suggest(p: Platform, ep: Episode | undefined, goal: Goal): string {
  if (!ep) return "";
  const t = ep.title;
  switch (p) {
    case "youtube":
      return `${t} — episodio ${ep.number}, ya disponible.`;
    case "instagram":
      return goal === "attendance"
        ? `Te esperamos. ${t}. 🎙️`
        : `${t} 🎙️ Episodio ${ep.number}${ep.guest ? ` con ${ep.guest}` : ""}.`;
    case "facebook":
      return `Nuevo episodio: ${t}. Comenta qué te pareció 👇`;
    case "tiktok":
      return `${t} #fe #podcast #lamesadelreino`;
    case "x":
      return `${t} — ep. ${ep.number}.`;
  }
}

export default function NewCampaignPage() {
  const { t } = useLang();
  const router = useRouter();
  const { data: episodes } = useQuery<Episode[]>((sb) =>
    sb.from("episodes").select("*").order("publish_at", { ascending: false }),
  );

  const [episodeId, setEpisodeId] = useState("");
  const [goal, setGoal] = useState<Goal>("views");
  const [budget, setBudget] = useState(100);
  const [mix, setMix] = useState<Record<Platform, PlacementKind | null>>(DEFAULT_MIX);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Default to the soonest episode that has not aired yet — the one a campaign
  // is almost always for.
  const upcoming = useMemo(() => {
    const list = episodes ?? [];
    const future = list.filter((e) => new Date(e.publish_at) >= new Date());
    return future.length ? future[future.length - 1] : list[0];
  }, [episodes]);

  const chosenId = episodeId || upcoming?.id || "";
  const ep = (episodes ?? []).find((e) => e.id === chosenId);

  const paidPlatforms = (Object.keys(mix) as Platform[]).filter(
    (p) => mix[p] === "paid",
  );
  const perPlatform = paidPlatforms.length
    ? Math.floor(budget / paidPlatforms.length)
    : 0;

  async function create() {
    if (!ep) {
      setError(t("Escoge un episodio."));
      return;
    }
    const chosen = (Object.keys(mix) as Platform[]).filter((p) => mix[p]);
    if (chosen.length === 0) {
      setError(t("Escoge al menos una plataforma."));
      return;
    }

    setBusy(true);
    setError("");
    const sb = browserClient();

    // The campaign runs from two days before the episode to five days after —
    // the window that actually matters for a weekly show.
    const pub = new Date(ep.publish_at);
    const starts = new Date(pub.getTime() - 2 * 86400000);
    const ends = new Date(pub.getTime() + 5 * 86400000);

    const { data: created } = await sb
      .from("campaigns")
      .insert({
        episode_id: ep.id,
        name: `Ep. ${ep.number} — ${ep.title}`,
        goal,
        status: "draft",
        budget_total: budget,
        starts_at: starts.toISOString().slice(0, 10),
        ends_at: ends.toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const campaignId = (created as { id: string } | null)?.id;
    if (!campaignId) {
      setError(t("No se pudo crear la campaña."));
      setBusy(false);
      return;
    }

    await sb.from("placements").insert(
      chosen.map((p) => ({
        campaign_id: campaignId,
        platform: p,
        kind: mix[p],
        status: "draft",
        budget: mix[p] === "paid" ? perPlatform : null,
        run_at: ep.publish_at,
        copy: suggest(p, ep, goal),
        creative_url: null,
      })),
    );

    router.push(`/campanas/ver?id=${campaignId}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black tracking-tight mb-5">{t("Nueva campaña")}</h1>

      <div className="card p-4 mb-4">
        <Label>{t("Episodio")}</Label>
        <select
          value={chosenId}
          onChange={(e) => setEpisodeId(e.target.value)}
        >
          {(episodes ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              Ep. {e.number} — {e.title} ({shortDate(e.publish_at)})
            </option>
          ))}
        </select>
        {ep?.guest && (
          <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
            {t("Invitado")}: {ep.guest}
          </p>
        )}
      </div>

      <div className="card p-4 mb-4">
        <Label>{t("¿Qué buscamos?")}</Label>
        <div className="space-y-2">
          {(Object.keys(GOALS) as Goal[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              className="w-full text-left px-3 py-2.5 rounded-xl border"
              style={{
                background: goal === g ? "var(--surface-3)" : "var(--ink)",
                borderColor: goal === g ? "var(--brass)" : "var(--line)",
              }}
            >
              <div className="font-bold text-sm">{t(GOALS[g].label)}</div>
              <div className="text-xs" style={{ color: "var(--faint)" }}>
                {t(GOALS[g].hint)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4 mb-4">
        <Label>{t("Presupuesto de anuncios")}</Label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="flex-1"
            style={{ padding: 0, border: "none", background: "transparent" }}
          />
          <span className="font-black text-lg nums w-20 text-right">
            {money(budget)}
          </span>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
          {paidPlatforms.length > 0
            ? `${t("Se reparte entre")} ${paidPlatforms.length} ${
                paidPlatforms.length === 1
                  ? t("plataforma")
                  : t("plataformas")
              }.`
            : t("Ninguna plataforma está marcada como pagada todavía.")}
        </p>
      </div>

      <div className="card p-4 mb-5">
        <Label>{t("Dónde sale")}</Label>
        <div className="space-y-2">
          {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
            const pf = PLATFORMS[p];
            const val = mix[p];
            return (
              <div
                key={p}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ borderColor: "var(--line)", background: "var(--ink)" }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: pf.color }}
                />
                <span className="font-semibold text-sm mr-auto">{pf.label}</span>

                {(["organic", "paid", null] as const).map((k) => {
                  // X has no ad buying wired up, so do not offer a paid choice
                  // that could never be launched.
                  if (k === "paid" && !pf.paid) return null;
                  const on = val === k;
                  return (
                    <button
                      key={String(k)}
                      type="button"
                      onClick={() => setMix({ ...mix, [p]: k })}
                      className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{
                        background: on ? "var(--brass)" : "var(--surface-3)",
                        color: on ? "#17130a" : "var(--muted)",
                      }}
                    >
                      {k === "organic" ? t("Post") : k === "paid" ? t("Anuncio") : t("No")}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm mb-3" style={{ color: "var(--red)" }} role="alert">
          {error}
        </p>
      )}

      <button
        onClick={() => void create()}
        disabled={busy}
        className="w-full py-3 rounded-full font-bold disabled:opacity-50"
        style={{ background: "var(--brass)", color: "#17130a" }}
      >
        {busy ? t("Creando…") : t("Crear campaña")}
      </button>

      <p className="text-xs mt-3 text-center" style={{ color: "var(--faint)" }}>
        {t("Se crea como borrador. Nada sale ni se gasta hasta que la apruebes.")}
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-wider mb-2"
      style={{ color: "var(--faint)" }}
    >
      {children}
    </div>
  );
}
