/**
 * Episode ideas.
 *
 * The one rule that shapes this file: **it never produces scripture.** No
 * verses, no references, no doctrinal positions — the same hard limit the bot
 * carries in its El Mini skill. A generated citation that is subtly wrong is
 * worse than no citation at all on a Christian show, and Richard is the one who
 * decides what the Bible says on his programme.
 *
 * What it does instead is the genuinely useful part of the job: pairing a theme
 * people actually live with a format that suits it, and handing over the
 * questions that would open the conversation. Those questions are the episode.
 */

export type Format =
  | "conversacion"
  | "invitado"
  | "testimonio"
  | "preguntas"
  | "serie";

export const FORMATS: Record<Format, { label: string; hint: string }> = {
  conversacion: { label: "Conversación", hint: "Richard y la mesa, sin invitado." },
  invitado:     { label: "Con invitado", hint: "Alguien que vivió el tema de cerca." },
  testimonio:   { label: "Testimonio",   hint: "Una historia contada de principio a fin." },
  preguntas:    { label: "Preguntas",    hint: "Lo que manda la gente durante la semana." },
  serie:        { label: "Serie",        hint: "Un tema partido en tres o cuatro domingos." },
};

interface Theme {
  id: string;
  label: string;
  /** Titles that sound like the show, not like a sermon outline. */
  titles: string[];
  /** The questions that would actually open the conversation. */
  questions: string[];
  /** Who is worth sitting down with, described by role, never by name. */
  guest: string;
}

const THEMES: Theme[] = [
  {
    id: "trabajo",
    label: "Fe y trabajo",
    titles: [
      "Cuando el trabajo se vuelve el altar",
      "Orar por un empleo que odias",
      "¿Se puede ser honesto y seguir compitiendo?",
    ],
    questions: [
      "¿En qué momento el trabajo dejó de ser medio y se volvió identidad?",
      "¿Qué le dirías a alguien que lleva tres años en algo que no soporta?",
      "¿Cómo se ve la honestidad cuando cuesta dinero?",
    ],
    guest: "Alguien que dejó un buen puesto por convicción, o que se quedó y lo cambió desde adentro.",
  },
  {
    id: "familia",
    label: "Familia",
    titles: [
      "La fe que no se hereda",
      "Cuando tus hijos preguntan y no sabes",
      "Honrar a un padre que no estuvo",
    ],
    questions: [
      "¿Qué haces cuando tu hijo deja de creer lo que tú crees?",
      "¿Se puede honrar a alguien que hizo daño?",
      "¿Qué aprendiste de tus padres que no quieres repetir?",
    ],
    guest: "Un padre o madre con hijos adultos que tomaron otro camino.",
  },
  {
    id: "dinero",
    label: "Dinero",
    titles: [
      "Deudas y fe",
      "El diezmo cuando no alcanza",
      "¿Bendición o negocio?",
    ],
    questions: [
      "¿Qué le dices a alguien que da lo que no tiene?",
      "¿Cómo se habla de dinero en la iglesia sin que suene a venta?",
      "¿Qué cambió en tu vida cuando cambió tu relación con el dinero?",
    ],
    guest: "Alguien que salió de una deuda seria, o quien asesora a familias con sus finanzas.",
  },
  {
    id: "ansiedad",
    label: "Ansiedad y salud mental",
    titles: [
      "Orar con ansiedad",
      "¿Fe o terapia?",
      "El domingo que no quisiste levantarte",
    ],
    questions: [
      "¿Por qué en la iglesia cuesta tanto decir 'no estoy bien'?",
      "¿Qué pasa cuando orar no quita lo que sientes?",
      "¿Ir al psicólogo es falta de fe? ¿De dónde salió esa idea?",
    ],
    guest: "Un profesional de salud mental que también es creyente.",
  },
  {
    id: "duda",
    label: "Dudas",
    titles: [
      "Los que se fueron de la iglesia",
      "Preguntar sin que te miren raro",
      "Creer con preguntas encima",
    ],
    questions: [
      "¿Qué pregunta te daba miedo hacer en voz alta?",
      "¿Por qué se va la gente, de verdad?",
      "¿Qué diferencia hay entre dudar y no creer?",
    ],
    guest: "Alguien que se alejó y volvió, y puede contar las dos partes.",
  },
  {
    id: "comunidad",
    label: "Comunidad",
    titles: [
      "Ir a la iglesia sin conocer a nadie",
      "La gente que te sostuvo",
      "¿Para qué sirve una mesa?",
    ],
    questions: [
      "¿Quién apareció cuando nadie más apareció?",
      "¿Por qué es tan difícil pedir ayuda?",
      "¿Qué hace que un grupo deje de ser un grupo y sea familia?",
    ],
    guest: "Quien lidera un grupo pequeño o un ministerio de acogida.",
  },
  {
    id: "proposito",
    label: "Propósito",
    titles: [
      "¿Empujón o Espíritu?",
      "Cuando la puerta se cierra",
      "El llamado que no llegó",
    ],
    questions: [
      "¿Cómo distingues tus ganas de un llamado?",
      "¿Qué haces con un sueño que no se dio?",
      "¿Y si lo tuyo era lo ordinario?",
    ],
    guest: "Alguien que persiguió algo por años y tuvo que soltarlo.",
  },
  {
    id: "perdon",
    label: "Perdón",
    titles: [
      "Perdonar sin reconciliar",
      "Lo que no se olvida",
      "Pedir perdón tarde",
    ],
    questions: [
      "¿Perdonar obliga a volver?",
      "¿Qué haces cuando el otro no pide perdón?",
      "¿Cuánto tiempo es demasiado tarde?",
    ],
    guest: "Dos personas que se reconciliaron después de años, si aceptan contarlo.",
  },
  {
    id: "jovenes",
    label: "Jóvenes",
    titles: [
      "Crecer en la iglesia",
      "La fe de tus padres, ¿es tuya?",
      "Lo que nadie te explicó a los 20",
    ],
    questions: [
      "¿Qué te dijeron de joven que hoy sabes que era mentira?",
      "¿Cómo se hace tuya una fe que te dieron hecha?",
      "¿Qué le dirías a un muchacho de 18 hoy?",
    ],
    guest: "Un líder de jóvenes, o alguien recién salido de esa etapa.",
  },
  {
    id: "servicio",
    label: "Servir",
    titles: [
      "Cansados de servir",
      "El que siempre dice que sí",
      "Servir sin que te vean",
    ],
    questions: [
      "¿Cuándo servir dejó de darte alegría?",
      "¿Se puede decir que no en la iglesia?",
      "¿Qué se hace con el cansancio del que siempre está?",
    ],
    guest: "Alguien que se quemó sirviendo y tuvo que parar.",
  },
];


/* ------------------------------------------------------------------ */
/* English.

   Written, not translated. These are questions meant to be asked out loud on
   a bilingual show, and a dictionary pass produces sentences that are correct
   and unaskable. Keyed by theme id so a missing one falls back to Spanish
   rather than showing nothing.                                        */
/* ------------------------------------------------------------------ */

interface ThemeEn {
  label: string;
  titles: string[];
  questions: string[];
  guest: string;
}

const THEMES_EN: Record<string, ThemeEn> = {
  trabajo: {
    label: "Faith and work",
    titles: [
      "When work becomes the altar",
      "Praying about a job you hate",
      "Can you stay honest and still compete?",
    ],
    questions: [
      "When did work stop being a means and turn into who you are?",
      "What would you say to someone three years into something they can't stand?",
      "What does honesty look like when it costs you money?",
    ],
    guest: "Someone who left a good job on conviction, or stayed and changed it from inside.",
  },
  familia: {
    label: "Family",
    titles: [
      "The faith that isn't inherited",
      "When your kids ask and you don't know",
      "Honouring a father who wasn't there",
    ],
    questions: [
      "What do you do when your child stops believing what you believe?",
      "Can you honour someone who caused harm?",
      "What did you learn from your parents that you don't want to repeat?",
    ],
    guest: "A parent with grown children who took a different road.",
  },
  dinero: {
    label: "Money",
    titles: [
      "Debt and faith",
      "Tithing when it doesn't stretch",
      "Blessing or business?",
    ],
    questions: [
      "What do you say to someone giving what they don't have?",
      "How do you talk about money in church without it sounding like a sale?",
      "What changed in your life when your relationship with money changed?",
    ],
    guest: "Someone who climbed out of serious debt, or who advises families on their finances.",
  },
  ansiedad: {
    label: "Anxiety and mental health",
    titles: [
      "Praying with anxiety",
      "Faith or therapy?",
      "The Sunday you couldn't get up",
    ],
    questions: [
      "Why is it so hard to say 'I'm not okay' in church?",
      "What happens when praying doesn't take away what you feel?",
      "Is seeing a therapist a lack of faith? Where did that idea come from?",
    ],
    guest: "A mental health professional who is also a believer.",
  },
  duda: {
    label: "Doubts",
    titles: [
      "The ones who left the church",
      "Asking without getting looked at",
      "Believing with questions on top",
    ],
    questions: [
      "What question were you afraid to ask out loud?",
      "Why do people really leave?",
      "What's the difference between doubting and not believing?",
    ],
    guest: "Someone who walked away and came back, and can tell both halves.",
  },
  comunidad: {
    label: "Community",
    titles: [
      "Walking into church knowing nobody",
      "The people who held you up",
      "What is a table for?",
    ],
    questions: [
      "Who showed up when nobody else did?",
      "Why is it so hard to ask for help?",
      "What turns a group into family?",
    ],
    guest: "Whoever leads a small group or a welcome ministry.",
  },
  proposito: {
    label: "Purpose",
    titles: [
      "A push, or the Spirit?",
      "When the door closes",
      "The calling that never came",
    ],
    questions: [
      "How do you tell your own wanting from a calling?",
      "What do you do with a dream that didn't happen?",
      "What if yours was the ordinary one?",
    ],
    guest: "Someone who chased something for years and had to let it go.",
  },
  perdon: {
    label: "Forgiveness",
    titles: [
      "Forgiving without reconciling",
      "What doesn't get forgotten",
      "Apologising late",
    ],
    questions: [
      "Does forgiving mean you have to go back?",
      "What do you do when the other person never apologises?",
      "How long is too late?",
    ],
    guest: "Two people who reconciled after years, if they're willing to tell it.",
  },
  jovenes: {
    label: "Young people",
    titles: [
      "Growing up in church",
      "Your parents' faith — is it yours?",
      "What nobody explained to you at 20",
    ],
    questions: [
      "What were you told young that you now know wasn't true?",
      "How do you make a faith your own when it was handed to you finished?",
      "What would you say to an 18-year-old today?",
    ],
    guest: "A youth leader, or someone just out of that season.",
  },
  servicio: {
    label: "Serving",
    titles: [
      "Tired of serving",
      "The one who always says yes",
      "Serving where nobody sees",
    ],
    questions: [
      "When did serving stop bringing you joy?",
      "Can you say no in church?",
      "What do you do with the tiredness of always being there?",
    ],
    guest: "Someone who burned out serving and had to stop.",
  },
};

const CUSTOM_TITLES_EN = [
  "Let's talk about {t}",
  "What nobody tells you about {t}",
  "When {t} stops being easy",
  "What if {t} isn't what you thought?",
  "{t}: what we learned late",
  "The truth about {t}",
];

const CUSTOM_QUESTIONS_EN = [
  "What has been the hardest part of {t} for you?",
  "What were you told about {t} that turned out not to be true?",
  "When did {t} change for you?",
  "What would you say to someone just starting out with {t}?",
  "What part of {t} doesn't get talked about in church?",
  "How do you know when {t} has become a problem?",
  "What do you wish someone had explained to you about {t}?",
  "What gets lost when we don't talk about {t}?",
  "When was the last time {t} made you doubt?",
];

const CUSTOM_GUESTS_EN = [
  "Someone who has lived {t} up close and can tell it plainly.",
  "A person whose mind changed about {t} over the years.",
  "Someone who works with people going through {t}.",
  "Two people who see {t} differently, at the same table.",
];

export interface Idea {
  id: string;
  theme: string;
  themeId: string;
  /** The label as shown. A typed-in format lands here verbatim. */
  format: string;
  title: string;
  questions: string[];
  guest: string;
  /** True when this came from a typed topic rather than a curated theme. */
  custom?: boolean;
}

const pick = <T,>(list: T[], n: number): T => list[n % list.length];

/* ------------------------------------------------------------------ */
/* Typed-in topics.

   The curated themes above carry questions written for them specifically,
   which is why they are good. A topic Richard types has none of that, so
   these frames do the work instead: they are deliberately about the
   *person's relationship* to a subject rather than the subject itself,
   which is what makes them land on almost anything — "matrimonio",
   "redes sociales", "mudarse de país" — without knowing a thing about it.

   Still no scripture, for the same reason as everywhere else in this file. */
/* ------------------------------------------------------------------ */

const CUSTOM_TITLES = [
  "Hablemos de {t}",
  "Lo que nadie te dice sobre {t}",
  "Cuando {t} deja de ser fácil",
  "¿Y si {t} no es lo que pensabas?",
  "{t}: lo que aprendimos tarde",
  "La verdad sobre {t}",
];

const CUSTOM_QUESTIONS = [
  "¿Qué es lo que más te ha costado de {t}?",
  "¿Qué te dijeron sobre {t} que después resultó no ser cierto?",
  "¿En qué momento {t} cambió para ti?",
  "¿Qué le dirías a alguien que apenas está empezando con {t}?",
  "¿Qué parte de {t} no se habla en la iglesia?",
  "¿Cómo sabes cuándo {t} se volvió un problema?",
  "¿Qué te hubiera gustado que alguien te explicara sobre {t}?",
  "¿Qué se pierde cuando no hablamos de {t}?",
  "¿Cuándo fue la última vez que {t} te hizo dudar?",
];

const CUSTOM_GUESTS = [
  "Alguien que haya vivido {t} de cerca y pueda contarlo sin adornos.",
  "Una persona que cambió de opinión sobre {t} con los años.",
  "Alguien que trabaje con gente que pasa por {t}.",
  "Dos personas que vean {t} de forma distinta, en la misma mesa.",
];

/** Lower-cases a typed topic for mid-sentence use, unless it is a proper noun. */
function inSentence(topic: string): string {
  const t = topic.trim();
  if (!t) return t;
  // A word the person capitalised in the middle of their input is probably a
  // name or place — leave the whole thing alone rather than mangling it.
  const hasInnerCaps = /\s[A-ZÁÉÍÓÚÑ]/.test(t);
  if (hasInnerCaps) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/** Ideas for a topic that is not one of the curated themes. */
export function customIdeas(
  topic: string,
  seed: number,
  count = 6,
  formatLabel?: string,
  lang: "es" | "en" = "es",
): Idea[] {
  const en = lang === "en";
  const TITLES = en ? CUSTOM_TITLES_EN : CUSTOM_TITLES;
  const QUESTIONS = en ? CUSTOM_QUESTIONS_EN : CUSTOM_QUESTIONS;
  const GUESTS = en ? CUSTOM_GUESTS_EN : CUSTOM_GUESTS;
  const shown = topic.trim();
  const t = inSentence(shown);
  const formats = Object.keys(FORMATS) as Format[];
  const out: Idea[] = [];

  for (let i = 0; i < count; i++) {
    const n = seed + i;
    const label = formatLabel?.trim() || FORMATS[pick(formats, n * 3)].label;

    // Three different questions per idea, walking the list rather than
    // repeating the same opener six times.
    const questions = [0, 1, 2].map((k) =>
      QUESTIONS[(n * 3 + k) % QUESTIONS.length].replaceAll("{t}", t),
    );

    out.push({
      id: `custom-${n}`,
      theme: shown,
      themeId: "custom",
      format: label,
      title: pick(TITLES, n)
        .replaceAll("{t}", t)
        // A title that starts with the topic should keep its capital.
        .replace(/^(.)/, (c) => c.toUpperCase()),
      questions,
      guest: pick(GUESTS, n).replaceAll("{t}", t),
      custom: true,
    });
  }
  return out;
}

/**
 * A batch of ideas.
 *
 * `seed` rotates which theme starts the list and which title each one lands on,
 * so pressing the button again gives a genuinely different set rather than a
 * reshuffle of the same three.
 */
export function generateIdeas(
  seed: number,
  count = 6,
  format?: Format,
  themeId?: string,
  lang: "es" | "en" = "es",
): Idea[] {
  const pool = themeId ? THEMES.filter((t) => t.id === themeId) : THEMES;
  const en = lang === "en";
  const formats = Object.keys(FORMATS) as Format[];
  const out: Idea[] = [];

  for (let i = 0; i < count; i++) {
    const base = pool[(seed + i) % pool.length];
    // Fall back to Spanish when a theme has no English yet, rather than
    // rendering an empty card.
    const t = (en && THEMES_EN[base.id] ? { ...base, ...THEMES_EN[base.id] } : base) as typeof base;
    const f = format ?? pick(formats, seed + i * 3);
    out.push({
      id: `${base.id}-${f}-${seed + i}`,
      theme: t.label,
      themeId: base.id,
      format: f,
      title: pick(t.titles, seed + i),
      // Rotate which question leads, so the same theme reads differently.
      questions: t.questions
        .map((_, qi) => t.questions[(qi + seed + i) % t.questions.length]),
      guest: t.guest,
    });
  }
  return out;
}

export const THEME_LIST = THEMES.map((t) => ({ id: t.id, label: t.label }));
