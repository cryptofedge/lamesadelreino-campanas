"use client";

/**
 * Everything the ad platforms need that is not part of a single campaign.
 *
 * This page grew because the campaign brief looked finished and wasn't. Google,
 * Meta and TikTok each demand account-level things that live nowhere near the
 * campaign screen — an ad account id, a linked page, a payment profile — plus
 * targeting decisions that are the same every week and should be decided once.
 *
 * Location is first because it is the one the bot could never guess and the one
 * that most changes what a campaign costs.
 */
import { useState, useEffect } from "react";
import { browserClient } from "@/lib/supabase-browser";
import { useQuery } from "@/lib/useQuery";
import { money } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import MapPicker from "@/components/MapPicker";
import type { Pin } from "@/components/MapPicker";
import {
  ACCOUNT_FIELDS,
  DEFAULT_TARGETING,
  SPECIAL_CATEGORIES,
  MINIMUMS,
  MIN_RADIUS_MILES,
} from "@/lib/platform-specs";

type Setting = { key: string; value: string };

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default function SettingsPage() {
  const { t } = useLang();
  const { data: rows, reload } = useQuery<Setting[]>((sb) =>
    sb.from("settings").select("*"),
  );

  const [v, setV] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rows) return;
    const next: Record<string, string> = {};
    for (const r of rows) next[r.key] = r.value;
    // Seed the targeting defaults only where nothing was stored, so a saved
    // blank stays blank instead of springing back.
    for (const [k, dv] of Object.entries(DEFAULT_TARGETING)) {
      if (next[k] === undefined) next[k] = String(dv);
    }
    if (next.weekly_budget === undefined) next.weekly_budget = "100";
    if (next.show_day === undefined) next.show_day = "domingo";
    if (next.show_time === undefined) next.show_time = "19:00";
    setV(next);
  }, [rows]);

  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  async function save() {
    setBusy(true);
    await browserClient()
      .from("settings")
      .upsert(Object.entries(v).map(([key, value]) => ({ key, value })));
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    reload();
  }

  // Pins are stored as JSON in the same key/value settings table. A corrupt
  // value must not take the whole page down with it.
  let pins: Pin[] = [];
  try {
    const raw = v.map_pins;
    if (raw) pins = JSON.parse(raw);
    if (!Array.isArray(pins)) pins = [];
  } catch {
    pins = [];
  }

  const radius = Number(v.radiusMiles ?? 25);
  const radiusTooSmall = radius > 0 && radius < MIN_RADIUS_MILES;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black tracking-tight mb-5">{t("Ajustes")}</h1>

      {/* ---------------- The show ---------------- */}
      <Card title={t("El programa")}>
        <Label>{t("Presupuesto normal por semana")}</Label>
        <input
          type="number"
          min={0}
          step={10}
          value={v.weekly_budget ?? ""}
          onChange={(e) => set("weekly_budget", e.target.value)}
        />
        <Hint>
          {t("Con lo que empieza cada campaña nueva.")}{" "}
          {money(Number(v.weekly_budget) || 0)}.
        </Hint>

        <Label className="mt-4">{t("Cuándo sale el programa")}</Label>
        <div className="flex gap-3">
          <select
            value={v.show_day ?? "domingo"}
            onChange={(e) => set("show_day", e.target.value)}
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={v.show_time ?? "19:00"}
            onChange={(e) => set("show_time", e.target.value)}
          />
        </div>
        <Hint>
          {t("Las campañas se programan alrededor de esta fecha: empiezan dos días antes y terminan cinco días después.")}
        </Hint>
      </Card>

      {/* ---------------- Location ---------------- */}
      <Card title={t("Dónde corren los anuncios")}>
        <Hint className="mb-3">
          {t("Esto es lo que el bot no puede adivinar. Las tres plataformas lo piden y cambia lo que cuesta llegar.")}
        </Hint>

        <Label>{t("Países")}</Label>
        <input
          value={v.countries ?? ""}
          placeholder="Estados Unidos, República Dominicana"
          onChange={(e) => set("countries", e.target.value)}
        />

        <Label className="mt-4">{t("Ciudades o zonas")}</Label>
        <input
          value={v.cities ?? ""}
          placeholder="Brooklyn NY, Queens NY, Santo Domingo"
          onChange={(e) => set("cities", e.target.value)}
        />
        <Hint>{t("Separadas por coma. Sirve para eventos y para llenar un culto.")}</Hint>

        <Label className="mt-4">{t("Radio alrededor de cada ciudad (millas)")}</Label>
        <input
          type="number"
          min={1}
          max={500}
          value={v.radiusMiles ?? ""}
          onChange={(e) => set("radiusMiles", e.target.value)}
        />
        {radiusTooSmall ? (
          <p className="text-xs mt-2" style={{ color: "var(--red)" }}>
            {t("Meta no acepta menos de 1 milla.")}
          </p>
        ) : (
          <Hint>{t("Meta no acepta menos de 1 milla. 25 cubre bien los cinco condados.")}</Hint>
        )}

        <Label className="mt-5">{t("En el mapa")}</Label>
        <MapPicker
          pins={pins}
          radiusMiles={radius > 0 ? radius : 25}
          onChange={(next) => {
            set("map_pins", JSON.stringify(next));
            // Keep the written list in step, so the brief reads the same
            // wherever it is looked at.
            set("cities", next.map((p) => p.name).join(", "));
          }}
        />
      </Card>

      {/* ---------------- Audience ---------------- */}
      <Card title={t("A quién le hablamos")}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("Edad desde")}</Label>
            <input
              type="number"
              min={13}
              max={65}
              value={v.ageMin ?? ""}
              onChange={(e) => set("ageMin", e.target.value)}
            />
          </div>
          <div>
            <Label>{t("Edad hasta")}</Label>
            <input
              type="number"
              min={13}
              max={65}
              value={v.ageMax ?? ""}
              onChange={(e) => set("ageMax", e.target.value)}
            />
          </div>
        </div>

        <Label className="mt-4">{t("Idiomas")}</Label>
        <input
          value={v.languages ?? ""}
          placeholder="Español, Inglés"
          onChange={(e) => set("languages", e.target.value)}
        />

        <Label className="mt-4">{t("Género")}</Label>
        <select
          value={v.genders ?? "Todos"}
          onChange={(e) => set("genders", e.target.value)}
        >
          {["Todos", "Mujeres", "Hombres"].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <Label className="mt-4">{t("Categoría especial de Meta")}</Label>
        <select
          value={v.specialCategory ?? "Ninguna"}
          onChange={(e) => set("specialCategory", e.target.value)}
        >
          {SPECIAL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Hint>
          {t("Casi siempre \"Ninguna\". Solo cambia si el anuncio defiende una postura política o social en vez de invitar al episodio — y entonces Meta quita casi todo el targeting por edad y zona.")}
        </Hint>
      </Card>

      {/* ---------------- Minimums ---------------- */}
      <Card title={t("Mínimos de cada plataforma")}>
        <Hint className="mb-3">
          {t("Por debajo de esto la plataforma rechaza la campaña, no la entrega despacio.")}
        </Hint>
        <div className="space-y-2">
          {Object.entries(MINIMUMS).map(([k, m]) => (
            <div
              key={k}
              className="flex items-start gap-3 text-sm px-3 py-2 rounded-xl"
              style={{ background: "var(--ink)", border: "1px solid var(--line)" }}
            >
              <span className="font-bold w-20 shrink-0 capitalize">{k}</span>
              <span className="nums shrink-0" style={{ color: "var(--brass)" }}>
                ${m!.daily}/día
                {m!.lifetime ? ` · $${m!.lifetime} total` : ""}
              </span>
              <span className="text-xs" style={{ color: "var(--faint)" }}>
                {m!.note}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ---------------- Accounts ---------------- */}
      {(Object.keys(ACCOUNT_FIELDS) as (keyof typeof ACCOUNT_FIELDS)[]).map((p) => (
        <Card key={p} title={ACCOUNT_FIELDS[p].label}>
          {ACCOUNT_FIELDS[p].fields.map((f) => (
            <div key={f.key} className="mb-4 last:mb-0">
              <Label>
                {f.label}
                {f.required && (
                  <span style={{ color: "var(--amber)" }}> · {t("obligatorio")}</span>
                )}
              </Label>
              <input
                value={v[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
              <Hint>{f.hint}</Hint>
            </div>
          ))}
        </Card>
      ))}

      <button
        onClick={() => void save()}
        disabled={busy}
        className="w-full py-3 rounded-full font-bold disabled:opacity-50"
        style={{ background: "var(--brass)", color: "#17130a" }}
      >
        {busy ? t("Guardando…") : saved ? t("Guardado ✓") : t("Guardar")}
      </button>

      <p className="text-xs mt-3 text-center" style={{ color: "var(--faint)" }}>
        {t("Todo esto entra en el resumen que se manda a cada plataforma y en lo que sabe el bot.")}
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 mb-4">
      <h2
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: "var(--brass)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-xs font-bold uppercase tracking-wider mb-2 ${className}`}
      style={{ color: "var(--faint)" }}
    >
      {children}
    </div>
  );
}

function Hint({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xs mt-2 leading-relaxed ${className}`} style={{ color: "var(--faint)" }}>
      {children}
    </p>
  );
}
