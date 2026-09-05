import { Suspense } from "react";
import LoginForm from "./LoginForm";

/**
 * `useSearchParams` needs a Suspense boundary or the static export fails to
 * prerender this route.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh grid place-items-center">
          <span className="text-sm" style={{ color: "var(--faint)" }}>
            Cargando…
          </span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
