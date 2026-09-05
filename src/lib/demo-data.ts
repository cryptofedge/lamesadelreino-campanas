/**
 * Fixtures for the demo build.
 *
 * Dates are computed relative to today rather than hardcoded, so the demo never
 * degrades into a screen full of last year's campaigns — the whole point of
 * handing someone a link is that it looks like their real week.
 */

const DAY = 86400000;
const at = (offsetDays: number, hour = 19) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const day = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

export const DEMO_USERS = [
  {
    id: "u-richard",
    email: "richard@lamesadelreino.com",
    password: "demo1234",
    full_name: "Richard",
    role: "owner" as const,
  },
  {
    id: "u-editor",
    email: "equipo@lamesadelreino.com",
    password: "demo1234",
    full_name: "Equipo",
    role: "editor" as const,
  },
];

/* The show goes out Sundays. Everything below is timed against that, because a
   campaign that does not know when the episode drops is just a calendar. */

const episodes = [
  {
    id: "ep-48",
    number: 48,
    title: "¿Empujón o Espíritu?",
    guest: "Pastor Elías Núñez",
    recorded_at: at(-9, 15),
    publish_at: at(-7, 19),
    youtube_url: "https://youtube.com/watch?v=demo48",
    thumbnail_url: null,
    notes: "El que más se ha compartido. Buen material para cortes.",
  },
  {
    id: "ep-49",
    number: 49,
    title: "La mesa que nadie ve",
    guest: null,
    recorded_at: at(-2, 15),
    publish_at: at(0, 19),
    youtube_url: "https://youtube.com/watch?v=demo49",
    thumbnail_url: null,
    notes: "Episodio solo, sin invitado.",
  },
  {
    id: "ep-50",
    number: 50,
    title: "Cincuenta domingos",
    guest: "Hna. Carmen Objío",
    recorded_at: at(5, 15),
    publish_at: at(7, 19),
    youtube_url: null,
    thumbnail_url: null,
    notes: "Episodio 50. Vale la pena meterle presupuesto.",
  },
];

const campaigns = [
  {
    id: "c-48",
    episode_id: "ep-48",
    name: "Ep. 48 — ¿Empujón o Espíritu?",
    goal: "views",
    status: "done",
    budget_total: 120,
    starts_at: day(-8),
    ends_at: day(-3),
    created_by: "u-richard",
    approved_by_name: "Richard",
    created_at: at(-10),
  },
  {
    id: "c-49",
    episode_id: "ep-49",
    name: "Ep. 49 — La mesa que nadie ve",
    goal: "views",
    status: "active",
    budget_total: 100,
    starts_at: day(-1),
    ends_at: day(4),
    created_by: "u-richard",
    approved_by_name: "Richard",
    created_at: at(-3),
  },
  {
    id: "c-50",
    episode_id: "ep-50",
    name: "Ep. 50 — Cincuenta domingos",
    goal: "subscribers",
    status: "draft",
    budget_total: 250,
    starts_at: day(5),
    ends_at: day(12),
    created_by: "u-richard",
    approved_by_name: null,
    created_at: at(-1),
  },
];

const placements = [
  /* ---- Episode 48: finished, so it has real numbers to show ---- */
  {
    id: "p-48-yt", campaign_id: "c-48", platform: "youtube", kind: "paid",
    status: "finished", budget: 60, run_at: at(-8),
    copy: "¿Es empuje tuyo o es Dios? Episodio completo, domingo.",
    creative_url: "thumb-48.jpg", external_id: "gads-8841",
    reach: 24800, clicks: 1120, spend: 60,
  },
  {
    id: "p-48-ig", campaign_id: "c-48", platform: "instagram", kind: "paid",
    status: "finished", budget: 60, run_at: at(-8),
    copy: "A veces confundimos las ganas con el llamado. 🎙️ Ep. 48",
    creative_url: "reel-48-01.mp4", external_id: "meta-77213",
    reach: 18400, clicks: 640, spend: 60,
  },
  {
    id: "p-48-fb", campaign_id: "c-48", platform: "facebook", kind: "organic",
    status: "posted", budget: null, run_at: at(-7),
    copy: "Nuevo episodio ya disponible. Comenta qué te pareció. 👇",
    creative_url: "thumb-48.jpg", external_id: "fb-post-9912",
    reach: 3100, clicks: 210, spend: null,
  },

  /* ---- Episode 49: running right now ---- */
  {
    id: "p-49-yt", campaign_id: "c-49", platform: "youtube", kind: "paid",
    status: "live", budget: 70, run_at: at(-1),
    copy: "Hay una mesa que nadie ve. Episodio 49, ya disponible.",
    creative_url: "thumb-49.jpg", external_id: "gads-9002",
    reach: 9400, clicks: 380, spend: 31,
  },
  {
    id: "p-49-tt", campaign_id: "c-49", platform: "tiktok", kind: "organic",
    status: "posted", budget: null, run_at: at(0),
    copy: "El minuto que más nos escribieron esta semana. #fe #podcast",
    creative_url: "clip-49-01.mp4", external_id: "tt-4471",
    reach: 12600, clicks: 540, spend: null,
  },
  {
    id: "p-49-x", campaign_id: "c-49", platform: "x", kind: "paid",
    status: "live", budget: 30, run_at: at(-1),
    copy: "La mesa que nadie ve — ep. 49. Míralo completo. #LaMesaDelReino",
    creative_url: null, external_id: "x-2210",
    reach: 4100, clicks: 190, spend: 12,
  },
  {
    id: "p-49-ig", campaign_id: "c-49", platform: "instagram", kind: "organic",
    status: "queued", budget: null, run_at: at(2),
    copy: "Corte del domingo. ¿Te ha pasado?",
    creative_url: "clip-49-02.mp4", external_id: null,
    reach: null, clicks: null, spend: null,
  },

  /* ---- Episode 50: still a draft, nothing has left the building ---- */
  {
    id: "p-50-yt", campaign_id: "c-50", platform: "youtube", kind: "paid",
    status: "draft", budget: 120, run_at: at(5),
    copy: "50 domingos sentados a la misma mesa. Gracias por estar.",
    creative_url: null, external_id: null,
    reach: null, clicks: null, spend: null,
  },
  {
    id: "p-50-ig", campaign_id: "c-50", platform: "instagram", kind: "paid",
    status: "draft", budget: 80, run_at: at(5),
    copy: "Episodio 50. Un año de mesa, de gente y de fe.",
    creative_url: null, external_id: null,
    reach: null, clicks: null, spend: null,
  },
  {
    id: "p-50-tt", campaign_id: "c-50", platform: "tiktok", kind: "paid",
    status: "draft", budget: 50, run_at: at(6),
    copy: "Llegamos a 50. 🎙️",
    creative_url: null, external_id: null,
    reach: null, clicks: null, spend: null,
  },
  {
    id: "p-50-fb", campaign_id: "c-50", platform: "facebook", kind: "organic",
    status: "draft", budget: null, run_at: at(7),
    copy: "Hoy es el episodio 50. Nos vemos a las 7.",
    creative_url: null, external_id: null,
    reach: null, clicks: null, spend: null,
  },
];

/* Two of these are deliberately not connected. A console that shows every
   integration as a green tick teaches people to stop reading it. */
const connections = [
  {
    id: "cx-yt-o", platform: "youtube", kind: "organic",
    account_name: "La Mesa del Reino", connected: true,
    blocked_reason: null, last_checked: at(0, 8),
  },
  {
    id: "cx-ig-o", platform: "instagram", kind: "organic",
    account_name: "@lamesadelreino", connected: true,
    blocked_reason: null, last_checked: at(0, 8),
  },
  {
    id: "cx-fb-o", platform: "facebook", kind: "organic",
    account_name: "La Mesa del Reino", connected: true,
    blocked_reason: null, last_checked: at(0, 8),
  },
  {
    id: "cx-tt-o", platform: "tiktok", kind: "organic",
    account_name: "@lamesadelreino", connected: true,
    blocked_reason: null, last_checked: at(0, 8),
  },
  {
    id: "cx-meta-p", platform: "facebook", kind: "paid",
    account_name: "Meta Ads — La Mesa del Reino", connected: false,
    blocked_reason:
      "Falta App Review y verificación del negocio en Meta. Se solicita una vez y tarda días.",
    last_checked: at(0, 8),
  },
  {
    id: "cx-gads-p", platform: "youtube", kind: "paid",
    account_name: "Google Ads — La Mesa del Reino", connected: false,
    blocked_reason:
      "Falta el developer token aprobado de Google Ads en la cuenta de administrador.",
    last_checked: at(0, 8),
  },
  {
    id: "cx-ig-p", platform: "instagram", kind: "paid",
    account_name: "Meta Ads — Instagram", connected: false,
    blocked_reason:
      "Los anuncios de Instagram se compran por Meta: mismo App Review que Facebook.",
    last_checked: at(0, 8),
  },
  {
    id: "cx-x-p", platform: "x", kind: "paid",
    account_name: "X Ads — La Mesa del Reino", connected: false,
    blocked_reason:
      "Falta crear la cuenta de anunciante en ads.x.com y cargar método de pago.",
    last_checked: at(0, 8),
  },
  {
    id: "cx-x-o", platform: "x", kind: "organic",
    account_name: "@lamesadelreino", connected: true,
    blocked_reason: null, last_checked: at(0, 8),
  },
  {
    id: "cx-tt-p", platform: "tiktok", kind: "paid",
    account_name: "TikTok Ads — La Mesa del Reino", connected: false,
    blocked_reason:
      "Falta aprobación de la app en TikTok for Business para comprar anuncios desde aquí.",
    last_checked: at(0, 8),
  },
];

const profiles = DEMO_USERS.map((u) => ({
  id: u.id,
  full_name: u.full_name,
  role: u.role,
  active: true,
  must_change_password: false,
}));

export const seed = {
  episodes,
  campaigns,
  placements,
  connections,
  profiles,
  ideas: [] as Record<string, unknown>[],
  settings: [
    { key: "weekly_budget", value: "100" },
    { key: "show_day", value: "domingo" },
    { key: "show_time", value: "19:00" },
  ],
};
