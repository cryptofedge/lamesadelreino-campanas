"use client";

/**
 * The console's one navigation surface.
 *
 * Deliberately flat — five destinations, no nesting. The whole promise of this
 * tool is "one place instead of five tabs", which a menu that needs exploring
 * would immediately undercut.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/session";
import { useLang } from "@/lib/i18n";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const LINKS: { href: string; label: string; ownerOnly?: boolean }[] = [
  { href: "/campanas", label: "Campañas" },
  { href: "/ideas", label: "Ideas" },
  { href: "/generador", label: "Generador" },
  { href: "/episodios", label: "Episodios" },
  { href: "/calendario", label: "Calendario" },
  { href: "/analiticas", label: "Analíticas" },
  { href: "/conexiones", label: "Conexiones", ownerOnly: true },
  { href: "/ajustes", label: "Ajustes", ownerOnly: true },
];

export default function Nav({ role, name }: { role: Role; name: string }) {
  const path = usePathname();
  const { signOut } = useSession();
  const { lang, setLang, t } = useLang();

  const links = LINKS.filter((l) => !l.ownerOnly || role === "owner");

  return (
    <header
      className="sticky top-0 z-20 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center gap-3 h-14">
          {/* The mark is a 120px source image — shown at 32px it stays crisp.
              Never scale it up. */}
          <img
            src={`${BASE}/logo.jpg`}
            alt="La Mesa del Reino"
            width={120}
            height={120}
            className="h-8 w-8 rounded-lg shrink-0"
          />
          <div className="min-w-0 mr-auto">
            <div className="font-bold text-sm leading-tight truncate">
              La Mesa del Reino
            </div>
            <div
              className="text-[11px] leading-tight truncate"
              style={{ color: "var(--faint)" }}
            >
              {name} · {role === "owner" ? t("Dueño") : t("Equipo")}
            </div>
          </div>

          {/* Shows the language you would switch TO, which is the one thing
              a two-state toggle must never leave ambiguous. */}
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="text-xs px-2.5 py-1.5 rounded-full border shrink-0 font-bold"
            style={{ borderColor: "var(--line-warm)", color: "var(--brass)" }}
            title={lang === "es" ? "Switch to English" : "Cambiar a español"}
          >
            {lang === "es" ? "EN" : "ES"}
          </button>

          <button
            onClick={() => void signOut()}
            className="text-xs px-3 py-1.5 rounded-full border shrink-0"
            style={{ borderColor: "var(--line)", color: "var(--muted)" }}
          >
            {t("Salir")}
          </button>
        </div>

        {/* Scrolls sideways on a phone rather than wrapping into two rows and
            shoving the page content down. */}
        <nav className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-2">
          {links.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
                style={{
                  background: on ? "var(--brass)" : "transparent",
                  color: on ? "#17130a" : "var(--muted)",
                }}
              >
                {t(l.label)}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
