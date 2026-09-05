"use client";

/**
 * Ideas for the next episodes.
 *
 * The questions are the point, not the titles. A title is easy and a good
 * opening question is the hard part of a conversation show, so each idea leads
 * with three of them and the title sits underneath as a working name.
 *
 * Nothing here ever produces scripture — see the note at the top of lib/ideas.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { useQuery } from "@/lib/useQuery";
import { generateIdeas, customIdeas, FORMATS, THEME_LIST } from "@/lib/ideas";
import type { Format, Idea } from "@/lib/ideas";
import type { Episode } from "@/lib/types";

export default function IdeasPage() {
  const router = useRouter();
  const [seed, setSeed] = useState(0);
  // Free text, not a select. The curated themes are suggestions in a datalist,
  // so Richard can pick one or type "matrimonio joven" and still get somewhere.
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: episodes } = useQuery<Episode[]>((sb) =>
    sb.from("episodes").select("*").order("number", { ascending: false }),
  );
  const { data: saved, reload } = useQuery<
    { id: string; title: string; theme: string; questions: string; used: boolean }[]
  >((sb) => sb.from("ideas").select("*"));

  // A typed topic that matches a curated theme uses that theme's hand-written
  // questions; anything else falls through to the generic frames, which are
  // written to work on a subject nobody anticipated.
  const matched = THEME_LIST.find(
    (t) => t.label.toLowerCase() === topic.trim().toLowerCase(),
  );
  const matchedFormat = (Object.keys(FORMATS) as Format[]).find(
    (f) => FORMATS[f].label.toLowerCase() === format.trim().toLowerCase(),
  );

  const ideas =
    topic.trim() && !matched
      ? customIdeas(topic, seed, 6, format || undefined)
      : generateIdeas(seed, 6, matchedFormat, matched?.id).map((i) => ({
          ...i,
          format: matchedFormat ? FORMATS[matchedFormat].label : i.format,
        }));

  const nextNumber = ((episodes ?? [])[0]?.number ?? 0) + 1;

  async function keep(idea: Idea) {
    setSavingId(idea.id);
    await browserClient()
      .from("ideas")
      .insert({
        title: idea.title,
        theme: idea.theme,
        format: idea.format,
        questions: idea.questions.join("\n"),
        guest: idea.guest,
        used: false,
      });
    setSavingId(null);
    reload();
  }

  /** Promote an idea straight into a real episode on the calendar. */
  async function schedule(idea: Idea) {
    setSavingId(idea.id);

    // Next free Sunday at 7pm — the show's slot.
    const d = new Date();
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    d.setHours(19, 0, 0, 0);

    await browserClient()
      .from("episodes")
      .insert({
        number: nextNumber,
        title: idea.title,
        guest: null,
        recorded_at: null,
        publish_at: d.toISOString(),
        youtube_url: null,
        thumbnail_url: null,
        notes: `${idea.format} · ${idea.theme}\n\n${idea.questions
          .map((q) => "— " + q)
          .join("\n")}\n\nInvitado sugerido: ${idea.guest}`,
      });

    setSavingId(null);
    router.push("/episodios");
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-2xl font-black tracking-tight mr-auto">Ideas</h1>
        <button
          onClick={() => setSeed(seed + 6)}
          className="px-4 py-2 rounded-full font-bold text-sm"
          style={{ background: "var(--brass)", color: "#17130a" }}
        >
          Otras ideas
        </button>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
        Temas y preguntas para los próximos domingos. Las preguntas son lo
        importante — el título se cambia después.
      </p>

      <div className="card p-4 mb-5">
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--faint)" }}>
          Filtrar
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Inputs with a datalist, not selects: pick a suggestion or type
              anything. The list stops it being a blank box. */}
          <input
            list="temas"
            value={topic}
            placeholder="Tema — escribe el tuyo o escoge"
            onChange={(e) => setTopic(e.target.value)}
            style={{ flex: "1 1 200px", width: "auto" }}
          />
          <datalist id="temas">
            {THEME_LIST.map((t) => (
              <option key={t.id} value={t.label} />
            ))}
          </datalist>

          <input
            list="formatos"
            value={format}
            placeholder="Formato — o el tuyo"
            onChange={(e) => setFormat(e.target.value)}
            style={{ flex: "1 1 160px", width: "auto" }}
          />
          <datalist id="formatos">
            {(Object.keys(FORMATS) as Format[]).map((f) => (
              <option key={f} value={FORMATS[f].label} />
            ))}
          </datalist>
        </div>

        {topic.trim() && !matched && (
          <p className="text-xs mt-3" style={{ color: "var(--brass)" }}>
            Tema tuyo: “{topic.trim()}”. Las preguntas se arman para cualquier
            tema — ajústalas a tu manera antes de grabar.
          </p>
        )}
        {(topic.trim() || format.trim()) && (
          <button
            onClick={() => {
              setTopic("");
              setFormat("");
            }}
            className="text-xs mt-3 px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "var(--surface-3)", color: "var(--muted)" }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-3 mb-7">
        {ideas.map((idea) => (
          <div key={idea.id} className="card p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="chip" style={{ color: "var(--violet)" }}>
                {idea.theme}
              </span>
              <span className="chip" style={{ color: "var(--muted)" }}>
                {idea.format}
              </span>
            </div>

            <h2 className="font-bold text-lg leading-tight mb-3">{idea.title}</h2>

            <ul className="space-y-1.5 mb-3">
              {idea.questions.map((q, i) => (
                <li
                  key={i}
                  className="text-sm leading-relaxed pl-3"
                  style={{
                    color: "var(--text)",
                    borderLeft: "2px solid var(--line-warm)",
                  }}
                >
                  {q}
                </li>
              ))}
            </ul>

            <p className="text-xs mb-3" style={{ color: "var(--faint)" }}>
              <strong style={{ color: "var(--muted)" }}>Invitado:</strong>{" "}
              {idea.guest}
            </p>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => void keep(idea)}
                disabled={savingId === idea.id}
                className="text-xs px-3 py-1.5 rounded-full font-semibold disabled:opacity-50"
                style={{ background: "var(--surface-3)", color: "var(--text)" }}
              >
                Guardar
              </button>
              <button
                onClick={() => void schedule(idea)}
                disabled={savingId === idea.id}
                className="text-xs px-3 py-1.5 rounded-full font-semibold disabled:opacity-50"
                style={{ background: "var(--brass)", color: "#17130a" }}
              >
                Programar como Ep. {nextNumber}
              </button>
              <button
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    `${idea.title}\n\n${idea.questions.map((q) => "— " + q).join("\n")}\n\nInvitado: ${idea.guest}`,
                  )
                }
                className="text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{ background: "var(--surface-3)", color: "var(--text)" }}
              >
                Copiar
              </button>
            </div>
          </div>
        ))}
      </div>

      {(saved ?? []).length > 0 && (
        <div className="mb-7">
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-3"
            style={{ color: "var(--faint)" }}
          >
            Guardadas ({(saved ?? []).length})
          </h2>
          <div className="space-y-2">
            {(saved ?? []).map((s) => (
              <div key={s.id} className="card p-3">
                <div className="font-semibold text-sm">{s.title}</div>
                <div className="text-xs" style={{ color: "var(--faint)" }}>
                  {s.theme}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <p className="text-sm font-bold mb-1">Sobre los versículos</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Aquí no salen citas bíblicas a propósito. Un versículo mal citado hace
          más daño que no citarlo, y esa parte la pone Richard. Esto solo trae
          el tema y las preguntas.
        </p>
      </div>
    </div>
  );
}
