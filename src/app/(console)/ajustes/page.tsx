"use client";

/**
 * The handful of things that change how a week is built by default.
 * Kept small on purpose — every setting here is one Richard would actually
 * change, not a preferences panel.
 */
import { useState, useEffect } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { useQuery } from "@/lib/useQuery";
import { money } from "@/lib/types";

type Setting = { key: string; value: string };

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default function SettingsPage() {
  const { data: rows, reload } = useQuery<Setting[]>((sb) =>
    sb.from("settings").select("*"),
  );

  const [budget, setBudget] = useState("100");
  const [showDay, setShowDay] = useState("domingo");
  const [showTime, setShowTime] = useState("19:00");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rows) return;
    const get = (k: string) => rows.find((r) => r.key === k)?.value;
    setBudget(get("weekly_budget") ?? "100");
    setShowDay(get("show_day") ?? "domingo");
    setShowTime(get("show_time") ?? "19:00");
  }, [rows]);

  async function save() {
    setBusy(true);
    await browserClient()
      .from("settings")
      .upsert([
        { key: "weekly_budget", value: budget },
        { key: "show_day", value: showDay },
        { key: "show_time", value: showTime },
      ]);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    reload();
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-black tracking-tight mb-5">Ajustes</h1>

      <div className="card p-4 mb-4">
        <Label>Presupuesto normal por semana</Label>
        <input
          type="number"
          min={0}
          step={10}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
          Con lo que empieza cada campaña nueva. Ahora mismo{" "}
          {money(Number(budget) || 0)}.
        </p>
      </div>

      <div className="card p-4 mb-5">
        <Label>Cuándo sale el programa</Label>
        <div className="flex gap-3">
          <select
            value={showDay}
            onChange={(e) => setShowDay(e.target.value)}
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={showTime}
            onChange={(e) => setShowTime(e.target.value)}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
          Las campañas se programan alrededor de esta fecha: empiezan dos días
          antes y terminan cinco días después.
        </p>
      </div>

      <button
        onClick={() => void save()}
        disabled={busy}
        className="w-full py-3 rounded-full font-bold disabled:opacity-50"
        style={{ background: "var(--brass)", color: "#17130a" }}
      >
        {busy ? "Guardando…" : saved ? "Guardado ✓" : "Guardar"}
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-wider mb-2"
      style={{ color: "var(--faint)" }}
    >
      {children}
    </div>
  );
}
