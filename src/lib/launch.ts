/**
 * Getting a placement out of this console and onto a platform.
 *
 * There are two honest tiers here, and the UI says which one you are on rather
 * than pretending they are the same thing:
 *
 *   ORGANIC  — a post. Fully automatable today through a scheduler that already
 *              holds the account tokens (Postiz, which the bot already knows).
 *
 *   PAID     — an ad. Spending money through Meta, Google or TikTok needs
 *              approved API access: a Google Ads developer token, Meta App
 *              Review plus Business verification, TikTok Ads API approval.
 *              Those are applications against Richard's own business accounts
 *              and take days to weeks. No amount of code shortens them.
 *
 * Until those land, `handoff()` produces everything a human needs to create the
 * ad in under a minute: a deep link that opens the right ad manager on the
 * right screen, plus a brief with the copy, budget, dates and targeting already
 * written. The work of *deciding* the campaign happens here; only the final
 * click happens there.
 *
 * When a token does arrive, implement `submit()` for that adapter. Nothing else
 * in the app has to change — which is the entire reason this file exists
 * instead of the deep links being sprinkled through the components.
 */
import type { Campaign, Episode, Placement, Platform } from "./types";
import { PLATFORMS, money } from "./types";
import { ACCOUNT_FIELDS, budgetProblem } from "./platform-specs";

export interface Handoff {
  /** Opens the ad manager as deep as the platform allows without an API. */
  url: string;
  /** Paste-ready. Everything the ad needs, already decided. */
  brief: string;
  /** What is still required before this becomes a real one-click launch. */
  blocker: string | null;
}

interface Adapter {
  /** False until the platform's API access is approved for this account. */
  apiReady: boolean;
  blocker: string | null;
  managerUrl: string;
  /** Implement when apiReady flips true. */
  submit?: (p: Placement, c: Campaign, e: Episode) => Promise<string>;
}

/**
 * Deliberately data, not code. Flipping one of these to true is the whole
 * change when access is granted, and it is reviewable at a glance.
 */
export const ADAPTERS: Record<Platform, Adapter> = {
  facebook: {
    apiReady: false,
    blocker:
      "Meta Marketing API: falta App Review + verificación del negocio (permiso ads_management).",
    managerUrl: "https://adsmanager.facebook.com/adsmanager/manage/campaigns",
  },
  instagram: {
    apiReady: false,
    // Instagram ads are bought through Meta's ads manager, same app, same review.
    blocker:
      "Meta Marketing API: los anuncios de Instagram se compran por Meta, mismo App Review.",
    managerUrl: "https://adsmanager.facebook.com/adsmanager/manage/campaigns",
  },
  youtube: {
    apiReady: false,
    blocker:
      "Google Ads API: falta developer token aprobado (nivel básico) en la cuenta de administrador.",
    managerUrl: "https://ads.google.com/aw/campaigns",
  },
  tiktok: {
    apiReady: false,
    // TikTok is the one platform with a no-approval route: Promote boosts an
    // already-published video from inside the phone app. Worth naming, because
    // it is genuinely the fastest way to put money behind a clip this week.
    blocker:
      "TikTok Ads API: falta aprobación de la app en TikTok for Business. Alternativa sin permisos: usa Promote dentro de la app sobre el video ya publicado.",
    managerUrl: "https://ads.tiktok.com/i18n/perf/campaign",
  },
  x: {
    apiReady: false,
    blocker:
      "X Ads: hace falta una cuenta de anunciante en ads.x.com y método de pago. La API pide acceso aparte.",
    managerUrl: "https://ads.x.com",
  },
};

/**
 * The saved settings, as the brief needs them.
 *
 * These used to be four hardcoded sentences, which meant every campaign claimed
 * a location nobody had chosen — the one thing on the whole brief that has to
 * be right, invented. Now it comes from Ajustes.
 */
export interface BriefSettings {
  countries?: string;
  cities?: string;
  radiusMiles?: string;
  ageMin?: string;
  ageMax?: string;
  genders?: string;
  languages?: string;
  specialCategory?: string;
  [k: string]: string | undefined;
}

function audienceLines(s: BriefSettings, c: Campaign): string[] {
  const local = c.goal === "attendance";

  // Pinned points, with coordinates. Every ad manager takes a lat/lng and a
  // radius directly, which is exact in a way "Brooklyn NY" never is.
  let pinLines: string[] = [];
  try {
    const pins = JSON.parse(s.map_pins || "[]") as {
      name: string;
      lat: number;
      lng: number;
      radiusMiles: number;
    }[];
    if (Array.isArray(pins) && pins.length) {
      pinLines = [
        "PUNTOS EN EL MAPA:",
        ...pins.map(
          (p) =>
            `  ${p.name} — ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} · radio ${p.radiusMiles} millas`,
        ),
      ];
    }
  } catch {
    // A malformed value must not take the brief down with it.
  }

  return [
    `PAÍSES: ${s.countries || "(sin definir — ponlo en Ajustes)"}`,
    `CIUDADES: ${s.cities || "(sin definir)"}${
      s.radiusMiles ? ` · radio ${s.radiusMiles} millas` : ""
    }`,
    ...pinLines,
    local ? "NOTA: es un evento — deja solo las ciudades cercanas." : "",
    `EDAD: ${s.ageMin || "25"}-${s.ageMax || "55"}`,
    `GÉNERO: ${s.genders || "Todos"}`,
    `IDIOMAS: ${s.languages || "Español"}`,
    s.specialCategory && s.specialCategory !== "Ninguna"
      ? `CATEGORÍA ESPECIAL DE META: ${s.specialCategory} — Meta va a limitar el targeting por edad y zona.`
      : "",
  ].filter(Boolean);
}

/** The account ids that platform needs, and which are still blank. */
function accountLines(s: BriefSettings, platform: Platform): string[] {
  const group =
    platform === "youtube"
      ? "google"
      : platform === "tiktok"
        ? "tiktok"
        : platform === "x"
          ? "x"
          : "meta";
  const spec = ACCOUNT_FIELDS[group];
  const out: string[] = [`CUENTA (${spec.label}):`];
  for (const f of spec.fields) {
    const val = s[f.key];
    if (val) out.push(`  ${f.label}: ${val}`);
    else if (f.required) out.push(`  ${f.label}: ⚠ FALTA — sin esto no se puede publicar`);
  }
  return out;
}

/**
 * The campaign objective, in the words each ad manager actually uses — so it
 * can be picked from their dropdown without translating anything.
 */
function objectiveFor(c: Campaign): string {
  switch (c.goal) {
    case "attendance":
      return "Tráfico / alcance local";
    case "subscribers":
      return "Reproducciones de video + suscripciones al canal";
    case "awareness":
      return "Reconocimiento de marca / alcance";
    case "views":
    default:
      return "Reproducciones de video";
  }
}

export function handoff(
  placement: Placement,
  campaign: Campaign,
  episode: Episode,
  settings: BriefSettings = {},
): Handoff {
  const a = ADAPTERS[placement.platform];
  const p = PLATFORMS[placement.platform];

  // Days the money is spread over — the platforms police a *daily* floor, so a
  // total that looks generous can still be rejected once it is divided up.
  const days = Math.max(
    1,
    Math.round(
      (new Date(campaign.ends_at).getTime() - new Date(campaign.starts_at).getTime()) /
        86400000,
    ),
  );
  const shortfall =
    placement.kind === "paid"
      ? budgetProblem(placement.platform, placement.budget, days)
      : null;

  const lines = [
    `CAMPAÑA: ${campaign.name}`,
    `PLATAFORMA: ${p.label} — ${placement.kind === "paid" ? "PAGADO" : "ORGÁNICO"}`,
    ``,
    `EPISODIO: #${episode.number} — ${episode.title}`,
    episode.guest ? `INVITADO: ${episode.guest}` : null,
    episode.youtube_url ? `ENLACE: ${episode.youtube_url}` : null,
    ``,
    `FECHAS: ${campaign.starts_at} → ${campaign.ends_at}`,
    placement.kind === "paid"
      ? `PRESUPUESTO: ${money(placement.budget)} en total${
          days > 0 ? ` · ${days} días · ~$${(Number(placement.budget ?? 0) / days).toFixed(0)}/día` : ""
        }`
      : `PUBLICAR: ${placement.run_at ?? "sin fecha"}`,
    placement.kind === "paid" && shortfall ? `⚠ ${shortfall}` : null,
    ``,
    ...(placement.kind === "paid" ? audienceLines(settings, campaign) : []),
    placement.kind === "paid" ? `OBJETIVO: ${objectiveFor(campaign)}` : null,
    ``,
    ...(placement.kind === "paid" ? accountLines(settings, placement.platform) : []),
    ``,
    `TEXTO:`,
    placement.copy || "(sin texto)",
    ``,
    placement.creative_url ? `CREATIVO: ${placement.creative_url}` : `CREATIVO: (falta subir)`,
  ].filter((l) => l !== null);

  return {
    url: a.managerUrl,
    brief: lines.join("\n"),
    blocker: placement.kind === "paid" ? a.blocker : null,
  };
}

/** True when every paid platform in use can actually be launched by API. */
export function fullyAutomatable(placements: Placement[]): boolean {
  return placements
    .filter((p) => p.kind === "paid")
    .every((p) => ADAPTERS[p.platform].apiReady);
}
