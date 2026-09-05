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

export interface Idea {
  id: string;
  theme: string;
  themeId: string;
  format: Format;
  title: string;
  questions: string[];
  guest: string;
}

const pick = <T,>(list: T[], n: number): T => list[n % list.length];

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
): Idea[] {
  const pool = themeId ? THEMES.filter((t) => t.id === themeId) : THEMES;
  const formats = Object.keys(FORMATS) as Format[];
  const out: Idea[] = [];

  for (let i = 0; i < count; i++) {
    const t = pool[(seed + i) % pool.length];
    const f = format ?? pick(formats, seed + i * 3);
    out.push({
      id: `${t.id}-${f}-${seed + i}`,
      theme: t.label,
      themeId: t.id,
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
