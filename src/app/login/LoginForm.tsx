"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { browserClient, IS_DEMO } from "@/lib/supabase-browser";
import { DEMO_USERS } from "@/lib/demo-data";
import { useLang } from "@/lib/i18n";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function LoginForm() {
  const { lang, setLang, t } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/campanas";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(mail: string, pass: string) {
    setBusy(true);
    setError("");

    const sb = browserClient();
    const { error } = await sb.auth.signInWithPassword({
      email: mail,
      password: pass,
    });
    if (error) {
      // Deliberately vague: saying which half was wrong tells an attacker which
      // addresses have accounts here.
      setError(t("Correo o contraseña incorrectos."));
      setBusy(false);
      return;
    }
    router.push(next);
  }

  return (
    // min-h-dvh, not min-h-screen: on mobile the browser chrome makes 100vh
    // taller than the visible area, which pushes the card off centre.
    <div className="min-h-dvh flex items-center justify-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void signIn(email, password);
        }}
        className="w-full max-w-md rounded-2xl p-8 sm:p-10 border text-center"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <button
          type="button"
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="float-right text-xs px-2.5 py-1 rounded-full border font-bold"
          style={{ borderColor: "var(--line-warm)", color: "var(--brass)" }}
        >
          {lang === "es" ? "EN" : "ES"}
        </button>

        <img
          src={`${BASE}/logo.jpg`}
          alt="La Mesa del Reino"
          width={120}
          height={120}
          className="mx-auto mb-5 h-20 w-20 rounded-2xl"
        />

        <div className="font-black text-2xl tracking-tight mb-1">
          LA MESA <span style={{ color: "var(--brass)" }}>DEL REINO</span>
        </div>
        <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
          {t("Centro de campañas")}
        </p>

        {IS_DEMO && (
          <div
            className="mb-7 pb-6 border-b text-left"
            style={{ borderColor: "var(--line)" }}
          >
            <p
              className="text-[11px] font-bold uppercase tracking-wider mb-3"
              style={{ color: "var(--brass)" }}
            >
              {t("Demostración · toca una cuenta para entrar")}
            </p>

            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  // Fill the fields too, so it is obvious what was used.
                  setEmail(u.email);
                  setPassword(u.password);
                  void signIn(u.email, u.password);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl border mb-2 disabled:opacity-50"
                style={{ background: "var(--ink)", borderColor: "var(--line)" }}
              >
                <span className="block text-sm font-bold">
                  {u.full_name}{" "}
                  <span
                    className="font-normal"
                    style={{ color: "var(--faint)" }}
                  >
                    · {u.role === "owner" ? t("dueño") : t("equipo")}
                  </span>
                </span>
                <span
                  className="block text-xs nums"
                  style={{ color: "var(--faint)" }}
                >
                  {u.email}
                </span>
              </button>
            ))}

            <p className="text-xs mt-3" style={{ color: "var(--faint)" }}>
              {t("Los episodios, campañas y números son de ejemplo. Puedes cambiar lo que quieras: todo vuelve a su sitio al recargar.")}
            </p>
          </div>
        )}

        <div className="text-left">
          <label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--faint)" }}
          >
            {t("Correo")}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            required
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            className="mb-5"
          />

          <label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--faint)" }}
          >
            {t("Contraseña")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            required
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6"
          />
        </div>

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
          {busy ? t("Entrando…") : t("Entrar")}
        </button>
      </form>
    </div>
  );
}
