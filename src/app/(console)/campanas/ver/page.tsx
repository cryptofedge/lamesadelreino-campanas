"use client";

import { Suspense } from "react";
import CampaignDetail from "./CampaignDetail";

export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          Cargando…
        </p>
      }
    >
      <CampaignDetail />
    </Suspense>
  );
}
