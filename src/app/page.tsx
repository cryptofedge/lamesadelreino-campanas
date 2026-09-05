"use client";

/**
 * The root just forwards into the console. There is no marketing page here —
 * anyone typing this URL is Richard or his team, and they want the campaigns.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/campanas");
  }, [router]);

  return (
    <div className="min-h-dvh grid place-items-center">
      <span className="text-sm" style={{ color: "var(--faint)" }}>
        Cargando…
      </span>
    </div>
  );
}
