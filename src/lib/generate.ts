/**
 * Post generator.
 *
 * Why this is templates and not an AI call: the console is a static export on
 * GitHub Pages, so any API key it used would ship inside the JavaScript for
 * anyone to read. Freeform rewriting belongs to the bot, which already holds
 * Gemini and Claude keys server-side — El Mini on WhatsApp, `#elmini`.
 *
 * So this does the part that does not need a model: it knows each platform's
 * conventions, and it turns one episode into a week of genuinely different
 * angles rather than the same sentence five times. Every line comes out
 * editable — nothing here is meant to post unread.
 */
import type { Episode, Goal, Platform } from "./types";

/** The angle a post takes. Same episode, five different ways in. */
export type Angle = "pregunta" | "cita" | "invitacion" | "adelanto" | "cierre";

export const ANGLES: Record<Angle, { label: string; hint: string }> = {
  pregunta:   { label: "Pregunta",   hint: "Abre con algo que la gente se pregunta." },
  cita:       { label: "Frase",      hint: "Una línea fuerte del episodio." },
  invitacion: { label: "Invitación", hint: "Directo: míralo, aquí está." },
  adelanto:   { label: "Adelanto",   hint: "Antes de que salga, para crear expectativa." },
  cierre:     { label: "Recordatorio", hint: "Días después, para los que no lo vieron." },
};

/** Hard platform limits. Going over does not get truncated politely — it
 *  gets rejected or silently cut mid-word. */
export const LIMITS: Record<Platform, number> = {
  youtube: 100,     // title
  instagram: 2200,
  facebook: 63206,
  tiktok: 150,
  x: 280,
};

const HASHTAGS: Record<Platform, string[]> = {
  youtube: [],
  instagram: ["#LaMesaDelReino", "#fe", "#podcastcristiano", "#Dios"],
  facebook: [],
  tiktok: ["#LaMesaDelReino", "#fe", "#podcast", "#cristiano", "#parati"],
  x: ["#LaMesaDelReino"],
};

/**
 * Openers per angle. Several of each so a week of posts does not read like a
 * mail merge — the caller rotates through them with `variant`.
 */
const OPENERS: Record<Angle, string[]> = {
  pregunta: [
    "¿Te ha pasado?",
    "¿Y si lo que sientes no es lo que crees?",
    "Una pregunta incómoda:",
    "¿Cuántas veces lo has pensado?",
  ],
  cita: [
    "Se dijo así:",
    "Esta frase se quedó dando vueltas:",
    "Lo dijimos y nos quedamos callados:",
    "Guarda esta:",
  ],
  invitacion: [
    "Ya está disponible.",
    "Nuevo episodio.",
    "Siéntate con nosotros.",
    "Dale play cuando puedas.",
  ],
  adelanto: [
    "Este domingo.",
    "Lo que viene:",
    "Prepárate para este.",
    "Falta poco.",
  ],
  cierre: [
    "Por si te lo perdiste.",
    "Todavía estás a tiempo.",
    "El de esta semana sigue ahí.",
    "Si no lo has visto:",
  ],
};

/** Closers that ask for the thing the campaign is actually after. */
const CTA: Record<Goal, string[]> = {
  views:       ["Míralo completo.", "Dale play.", "Está completo en YouTube."],
  subscribers: ["Suscríbete para no perderte ninguno.", "Activa la campanita.", "Suscríbete al canal."],
  attendance:  ["Te esperamos.", "Nos vemos ahí.", "Aparta la fecha."],
  awareness:   ["Compártelo con alguien.", "Etiqueta a quien lo necesite.", "Pásalo."],
};

const pick = <T,>(list: T[], variant: number): T => list[variant % list.length];

export interface GeneratedPost {
  platform: Platform;
  angle: Angle;
  text: string;
  /** YouTube needs a title separate from the body. */
  title?: string;
  length: number;
  limit: number;
  overLimit: boolean;
}

/**
 * Build one post.
 *
 * `variant` rotates the wording — same inputs, different phrasing — so the
 * screen can offer three options side by side instead of one take-it-or-leave-it
 * line.
 */
export function generatePost(
  episode: Episode,
  platform: Platform,
  angle: Angle,
  goal: Goal,
  variant = 0,
): GeneratedPost {
  const opener = pick(OPENERS[angle], variant);
  const cta = pick(CTA[goal], variant);
  const guest = episode.guest ? ` con ${episode.guest}` : "";
  const link = episode.youtube_url ?? "";
  const tags = HASHTAGS[platform];

  let title: string | undefined;
  let text: string;

  switch (platform) {
    case "youtube": {
      // The title is the whole battle on YouTube; the description is secondary.
      title =
        angle === "pregunta"
          ? `${episode.title} | La Mesa del Reino Ep. ${episode.number}`
          : `${episode.title}${guest} | Ep. ${episode.number}`;
      text = [
        `${opener} ${episode.title}${guest}.`,
        "",
        episode.notes ?? "",
        "",
        cta,
        "",
        "La Mesa del Reino — donde la fe se sienta a conversar con la vida.",
      ]
        .filter(Boolean)
        .join("\n");
      break;
    }

    case "instagram": {
      text = [
        `${opener}`,
        "",
        `${episode.title}${guest}. Episodio ${episode.number}. 🎙️`,
        "",
        cta,
        "",
        tags.join(" "),
      ].join("\n");
      break;
    }

    case "facebook": {
      // Facebook rewards a question that people answer in the comments.
      text = [
        `${opener} ${episode.title}${guest}.`,
        "",
        cta,
        link ? `\n${link}` : "",
        "",
        "¿Qué te pareció? Cuéntanos abajo 👇",
      ]
        .filter(Boolean)
        .join("\n");
      break;
    }

    case "tiktok": {
      // 150 characters, hashtags included. Build short, then add what fits.
      const base = `${opener} ${episode.title}`;
      const room = LIMITS.tiktok - base.length - 1;
      const fitted: string[] = [];
      let used = 0;
      for (const t of tags) {
        if (used + t.length + 1 > room) break;
        fitted.push(t);
        used += t.length + 1;
      }
      text = `${base} ${fitted.join(" ")}`.trim();
      break;
    }

    case "x": {
      const base = `${episode.title}${guest} — ep. ${episode.number}. ${cta}`;
      const room = LIMITS.x - base.length - (link ? link.length + 1 : 0) - 1;
      const tag = tags[0] && tags[0].length <= room ? ` ${tags[0]}` : "";
      text = `${base}${tag}${link ? `\n${link}` : ""}`;
      break;
    }
  }

  const measured = platform === "youtube" ? (title ?? "") : text;

  return {
    platform,
    angle,
    text: text.trim(),
    title,
    length: measured.length,
    limit: LIMITS[platform],
    overLimit: measured.length > LIMITS[platform],
  };
}

/** Three phrasings of the same idea, for picking rather than accepting. */
export function generateOptions(
  episode: Episode,
  platform: Platform,
  angle: Angle,
  goal: Goal,
): GeneratedPost[] {
  return [0, 1, 2].map((v) => generatePost(episode, platform, angle, goal, v));
}
