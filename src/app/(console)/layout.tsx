"use client";

/**
 * Shell for every signed-in page.
 *
 * On a static host the auth check can only happen after the JavaScript loads,
 * so this shows a neutral placeholder until the profile resolves rather than
 * flashing the console at someone who is about to be redirected.
 */
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import { SessionProvider, useSession } from "@/lib/session";
import { LangProvider, useLang } from "@/lib/i18n";

// Money and account access are the owner's alone. Everything to do with
// *making* the week's content stays open to the team.
const OWNER_ONLY = ["/conexiones", "/ajustes"];

function Guard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useSession();
  const { t } = useLang();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    // A temporary password is still a password somebody else typed and sent
    // over WhatsApp. Nothing else in the console opens until it is replaced.
    if (profile.must_change_password) {
      router.replace("/cambiar-clave");
      return;
    }
    if (profile.role !== "owner" && OWNER_ONLY.some((p) => path.startsWith(p))) {
      router.replace("/campanas?denied=1");
    }
  }, [profile, loading, path, router]);

  if (loading || !profile) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <span className="text-sm" style={{ color: "var(--faint)" }}>
          {t("Cargando…")}
        </span>
      </div>
    );
  }

  // Redirects are queued but have not run yet — do not paint the console for
  // somebody on their way to the password screen, however briefly.
  if (profile.must_change_password) return null;

  // Same for the owner-only routes and the team account.
  if (profile.role !== "owner" && OWNER_ONLY.some((p) => path.startsWith(p))) {
    return null;
  }

  return (
    <>
      <Nav role={profile.role} name={profile.full_name ?? "—"} />
      <main className="p-4 max-w-[1400px] mx-auto">{children}</main>
    </>
  );
}

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LangProvider>
      <SessionProvider>
        <Guard>{children}</Guard>
      </SessionProvider>
    </LangProvider>
  );
}
