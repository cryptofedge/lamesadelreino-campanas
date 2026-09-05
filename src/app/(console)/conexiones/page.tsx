"use client";

/**
 * Which accounts this console can actually reach.
 *
 * The list is derived from the platform registry, not from the rows in the
 * database. Rendering only existing rows meant a platform nobody had created a
 * row for silently disappeared from the one page whose job is saying what is
 * missing — TikTok ads vanished exactly that way. A missing row is now the
 * loudest state on the page, not the quietest.
 *
 * Deliberately blunt about the two tiers. Posting works. Buying ads needs API
 * access that is an application, not a setting.
 */
import { useQuery } from "@/lib/useQuery";
import { PLATFORMS, expectedConnections } from "@/lib/types";
import { ADAPTERS } from "@/lib/launch";
import type { Connection, Platform, PlacementKind } from "@/lib/types";
import { useLang } from "@/lib/i18n";

export default function ConnectionsPage() {
  const { t, lang } = useLang();
  const { data: rows, loading } = useQuery<Connection[]>((sb) =>
    sb.from("connections").select("*"),
  );

  // Merge what exists onto what *should* exist, so nothing can go missing.
  const merged = expectedConnections().map(({ platform, kind }) => {
    const found = (rows ?? []).find(
      (r) => r.platform === platform && r.kind === kind,
    );
    return { platform, kind, row: found ?? null };
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black tracking-tight mb-1">{t("Conexiones")}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {t("Las cuentas que este panel puede usar.")}
      </p>

      {loading && (
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          {t("Cargando…")}
        </p>
      )}

      <Section
        title={t("Publicaciones")}
        hint={t("Posts, reels y cortes. Se programan desde aquí.")}
        items={merged.filter((m) => m.kind === "organic")}
      />

      <Section
        title={t("Anuncios pagados")}
        hint={t("Para gastar dinero desde aquí hace falta permiso de cada plataforma. Se pide una vez y tarda días.")}
        items={merged.filter((m) => m.kind === "paid")}
      />
    </div>
  );
}

function Section({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: { platform: Platform; kind: PlacementKind; row: Connection | null }[];
}) {
  const { t } = useLang();
  if (items.length === 0) return null;

  return (
    <div className="mb-7">
      <h2
        className="text-sm font-bold uppercase tracking-wider mb-1"
        style={{ color: "var(--faint)" }}
      >
        {title}
      </h2>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        {hint}
      </p>

      <div className="space-y-2">
        {items.map(({ platform, kind, row }) => {
          const pf = PLATFORMS[platform];
          const connected = row?.connected ?? false;

          // Prefer the reason stored against the account; fall back to the
          // adapter's, so a platform with no row still explains itself.
          const reason =
            row?.blocked_reason ??
            (kind === "paid"
              ? ADAPTERS[platform].blocker
              : t("Todavía no se ha conectado esta cuenta."));

          return (
            <div key={`${platform}-${kind}`} className="card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: pf.color }}
                />
                <span className="font-bold text-sm">
                  {row?.account_name ?? pf.label}
                </span>
                {kind === "paid" && (
                  <span className="text-xs" style={{ color: "var(--faint)" }}>
                    · {pf.adProduct}
                  </span>
                )}
                <span
                  className="chip ml-auto"
                  style={{
                    color: connected ? "var(--green)" : "var(--amber)",
                    borderColor: "var(--line)",
                  }}
                >
                  {connected ? t("Conectada") : row ? t("Falta permiso") : t("Sin conectar")}
                </span>
              </div>

              {!connected && reason && (
                <p
                  className="text-xs mt-2 leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {reason}
                </p>
              )}

              {/* TikTok is the one platform with a route that needs no API
                  approval at all, so say so rather than leaving it looking as
                  blocked as the others. */}
              {!connected && kind === "paid" && platform === "tiktok" && (
                <p className="text-xs mt-2" style={{ color: "var(--green)" }}>
                  Mientras tanto: <strong>Promote</strong> dentro de la app de
                  TikTok impulsa un video ya publicado sin necesitar permisos.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
