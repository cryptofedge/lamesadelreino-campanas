"use client";

/**
 * The show's episodes. Campaigns hang off these, so this is where a week
 * actually begins — add the episode, then build its campaign.
 */
import { useState } from "react";
import Link from "next/link";
import { browserClient } from "@/lib/supabase-browser";
import { useQuery } from "@/lib/useQuery";
import { shortDate, daysUntil } from "@/lib/types";
import type { Episode } from "@/lib/types";

export default function EpisodesPage() {
  const { data: episodes, loading, reload } = useQuery<Episode[]>((sb) =>
    sb.from("episodes").select("*").order("number", { ascending: false }),
  );

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [guest, setGuest] = useState("");
  const [publish, setPublish] = useState("");
  const [busy, setBusy] = useState(false);

  const nextNumber = ((episodes ?? [])[0]?.number ?? 0) + 1;

  async function add() {
    if (title.trim().length < 2 || !publish) return;
    setBusy(true);
    await browserClient()
      .from("episodes")
      .insert({
        number: nextNumber,
        title: title.trim(),
        guest: guest.trim() || null,
        publish_at: new Date(publish + "T19:00:00").toISOString(),
        recorded_at: null,
        youtube_url: null,
        thumbnail_url: null,
        notes: null,
      });
    setBusy(false);
    setAdding(false);
    setTitle("");
    setGuest("");
    setPublish("");
    reload();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-2xl font-black tracking-tight mr-auto">Episodios</h1>
        <button
          onClick={() => setAdding(!adding)}
          className="px-4 py-2 rounded-full font-bold text-sm"
          style={{ background: "var(--brass)", color: "#17130a" }}
        >
          {adding ? "Cancelar" : "+ Nuevo episodio"}
        </button>
      </div>

      {adding && (
        <div className="card p-4 mb-5 max-w-xl">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--faint)" }}>
            Episodio {nextNumber}
          </div>
          <input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3"
          />
          <input
            placeholder="Invitado (opcional)"
            value={guest}
            onChange={(e) => setGuest(e.target.value)}
            className="mb-3"
          />
          <label className="text-xs mb-1" style={{ color: "var(--faint)" }}>
            Fecha de estreno
          </label>
          <input
            type="date"
            value={publish}
            onChange={(e) => setPublish(e.target.value)}
            className="mb-4"
          />
          <button
            onClick={() => void add()}
            disabled={busy || !title.trim() || !publish}
            className="w-full py-2.5 rounded-full font-bold disabled:opacity-50"
            style={{ background: "var(--brass)", color: "#17130a" }}
          >
            {busy ? "Guardando…" : "Guardar episodio"}
          </button>
        </div>
      )}

      {loading && (
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          Cargando…
        </p>
      )}

      <div className="space-y-3">
        {(episodes ?? []).map((e) => {
          const days = daysUntil(e.publish_at);
          const future = days !== null && days >= 0;
          return (
            <div key={e.id} className="card p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div
                  className="text-2xl font-black nums shrink-0 w-12"
                  style={{ color: "var(--brass)" }}
                >
                  {e.number}
                </div>
                <div className="min-w-0 mr-auto">
                  <div className="font-bold leading-tight">{e.title}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    {shortDate(e.publish_at)}
                    {e.guest ? ` · ${e.guest}` : ""}
                    {future && (
                      <span style={{ color: "var(--amber)" }}>
                        {" · "}
                        {days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`}
                      </span>
                    )}
                  </div>
                  {e.notes && (
                    <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
                      {e.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {e.youtube_url && (
                    <a
                      href={e.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{ background: "var(--surface-3)", color: "var(--text)" }}
                    >
                      YouTube ↗
                    </a>
                  )}
                  <Link
                    href="/campanas/nueva"
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: "var(--surface-3)", color: "var(--text)" }}
                  >
                    Promocionar
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
