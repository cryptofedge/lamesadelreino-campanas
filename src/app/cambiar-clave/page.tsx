"use client";

/**
 * First sign-in: replace the temporary password.
 *
 * The account is handed out with a password somebody else has typed and very
 * likely sent over WhatsApp, so for a while it is not really Richard's account.
 * This is what closes that window: the console will not go anywhere until the
 * password has been replaced.
 *
 * It is a convenience gate, not a security boundary — the JavaScript can be
 * skipped. What cannot be skipped is Row Level Security. The point is to make
 * the temporary password stop working, not to fence off pages.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { SessionProvider, useSession } from "@/lib/session";
import { LangProvider, useLang } from "@/lib/i18n";

const MIN = 8;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function Form() {
  const router = useRouter();
  const { t } = useLang();
  const { profile, refresh, signOut } = useSession();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) return setError(t("Escribe tu nombre."));
    if (pass.length < MIN)
      return setError(t("La contraseña debe tener al menos 8 caracteres."));
    if (pass !== again) return setError(t("Las dos contraseñas no son iguales."));

    setBusy(true);
    const sb = browserClient();

    const { error: upErr } = await sb.auth.updateUser({ password: pass });
    if (upErr) {
      // Supabase rejects a password identical to the current one, which is
      // exactly the case worth catching — otherwise somebody "changes" the
      // temporary password to itself and the flag clears anyway.
      setError(
        upErr.message.toLowerCase().includes("different")
          ? t("Escoge una contraseña distinta a la temporal.")
          : t("No se pudo cambiar la contraseña. Intenta de nuevo."),
      );
      setBusy(false);
      return;
    }

    // Only clear the flag once the password actually changed. Doing it first
    // would leave an account marked done with the temporary password still live.
    const { error: rpcErr } = await sb.rpc("complete_first_login", {
      p_full_name: name.trim(),
    });
    if (rpcErr) {
      setError(t("La contraseña se cambió, pero no pudimos guardar el estado. Vuelve a entrar."));
      setBusy(false);
      return;
    }

    await refresh();
    router.replace("/campanas");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl p-8 sm:p-10 border"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <img
          src={`${BASE}/logo.jpg`}
          alt="La Mesa del Reino"
          width={120}
          height={120}
          className="mx-auto mb-5 h-20 w-20 rounded-2xl"
        />

        <h1 className="font-black text-2xl tracking-tight mb-2 text-center">
          {t("Configura tu cuenta")}
        </h1>
        <p className="text-sm mb-7 text-center" style={{ color: "var(--muted)" }}>
          {t("Entraste con una contraseña temporal. Escoge tu nombre y una contraseña tuya para seguir — nadie más la va a saber.")}
        </p>

        <Label>{t("Tu nombre")}</Label>
        <input
          type="text"
          value={name}
          required
          maxLength={60}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          className="mb-5"
        />

        <Label>{t("Nueva contraseña")}</Label>
        <input
          type="password"
          value={pass}
          required
          minLength={MIN}
          autoComplete="new-password"
          onChange={(e) => setPass(e.target.value)}
          className="mb-5"
        />

        <Label>{t("Repítela")}</Label>
        <input
          type="password"
          value={again}
          required
          minLength={MIN}
          autoComplete="new-password"
          onChange={(e) => setAgain(e.target.value)}
          className="mb-2"
        />

        <p className="text-xs mb-6" style={{ color: "var(--faint)" }}>
          {t("Mínimo 8 caracteres. Usa algo que no uses en otro sitio.")}
        </p>

        {error && (
          <p className="text-sm mb-4" style={{ color: "var(--red)" }} role="alert">
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className="w-full py-3 rounded-full font-bold text-base disabled:opacity-50"
          style={{ background: "var(--brass)", color: "#17130a" }}
        >
          {busy ? t("Guardando…") : t("Guardar y entrar")}
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full mt-3 py-2 text-sm"
          style={{ color: "var(--faint)" }}
        >
          {t("Salir")}
        </button>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-semibold uppercase tracking-wider mb-1.5"
      style={{ color: "var(--faint)" }}
    >
      {children}
    </div>
  );
}

export default function CambiarClavePage() {
  // Outside the console layout, so it carries its own providers.
  return (
    <LangProvider>
      <SessionProvider>
        <Form />
      </SessionProvider>
    </LangProvider>
  );
}
