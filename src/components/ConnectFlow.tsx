"use client";

/**
 * "Connect this account."
 *
 * What this is NOT: a button that drives someone's browser. A page cannot click
 * around inside Instagram or Meta — the same-origin policy exists precisely to
 * stop that — and it cannot see whether you are signed in elsewhere. Nor can the
 * bot do it: its browser would run in a datacenter with none of Richard's
 * cookies, so it would need his passwords and 2FA on a shared server, and Meta
 * and TikTok lock accounts that sign in from datacenter IPs.
 *
 * What it IS, and what actually uses the fact that they are logged in: a deep
 * link straight to the screen that does the job, in *their* browser, where the
 * session already exists — plus the two or three steps to follow once there, and
 * somewhere to paste back the id the console needs.
 *
 * The day a backend exists to hold an OAuth secret, this becomes a real
 * one-click connect. The steps below are what that replaces.
 */
import { useState } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { useLang } from "@/lib/i18n";
import type { Platform, PlacementKind } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";

/**
 * Set NEXT_PUBLIC_OAUTH_URL once the Edge Function is deployed (see
 * backend/SETUP.md) and the organic platforms switch from a guided checklist
 * to a real one-click connect. Until then the steps below are the fallback,
 * and they are the thing the OAuth replaces.
 */
const OAUTH_URL = process.env.NEXT_PUBLIC_OAUTH_URL ?? "";

/** Which OAuth provider owns each platform. Meta covers two. */
const PROVIDER: Partial<Record<Platform, string>> = {
  facebook: "meta",
  instagram: "meta",
  youtube: "google",
  tiktok: "tiktok",
};

interface Guide {
  /** Opens as deep as the platform allows without an API. */
  url: string;
  steps: string[];
  /** The value to bring back, when there is one. */
  field?: { key: string; label: string; placeholder: string };
}

/**
 * Deliberately data. Every one of these was chosen to land on the screen that
 * does the job, not on a homepage the person then has to navigate out of.
 */
const GUIDES: Record<string, Guide> = {
  "facebook:organic": {
    url: "https://business.facebook.com/settings/pages",
    steps: [
      "Escoge la página de La Mesa del Reino.",
      "Confirma que tu cuenta aparece como administrador.",
      "Copia el nombre exacto de la página.",
    ],
    field: { key: "meta_page", label: "Página de Facebook", placeholder: "La Mesa del Reino" },
  },
  "instagram:organic": {
    url: "https://business.facebook.com/settings/instagram-account",
    steps: [
      "Toca “Agregar” si la cuenta no aparece.",
      "Entra con la cuenta del programa y confirma.",
      "Debe quedar conectada a la página de Facebook.",
    ],
    field: { key: "meta_ig", label: "Cuenta de Instagram", placeholder: "@lamesadelreino" },
  },
  "youtube:organic": {
    url: "https://studio.youtube.com",
    steps: [
      "Arriba a la derecha, confirma que estás en el canal correcto.",
      "Ajustes → Canal → Configuración avanzada.",
      "Copia el ID del canal.",
    ],
    field: { key: "google_channel", label: "Canal de YouTube", placeholder: "La Mesa del Reino" },
  },
  "tiktok:organic": {
    url: "https://www.tiktok.com/setting",
    steps: [
      "Confirma que estás en la cuenta del programa.",
      "Si es cuenta personal, cámbiala a Business.",
      "Copia el usuario.",
    ],
    field: { key: "tiktok_identity", label: "Cuenta de TikTok", placeholder: "@lamesadelreino" },
  },
  "x:organic": {
    url: "https://x.com/settings/account",
    steps: ["Confirma que estás en la cuenta del programa.", "Copia el usuario."],
    field: { key: "x_handle", label: "Cuenta de X", placeholder: "@lamesadelreino" },
  },

  /* ---- Paid. These open the ad manager, which is as far as anything
     without approved API access can go. ---- */
  "facebook:paid": {
    url: "https://business.facebook.com/settings/ad-accounts",
    steps: [
      "Escoge la cuenta publicitaria (empieza con act_).",
      "Copia el ID.",
      "Si no hay ninguna, créala aquí mismo.",
    ],
    field: { key: "meta_ad_account", label: "ID de cuenta publicitaria", placeholder: "act_123456789" },
  },
  "instagram:paid": {
    url: "https://business.facebook.com/settings/ad-accounts",
    steps: [
      "Los anuncios de Instagram salen de la misma cuenta de Meta.",
      "Si Facebook ya está conectado, esto queda hecho.",
    ],
  },
  "youtube:paid": {
    url: "https://ads.google.com/aw/overview",
    steps: [
      "Arriba a la derecha está el ID de cliente, 10 dígitos.",
      "Herramientas → Cuentas vinculadas → enlaza el canal de YouTube.",
      "Facturación → confirma que hay método de pago.",
    ],
    field: { key: "google_customer_id", label: "ID de cliente", placeholder: "123-456-7890" },
  },
  "tiktok:paid": {
    url: "https://ads.tiktok.com/i18n/account",
    steps: [
      "Copia el ID de anunciante.",
      "Ajustes → Identidad → autoriza la cuenta del programa.",
    ],
    field: { key: "tiktok_advertiser_id", label: "ID de anunciante", placeholder: "7012345678901234567" },
  },
  "x:paid": {
    url: "https://ads.x.com",
    steps: [
      "Si nunca has anunciado, X te pide crear la cuenta de anunciante aquí.",
      "Agrega método de pago.",
    ],
    field: { key: "x_account", label: "Cuenta de anunciante", placeholder: "@lamesadelreino" },
  },
};

export default function ConnectFlow({
  platform,
  kind,
  connected,
  onSaved,
}: {
  platform: Platform;
  kind: PlacementKind;
  connected: boolean;
  onSaved?: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const guide = GUIDES[`${platform}:${kind}`];
  const pf = PLATFORMS[platform];
  if (!guide) return null;

  // Real OAuth only exists for posting. Buying ads needs a separate approval
  // on every platform, so a paid row keeps the manual route even once the
  // function is live — see backend/SETUP.md.
  const provider = kind === "organic" ? PROVIDER[platform] : undefined;
  const oneClick = Boolean(OAUTH_URL && provider);

  async function confirm() {
    setBusy(true);
    const sb = browserClient();

    // Store whatever id they brought back, so the campaign brief stops saying
    // it is missing.
    if (guide.field && value.trim()) {
      await sb.from("settings").upsert([{ key: guide.field.key, value: value.trim() }]);
    }

    await sb.from("connections").upsert([
      {
        id: `cx-${platform}-${kind === "paid" ? "p" : "o"}`,
        platform,
        kind,
        account_name: value.trim() || pf.label,
        // Organic is genuinely usable once the account is identified. Paid is
        // not — that still waits on the platform's API approval — so this
        // records the account without claiming it can spend.
        connected: kind === "organic",
        blocked_reason: kind === "organic" ? null : undefined,
        last_checked: new Date().toISOString(),
      },
    ]);

    setBusy(false);
    setDone(true);
    setOpen(false);
    onSaved?.();
  }

  if (connected) return null;

  // The whole flow collapses to a single link when the backend is there.
  if (oneClick) {
    return (
      <div className="mt-3">
        <a
          href={`${OAUTH_URL}/start?platform=${provider}`}
          className="inline-block text-xs px-3 py-1.5 rounded-full font-semibold"
          style={{ background: "var(--brass)", color: "#17130a" }}
        >
          {t("Conectar")} {pf.label}
        </a>
        <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
          {t("Te lleva a la plataforma, apruebas, y vuelves conectado.")}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-3 py-1.5 rounded-full font-semibold"
        style={{ background: open ? "var(--surface-3)" : "var(--brass)", color: open ? "var(--text)" : "#17130a" }}
        aria-expanded={open}
      >
        {done ? t("Guardado ✓") : open ? t("Ocultar") : t("Conectar")}
      </button>

      {open && (
        <div
          className="mt-3 p-3 rounded-xl"
          style={{ background: "var(--ink)", border: "1px solid var(--line)" }}
        >
          <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--muted)" }}>
            {t("Se abre en tu navegador, donde ya estás con la sesión iniciada. Sigue los pasos y vuelve aquí.")}
          </p>

          <a
            href={guide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs px-3 py-1.5 rounded-full font-semibold mb-3"
            style={{ background: "var(--brass)", color: "#17130a" }}
          >
            {t("Abrir")} {pf.label} ↗
          </a>

          <ol className="space-y-1.5 mb-3">
            {guide.steps.map((s, i) => (
              <li key={i} className="text-xs flex gap-2 leading-relaxed">
                <span
                  className="shrink-0 w-4 h-4 rounded-full grid place-items-center text-[10px] font-bold"
                  style={{ background: "var(--surface-3)", color: "var(--brass)" }}
                >
                  {i + 1}
                </span>
                <span style={{ color: "var(--text)" }}>{t(s)}</span>
              </li>
            ))}
          </ol>

          {guide.field && (
            <>
              <label
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--faint)" }}
              >
                {t(guide.field.label)}
              </label>
              <input
                value={value}
                placeholder={guide.field.placeholder}
                onChange={(e) => setValue(e.target.value)}
                className="mb-3"
              />
            </>
          )}

          <button
            onClick={() => void confirm()}
            disabled={busy || (!!guide.field && !value.trim())}
            className="text-xs px-3 py-1.5 rounded-full font-semibold disabled:opacity-50"
            style={{ background: "var(--green)", color: "#06301a" }}
          >
            {busy ? t("Guardando…") : t("Ya está listo")}
          </button>

          {kind === "paid" && (
            <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--amber)" }}>
              {t("Esto guarda la cuenta, pero gastar desde aquí sigue esperando el permiso de la plataforma.")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
