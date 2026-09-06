/**
 * Composing image and video prompts, and handing them to the bot.
 *
 * The console cannot generate media itself: it is a static export, so a Gemini
 * or Veo key would ship inside the JavaScript for anyone to lift. The bot
 * already holds those keys server-side and already knows how to use them — the
 * `lamesadelreino-media` skill. So this writes the prompt properly and sends it
 * over WhatsApp, where the generation actually happens.
 *
 * The house rules below are not decoration. They are the same limits the media
 * skill carries, restated here because this is the other place prompts are
 * written, and a rule that lives in only one of two places is a rule that gets
 * broken.
 */

export type MediaKind = "thumbnail" | "quote" | "reel" | "clip";

export const MEDIA_KINDS: Record<
  MediaKind,
  { label: string; hint: string; aspect: string; video: boolean }
> = {
  thumbnail: { label: "Miniatura", hint: "Para YouTube.",            aspect: "16:9", video: false },
  quote:     { label: "Frase",     hint: "Cita para Instagram.",     aspect: "1:1",  video: false },
  reel:      { label: "Reel",      hint: "Vertical, IG o TikTok.",   aspect: "9:16", video: false },
  clip:      { label: "Video",     hint: "Video corto generado.",    aspect: "9:16", video: true },
};

/**
 * Non-negotiable, and stated in the prompt itself rather than trusted to the
 * model's judgement.
 *
 * The first two are the ones that matter on a Christian show: a generated face
 * presented as a real person is a lie about someone, and depicting Jesus or God
 * is a decision for the ministry, not for an image model or for me.
 */
const HOUSE_RULES = [
  "No representes a Jesús, a Dios ni al Espíritu Santo de ninguna forma.",
  "No inventes rostros de personas reales ni de miembros de la iglesia.",
  "Nada de texto falso ni de logos inventados dentro de la imagen.",
  "Nada de símbolos de otras religiones ni de imágenes ofensivas.",
];

const STYLE =
  "Estilo: fotográfico, cálido, luz suave de tarde. Paleta oscura con dorado " +
  "brillante (#d6a854) sobre casi negro (#0b0a10), como la marca del programa. " +
  "Sobrio y con dignidad, nunca cursi ni de banco de imágenes.";

export interface MediaPrompt {
  kind: MediaKind;
  aspect: string;
  video: boolean;
  /** Ready to paste, or to send to the bot. */
  text: string;
  /** How heavy this one is to make. Deliberately not a price — no screen in
   *  this console quotes money. */
  costHint: string;
}

export function buildPrompt(
  kind: MediaKind,
  idea: string,
  episodeTitle?: string,
): MediaPrompt {
  const k = MEDIA_KINDS[kind];
  const subject = idea.trim() || episodeTitle || "el tema del episodio";

  const lines = [
    k.video
      ? `Genera un video corto (5-8 segundos), formato ${k.aspect}, sin texto en pantalla.`
      : `Genera una imagen ${k.aspect} para ${k.label.toLowerCase()} de un pódcast cristiano.`,
    "",
    `Tema: ${subject}`,
    episodeTitle && idea.trim() ? `Episodio: ${episodeTitle}` : "",
    "",
    STYLE,
    "",
    kind === "thumbnail"
      ? "Deja espacio limpio a un lado para poner el título después. No escribas el título dentro de la imagen."
      : "",
    kind === "quote"
      ? "Composición simple, con mucho espacio negativo para colocar la frase encima."
      : "",
    "",
    "Reglas:",
    ...HOUSE_RULES.map((r) => `- ${r}`),
  ].filter(Boolean);

  return {
    kind,
    aspect: k.aspect,
    video: k.video,
    text: lines.join("\n"),
    costHint: k.video
      ? "El video toma bastante más que una imagen — confírmalo con Richard antes."
      : "Listo en segundos.",
  };
}

/**
 * The WhatsApp handoff.
 *
 * `#elmini` is the trigger that puts the bot into podcast mode; without it the
 * message would be read as restaurant business, since both share one number.
 * This only *prefills* a message — the person still presses send.
 */
export function botMessage(prompt: string): string {
  return `#elmini\n\n${prompt}`;
}

export function waLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
