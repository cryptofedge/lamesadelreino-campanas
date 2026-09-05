/**
 * What each ad platform actually demands before it will run a campaign.
 *
 * This exists because the console was writing a brief that looked complete and
 * wasn't. Handing someone "$50, YouTube, these dates" and calling it ready is
 * how you get a campaign rejected at 11pm on a Saturday — every one of these
 * platforms has account-level requirements that are nowhere near the campaign
 * screen, and minimums that are far above what a podcast budget assumes.
 *
 * Checked against the platforms' own published requirements, September 2026.
 * They move; the date is here so a stale number is obvious rather than trusted.
 */
import type { Platform } from "./types";

export interface Minimums {
  /** Smallest daily spend the platform will accept. */
  daily: number;
  /** Smallest total the platform will accept, if it enforces one. */
  lifetime?: number;
  /** Per ad group / ad set, where that is enforced separately. */
  adGroupDaily?: number;
  note: string;
}

/**
 * The floors. These are hard rejections, not advice — under them the platform
 * refuses the campaign rather than under-delivering it.
 */
export const MINIMUMS: Partial<Record<Platform, Minimums>> = {
  facebook: {
    daily: 5,
    note: "$1/día para alcance, $5/día si optimiza por clics o conversiones.",
  },
  instagram: {
    daily: 5,
    note: "Mismo mínimo que Facebook: se compra por Meta.",
  },
  tiktok: {
    daily: 50,
    lifetime: 500,
    adGroupDaily: 20,
    note: "TikTok exige $50/día por campaña y $500 en total. Es el mínimo más alto de los tres.",
  },
  youtube: {
    daily: 10,
    note: "Google no fija un mínimo duro, pero por debajo de ~$10/día un video apenas se entrega.",
  },
};

export interface FieldSpec {
  key: string;
  label: string;
  hint: string;
  required: boolean;
}

/**
 * The account-level things each platform asks for that live nowhere near the
 * campaign form — the ones people discover they are missing halfway through.
 */
export const ACCOUNT_FIELDS: Record<
  "meta" | "google" | "tiktok",
  { label: string; fields: FieldSpec[] }
> = {
  meta: {
    label: "Meta — Facebook e Instagram",
    fields: [
      {
        key: "meta_ad_account",
        label: "ID de cuenta publicitaria",
        hint: "Empieza con act_. En Meta Business Suite → Configuración.",
        required: true,
      },
      {
        key: "meta_business_id",
        label: "ID del negocio (Business Manager)",
        hint: "Sin esto no se puede verificar el negocio ni pedir permisos.",
        required: true,
      },
      {
        key: "meta_page",
        label: "Página de Facebook",
        hint: "Meta exige una página para correr anuncios. Los de Instagram también salen de aquí.",
        required: true,
      },
      {
        key: "meta_ig",
        label: "Cuenta de Instagram",
        hint: "Debe estar conectada a la página. Si falta, los anuncios salen solo en Facebook.",
        required: false,
      },
      {
        key: "meta_pixel",
        label: "Pixel",
        hint: "Solo si algún día se mide una acción en el sitio. Para vistas no hace falta.",
        required: false,
      },
    ],
  },
  google: {
    label: "Google Ads — YouTube",
    fields: [
      {
        key: "google_customer_id",
        label: "ID de cliente",
        hint: "Los 10 dígitos arriba a la derecha en Google Ads (123-456-7890).",
        required: true,
      },
      {
        key: "google_channel",
        label: "Canal de YouTube",
        hint: "El canal debe estar enlazado a la cuenta de Google Ads antes de anunciar.",
        required: true,
      },
      {
        key: "google_payment",
        label: "Perfil de pago",
        hint: "Google no deja publicar sin método de pago cargado.",
        required: true,
      },
    ],
  },
  tiktok: {
    label: "TikTok Ads",
    fields: [
      {
        key: "tiktok_advertiser_id",
        label: "ID de anunciante",
        hint: "En TikTok Ads Manager → Cuenta.",
        required: true,
      },
      {
        key: "tiktok_identity",
        label: "Cuenta con la que se publica",
        hint: "TikTok pide una identidad: el anuncio sale como esa cuenta.",
        required: true,
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Targeting — the part the owner actually has to decide              */
/* ------------------------------------------------------------------ */

export interface Targeting {
  countries: string;
  cities: string;
  radiusMiles: number;
  ageMin: number;
  ageMax: number;
  genders: string;
  languages: string;
  /** Meta only, and legally significant — see below. */
  specialCategory: string;
}

export const DEFAULT_TARGETING: Targeting = {
  countries: "Estados Unidos, República Dominicana",
  cities: "Brooklyn NY, Queens NY, Bronx NY, Santo Domingo",
  radiusMiles: 25,
  ageMin: 25,
  ageMax: 55,
  genders: "Todos",
  languages: "Español, Inglés",
  specialCategory: "Ninguna",
};

/**
 * Meta's Special Ad Categories strip out most geographic and demographic
 * targeting when they apply — the minimum radius jumps and age/gender choices
 * are removed. Declaring the wrong one is a policy problem, not a settings
 * problem, so the choice sits with the owner rather than being guessed here.
 *
 * A church podcast is normally "Ninguna". It becomes "Temas sociales" only if
 * the ad argues a political or social position rather than inviting people to
 * an episode.
 */
export const SPECIAL_CATEGORIES = [
  "Ninguna",
  "Crédito",
  "Empleo",
  "Vivienda",
  "Temas sociales, elecciones o política",
  "Productos y servicios financieros",
];

/** Meta will not accept a radius under one mile. */
export const MIN_RADIUS_MILES = 1;

/**
 * Check a planned spend against the platform's floor.
 * Returns null when it is fine, or the reason it would be rejected.
 */
export function budgetProblem(
  platform: Platform,
  total: number | null,
  days: number,
): string | null {
  const m = MINIMUMS[platform];
  if (!m || total == null || total <= 0) return null;

  if (m.lifetime && total < m.lifetime) {
    return `${platform === "tiktok" ? "TikTok" : platform} exige al menos $${m.lifetime} en total. Tienes $${total}.`;
  }

  const perDay = days > 0 ? total / days : total;
  if (perDay < m.daily) {
    return `Son $${perDay.toFixed(0)}/día y el mínimo es $${m.daily}/día. Sube el presupuesto o acorta las fechas.`;
  }

  return null;
}
