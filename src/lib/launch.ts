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
    blocker: "X no está habilitado para anuncios en esta cuenta.",
    managerUrl: "https://ads.x.com",
  },
};

/** Human-readable audience, so the brief says something a person can act on. */
function audienceFor(c: Campaign): string {
  switch (c.goal) {
    case "attendance":
      return "Nueva York — Brooklyn, Queens, Bronx. 25-60 años. Español. Radio 25 km.";
    case "subscribers":
      return "EE.UU. y República Dominicana. 25-55 años. Español. Interés: fe, iglesia, pódcast cristianos.";
    case "awareness":
      return "EE.UU., RD, PR. 21-60 años. Español. Intereses cristianos amplios.";
    case "views":
    default:
      return "EE.UU. y RD. 25-55 años. Español. Público parecido a quien ya ve el canal.";
  }
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
): Handoff {
  const a = ADAPTERS[placement.platform];
  const p = PLATFORMS[placement.platform];

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
      ? `PRESUPUESTO: ${money(placement.budget)} en total`
      : `PUBLICAR: ${placement.run_at ?? "sin fecha"}`,
    ``,
    placement.kind === "paid" ? `PÚBLICO: ${audienceFor(campaign)}` : null,
    placement.kind === "paid" ? `OBJETIVO: ${objectiveFor(campaign)}` : null,
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
