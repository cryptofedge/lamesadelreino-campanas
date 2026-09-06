"use client";

/**
 * The creative for a post — one card, two ways to get one.
 *
 * Generating and uploading were two cards at first, which read as two separate
 * tasks. They are not: it is one job, "get the picture", and the only question
 * is whether it already exists. So it is one card with a mode switch, and the
 * actions at the bottom are the same either way.
 *
 *   GENERAR — the console writes the prompt; the bot runs it. A static export
 *             cannot hold a Gemini key without publishing it, so the work
 *             happens where the keys already are. See lib/media.ts.
 *
 *   SUBIR   — a clip already cut, or a photo from the studio.
 */
import { useState, useRef } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { buildPrompt, botMessage, waLink, MEDIA_KINDS } from "@/lib/media";
import type { MediaKind } from "@/lib/media";
import ShareButton from "@/components/ShareButton";
import ImageEditor from "@/components/ImageEditor";
import { useLang } from "@/lib/i18n";
import type { Campaign, Episode, Platform } from "@/lib/types";

type Mode = "generar" | "subir";

export default function MediaStudio({
  episode,
  campaigns,
  platform,
  onAttached,
  onCreative,
}: {
  episode: Episode | undefined;
  campaigns: Campaign[];
  platform: Platform;
  onAttached?: () => void;
  /** Hands the chosen picture up so a generated post can carry it. A post
   *  saved with no creative is a post somebody has to finish somewhere else. */
  onCreative?: (c: { url: string; name: string; video: boolean } | null) => void;
}) {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>("generar");
  const [kind, setKind] = useState<MediaKind>("thumbnail");
  const [idea, setIdea] = useState("");
  const [copied, setCopied] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [attached, setAttached] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const prompt = buildPrompt(kind, idea, episode?.title);
  const forBot = botMessage(prompt.text);

  function choose(f: File | null) {
    if (!f) return;
    setFile(f);
    // Revoke the previous URL or every re-pick leaks one for the page's life.
    const url = URL.createObjectURL(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
    setAttached(null);
    setEditing(false);
    onCreative?.({ url, name: f.name, video: f.type.startsWith("video/") });
  }

  /** Throw the upload away. The wrong file picked in a hurry is the normal
   *  case, and without this the only way out is reloading the page. */
  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setAttached(null);
    setEditing(false);
    // The input keeps its value, so re-picking the *same* file would fire no
    // change event and look broken.
    if (fileRef.current) fileRef.current.value = "";
    onCreative?.(null);
  }

  /** Replace the upload with the cropped version. */
  function applyEdit(f: File, url: string) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(url);
    setEditing(false);
    setAttached(null);
    onCreative?.({ url, name: f.name, video: false });
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

  const tab = (m: Mode, label: string) => {
    const on = mode === m;
    return (
      <button
        key={m}
        onClick={() => setMode(m)}
        className="text-xs px-3 py-1.5 rounded-full font-semibold"
        style={{
          background: on ? "var(--brass)" : "var(--surface-3)",
          color: on ? "#17130a" : "var(--muted)",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div
          className="text-xs font-bold uppercase tracking-wider mr-auto"
          style={{ color: "var(--faint)" }}
        >
          {t("Imagen y video")}
        </div>
        {tab("generar", t("Generar"))}
        {tab("subir", t("Subir la mía"))}
      </div>

      {mode === "generar" ? (
        <>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {(Object.keys(MEDIA_KINDS) as MediaKind[]).map((k) => {
              const on = kind === k;
              return (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{
                    background: on ? "var(--surface-3)" : "transparent",
                    color: on ? "var(--brass)" : "var(--muted)",
                    border: `1px solid ${on ? "var(--line-warm)" : "var(--line)"}`,
                  }}
                  title={t(MEDIA_KINDS[k].hint)}
                >
                  {t(MEDIA_KINDS[k].label)}
                </button>
              );
            })}
          </div>

          <textarea
            value={idea}
            rows={3}
            placeholder={t("¿Qué quieres ver? Ej: una mesa vacía con dos tazas y luz de ventana")}
            onChange={(e) => setIdea(e.target.value)}
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />

          <p className="text-xs mt-2 mb-3" style={{ color: "var(--faint)" }}>
            {t(MEDIA_KINDS[kind].hint)} {prompt.aspect} · {t(prompt.costHint)}
          </p>

          <details className="mb-3">
            <summary
              className="text-xs cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              {t("Ver el prompt completo")}
            </summary>
            <pre
              className="text-[11px] whitespace-pre-wrap mt-2 p-3 rounded-xl leading-relaxed"
              style={{
                background: "var(--ink)",
                color: "var(--muted)",
                border: "1px solid var(--line)",
              }}
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
              {copied ? t("Copiado ✓") : t("Copiar prompt")}
            </button>

            <a
              href={waLink(forBot)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ background: "#25D366", color: "#06301a" }}
            >
              {t("Mandar al bot")}
            </a>
          </div>

          <p
            className="text-xs mt-3 leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            {t("El bot la genera y te la manda por WhatsApp. Aquí no se puede generar directamente: esta página es pública y la clave quedaría a la vista.")}
          </p>
        </>
      ) : (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
            className="mb-3"
            style={{ padding: 8 }}
          />

          {preview && editing && !isVideo && (
            <ImageEditor
              src={preview}
              fileName={file?.name ?? "imagen.jpg"}
              onDone={applyEdit}
              onCancel={() => setEditing(false)}
            />
          )}

          {preview && !editing && (
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

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs" style={{ color: "var(--faint)" }}>
                  {file?.name} · {Math.round((file?.size ?? 0) / 1024)} KB
                </span>

                {!isVideo && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: "var(--surface-3)", color: "var(--text)" }}
                  >
                    {t("Recortar")}
                  </button>
                )}

                <button
                  onClick={clearFile}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: "transparent", color: "var(--red)", border: "1px solid var(--line)" }}
                >
                  {t("Quitar")}
                </button>
              </div>

              {isVideo && (
                <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
                  {t("Los videos no se recortan aquí. Para cortar o subtitular, pídeselo al bot con #elmini.")}
                </p>
              )}
            </div>
          )}

          {preview ? (
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
                    background:
                      attached === c.id ? "var(--green)" : "var(--brass)",
                    color: "#17130a",
                  }}
                >
                  {attached === c.id
                    ? t("Adjuntado ✓")
                    : uploading
                      ? t("Subiendo…")
                      : `→ ${c.name.split("—")[0].trim()}`}
                </button>
              ))}
              <ShareButton
                text={`Mira esto para ${episode?.title ?? "el episodio"}`}
                label="WhatsApp"
              />
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Un corte ya editado, o una foto del estudio. Se adjunta a la
              campaña como el creativo del post.
            </p>
          )}
        </>
      )}
    </div>
  );
}
