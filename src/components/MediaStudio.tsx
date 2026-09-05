"use client";

/**
 * Making the picture or the video, and turning one you already have into a post.
 *
 * Two halves, because they are genuinely two jobs:
 *
 *   GENERATE — the console writes the prompt; the bot runs it. A static export
 *              cannot hold a Gemini key without publishing it, so the work
 *              happens where the keys already are. See lib/media.ts.
 *
 *   UPLOAD   — a clip already cut, or a photo from the studio. It gets attached
 *              to a campaign as the creative for a post.
 */
import { useState, useRef } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { buildPrompt, botMessage, waLink, MEDIA_KINDS } from "@/lib/media";
import type { MediaKind } from "@/lib/media";
import ShareButton from "@/components/ShareButton";
import type { Campaign, Episode, Platform } from "@/lib/types";

export default function MediaStudio({
  episode,
  campaigns,
  platform,
  onAttached,
}: {
  episode: Episode | undefined;
  campaigns: Campaign[];
  platform: Platform;
  onAttached?: () => void;
}) {
  const [kind, setKind] = useState<MediaKind>("thumbnail");
  const [idea, setIdea] = useState("");
  const [copied, setCopied] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [attached, setAttached] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const prompt = buildPrompt(kind, idea, episode?.title);
  const forBot = botMessage(prompt.text);

  function choose(f: File | null) {
    if (!f) return;
    setFile(f);
    // Revoke the previous URL or every re-pick leaks one for the page's life.
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
    setAttached(null);
  }

  /** Put the uploaded file on a campaign as the creative for a new post. */
  async function attach(campaignId: string) {
    if (!file || !episode) return;
    setUploading(true);
    const sb = browserClient();

    const path = `creatives/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await sb.storage.from("media").upload(path, file);

    // In the demo the stand-in storage hands back an object URL; with a real
    // bucket this is the public URL. Either way the post gets something it can
    // actually show.
    const url = error
      ? preview
      : sb.storage.from("media").getPublicUrl(path).data.publicUrl || preview;

    await sb.from("placements").insert({
      campaign_id: campaignId,
      platform,
      kind: "organic",
      status: "draft",
      budget: null,
      run_at: episode.publish_at,
      copy: `${episode.title} — episodio ${episode.number}.`,
      creative_url: url,
    });

    setUploading(false);
    setAttached(campaignId);
    onAttached?.();
  }

  const live = campaigns.filter((c) => c.status !== "done").slice(0, 3);
  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------- */}
      <div className="card p-4">
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--faint)" }}>
          Crear imagen o video
        </div>

        <div className="flex gap-1.5 flex-wrap mb-3">
          {(Object.keys(MEDIA_KINDS) as MediaKind[]).map((k) => {
            const on = kind === k;
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{
                  background: on ? "var(--brass)" : "var(--surface-3)",
                  color: on ? "#17130a" : "var(--muted)",
                }}
                title={MEDIA_KINDS[k].hint}
              >
                {MEDIA_KINDS[k].label}
              </button>
            );
          })}
        </div>

        <textarea
          value={idea}
          rows={3}
          placeholder="¿Qué quieres ver? Ej: una mesa vacía con dos tazas y luz de ventana"
          onChange={(e) => setIdea(e.target.value)}
          style={{ resize: "vertical", lineHeight: 1.5 }}
        />

        <p className="text-xs mt-2 mb-3" style={{ color: "var(--faint)" }}>
          {MEDIA_KINDS[kind].hint} {prompt.aspect} · {prompt.costHint}
        </p>

        <details className="mb-3">
          <summary
            className="text-xs cursor-pointer"
            style={{ color: "var(--muted)" }}
          >
            Ver el prompt completo
          </summary>
          <pre
            className="text-[11px] whitespace-pre-wrap mt-2 p-3 rounded-xl leading-relaxed"
            style={{ background: "var(--ink)", color: "var(--muted)", border: "1px solid var(--line)" }}
          >
            {prompt.text}
          </pre>
        </details>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(prompt.text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "var(--surface-3)", color: "var(--text)" }}
          >
            {copied ? "Copiado ✓" : "Copiar prompt"}
          </button>

          <a
            href={waLink(forBot)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "#25D366", color: "#06301a" }}
          >
            Mandar al bot
          </a>
        </div>

        <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>
          El bot la genera y te la manda por WhatsApp. Aquí no se puede generar
          directamente: esta página es pública y la clave quedaría a la vista.
        </p>
      </div>

      {/* ---------------------------------------------------------- */}
      <div className="card p-4">
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--faint)" }}>
          O sube una foto o un video
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          className="mb-3"
          style={{ padding: 8 }}
        />

        {preview && (
          <div className="mb-3">
            {isVideo ? (
              <video
                src={preview}
                controls
                className="rounded-xl max-h-64 w-auto"
                style={{ border: "1px solid var(--line)" }}
              />
            ) : (
              <img
                src={preview}
                alt="Vista previa"
                className="rounded-xl max-h-64 w-auto"
                style={{ border: "1px solid var(--line)" }}
              />
            )}
            <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
              {file?.name} · {Math.round((file?.size ?? 0) / 1024)} KB
            </p>
          </div>
        )}

        {preview && (
          <div className="flex gap-2 flex-wrap">
            {live.length === 0 && (
              <span className="text-xs" style={{ color: "var(--faint)" }}>
                Crea una campaña primero para poder adjuntarlo.
              </span>
            )}
            {live.map((c) => (
              <button
                key={c.id}
                onClick={() => void attach(c.id)}
                disabled={uploading}
                className="text-xs px-3 py-1.5 rounded-full font-semibold disabled:opacity-50"
                style={{
                  background: attached === c.id ? "var(--green)" : "var(--brass)",
                  color: "#17130a",
                }}
              >
                {attached === c.id
                  ? "Adjuntado ✓"
                  : uploading
                    ? "Subiendo…"
                    : `→ ${c.name.split("—")[0].trim()}`}
              </button>
            ))}
            <ShareButton
              text={`Mira esto para ${episode?.title ?? "el episodio"}`}
              label="WhatsApp"
            />
          </div>
        )}
      </div>
    </div>
  );
}
