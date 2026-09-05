"use client";

/**
 * Turn one episode into the week's posts.
 *
 * Three phrasings per angle, not one, because the useful thing is choosing
 * between options rather than accepting whatever appeared. Everything is
 * editable before it goes anywhere — and the character counter is live,
 * because TikTok and X reject over-length copy rather than trimming it.
 */
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { useQuery } from "@/lib/useQuery";
import { generateOptions, ANGLES, LIMITS } from "@/lib/generate";
import type { Angle } from "@/lib/generate";
import { PLATFORMS, GOALS, shortDate } from "@/lib/types";
import type { Campaign, Episode, Goal, Platform } from "@/lib/types";
import MediaStudio from "@/components/MediaStudio";
import ShareButton from "@/components/ShareButton";

export default function GeneratorPage() {
  const router = useRouter();

  const { data: episodes } = useQuery<Episode[]>((sb) =>
    sb.from("episodes").select("*").order("publish_at", { ascending: false }),
  );
  const { data: campaigns } = useQuery<Campaign[]>((sb) =>
    sb.from("campaigns").select("*").order("starts_at", { ascending: false }),
  );

  const [episodeId, setEpisodeId] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [angle, setAngle] = useState<Angle>("pregunta");
  const [goal, setGoal] = useState<Goal>("views");
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [savedTo, setSavedTo] = useState<string | null>(null);
  // The picture chosen below, so a post saved from here goes out complete
  // rather than as text somebody has to finish somewhere else.
  const [creative, setCreative] = useState<{
    url: string;
    name: string;
    video: boolean;
  } | null>(null);

  const list = episodes ?? [];
  const ep = list.find((e) => e.id === episodeId) ?? list[0];

  // Regenerating on every keystroke would wipe an edit in progress, so the
  // options are memoised against the choices that actually define them.
  const options = useMemo(
    () => (ep ? generateOptions(ep, platform, angle, goal) : []),
    [ep, platform, angle, goal],
  );

  // Any change of inputs invalidates edits keyed by index.
  const key = `${ep?.id}-${platform}-${angle}-${goal}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setEdited({});
  }

  const textFor = (i: number) => edited[i] ?? options[i]?.text ?? "";

  /** Attach a generated post to a campaign as a real placement. */
  async function saveTo(campaignId: string, i: number) {
    const o = options[i];
    if (!o || !ep) return;
    await browserClient()
      .from("placements")
      .insert({
        campaign_id: campaignId,
        platform,
        kind: "organic",
        status: "draft",
        budget: null,
        run_at: ep.publish_at,
        copy: textFor(i),
        creative_url: creative?.url ?? null,
      });
    setSavedTo(campaignId);
    setTimeout(() => router.push(`/campanas/ver?id=${campaignId}`), 700);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black tracking-tight mb-1">Generador de posts</h1>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        Un episodio, varias formas de contarlo. Edita lo que quieras antes de
        guardarlo.
      </p>

      <div className="card p-4 mb-4">
        <Label>Episodio</Label>
        <select
          value={ep?.id ?? ""}
          onChange={(e) => setEpisodeId(e.target.value)}
          className="mb-4"
        >
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              Ep. {e.number} — {e.title} ({shortDate(e.publish_at)})
            </option>
          ))}
        </select>

        <Label>Plataforma</Label>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {(Object.keys(PLATFORMS) as Platform[]).map((p) => {
            const on = platform === p;
            return (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{
                  background: on ? "var(--brass)" : "var(--surface-3)",
                  color: on ? "#17130a" : "var(--muted)",
                }}
              >
                {PLATFORMS[p].label}
              </button>
            );
          })}
        </div>

        <Label>Ángulo</Label>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {(Object.keys(ANGLES) as Angle[]).map((a) => {
            const on = angle === a;
            return (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{
                  background: on ? "var(--brass)" : "var(--surface-3)",
                  color: on ? "#17130a" : "var(--muted)",
                }}
              >
                {ANGLES[a].label}
              </button>
            );
          })}
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--faint)" }}>
          {ANGLES[angle].hint}
        </p>

        <Label>Qué pedimos</Label>
        <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
          {(Object.keys(GOALS) as Goal[]).map((g) => (
            <option key={g} value={g}>
              {GOALS[g].label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 mb-6">
        {options.map((o, i) => {
          const value = textFor(i);
          const measured = platform === "youtube" ? (o.title ?? "") : value;
          const over = measured.length > LIMITS[platform];

          return (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="chip"
                  style={{ color: "var(--muted)", borderColor: "var(--line)" }}
                >
                  Opción {i + 1}
                </span>
                <span
                  className="ml-auto text-xs nums"
                  style={{ color: over ? "var(--red)" : "var(--faint)" }}
                >
                  {measured.length}/{LIMITS[platform]}
                  {platform === "youtube" ? " (título)" : ""}
                </span>
              </div>

              {o.title && (
                <input
                  value={o.title}
                  readOnly
                  className="mb-2 font-semibold"
                  style={{ fontSize: 14 }}
                />
              )}

              <textarea
                value={value}
                rows={platform === "youtube" || platform === "facebook" ? 7 : 5}
                onChange={(e) => setEdited({ ...edited, [i]: e.target.value })}
                style={{ resize: "vertical", lineHeight: 1.5 }}
              />

              {over && (
                <p className="text-xs mt-2" style={{ color: "var(--red)" }}>
                  Se pasa del límite. {PLATFORMS[platform].label} lo va a cortar.
                </p>
              )}

              {/* Show what will actually go out with this post, so nobody
                  saves text believing a picture is attached when none is. */}
              {creative && (
                <div className="flex items-center gap-2 mt-3">
                  {creative.video ? (
                    <video
                      src={creative.url}
                      className="h-12 w-12 rounded-lg object-cover"
                      style={{ border: "1px solid var(--line)" }}
                    />
                  ) : (
                    <img
                      src={creative.url}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                      style={{ border: "1px solid var(--line)" }}
                    />
                  )}
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    Va con {creative.name}
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => void navigator.clipboard?.writeText(value)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: "var(--surface-3)", color: "var(--text)" }}
                >
                  Copiar
                </button>

                <ShareButton text={value} label="WhatsApp" />

                {(campaigns ?? [])
                  .filter((c) => c.status !== "done")
                  .slice(0, 3)
                  .map((c) => (
                    <button
                      key={c.id}
                      onClick={() => void saveTo(c.id, i)}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{
                        background:
                          savedTo === c.id ? "var(--green)" : "var(--brass)",
                        color: "#17130a",
                      }}
                    >
                      {savedTo === c.id ? "Guardado ✓" : `→ ${c.name.split("—")[0].trim()}`}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <MediaStudio
          episode={ep}
          campaigns={campaigns ?? []}
          platform={platform}
          onCreative={setCreative}
        />
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold mb-1">¿Quieres algo más suelto?</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Esto arma la estructura, no inventa. Para que el bot te escriba algo
          desde cero — o te haga la miniatura o el corte — escríbele por WhatsApp
          con <strong style={{ color: "var(--brass)" }}>#elmini</strong>. Ahí sí
          tiene la inteligencia conectada.
        </p>
      </div>
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
