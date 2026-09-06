"use client";

/**
 * The charts on the analytics page.
 *
 * Three decisions worth knowing, because each was tested rather than guessed:
 *
 * 1. ONE HUE, NOT THE BRAND COLOURS. Running the platform palette
 *    (#ff4444 #e1499a #4a8cff #3ad9d1 #c9c9d4) through a colour-vision check
 *    fails hard: X reads as grey, TikTok↔X separate by ΔE 1.4 under protanopia
 *    — invisible — and Instagram↔YouTube by 12.9, under the floor where normal
 *    vision can tell a pair apart. Brand colour survives as a dot *beside* the
 *    label, where it names a row; it never carries the value.
 *
 * 2. LENGTH IS THE ENCODING. These charts answer "how much", not "which one",
 *    so the bar's length already says it. Colouring by magnitude as well would
 *    encode the same fact twice and buy nothing.
 *
 * 3. NO SECOND AXIS. Reach and response rate are different scales and get
 *    separate charts rather than one chart with two y-axes.
 *
 * Marks follow the house spec: bars capped at 24px with a 4px rounded data-end
 * square at the baseline, hairline recessive gridlines, values direct-labelled
 * at the tip, and text in text tokens — never in the series colour.
 */
import { useState } from "react";
import { count } from "@/lib/types";

/** Validated at >= 3:1 against the chart surface (#15131d). */
const MARK = "#d6a854";

export interface Row {
  key: string;
  label: string;
  /** Brand colour, used only for the identity dot beside the label. */
  dot?: string;
  value: number;
  /** What the tooltip says, beyond the value. */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Horizontal bars — the form for magnitude with long category names. */
/* ------------------------------------------------------------------ */

export function BarChart({
  rows,
  format = (n: number) => count(n),
  emptyLabel,
}: {
  rows: Row[];
  format?: (n: number) => string;
  emptyLabel: string;
}) {
  const [hover, setHover] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--faint)" }}>
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-1">
      {rows.map((r) => {
        const pct = (r.value / max) * 100;
        const on = hover === r.key;
        return (
          <div
            key={r.key}
            // The hit target is the whole row, not the bar — a 10px bar is far
            // too small to hover reliably on a phone.
            className="relative px-2 py-1.5 rounded-lg transition-colors cursor-default"
            style={{ background: on ? "var(--surface-2)" : "transparent" }}
            onMouseEnter={() => setHover(r.key)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(r.key)}
            onBlur={() => setHover(null)}
            tabIndex={0}
          >
            <div className="flex items-center gap-2 mb-1">
              {r.dot && (
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: r.dot }}
                  aria-hidden
                />
              )}
              <span className="text-xs font-semibold mr-auto truncate">
                {r.label}
              </span>
              {/* Direct label at the tip, in a text token — never the mark colour. */}
              <span className="text-xs nums shrink-0" style={{ color: "var(--muted)" }}>
                {format(r.value)}
              </span>
            </div>

            <svg
              width="100%"
              height="10"
              role="img"
              aria-label={`${r.label}: ${format(r.value)}`}
              style={{ display: "block", overflow: "visible" }}
            >
              {/* Track: one step off the surface, recessive. */}
              <rect x="0" y="1" width="100%" height="8" rx="4" fill="var(--surface-3)" />
              {pct > 0 && (
                <rect
                  x="0"
                  y="1"
                  width={`${Math.max(pct, 1.5)}%`}
                  height="8"
                  rx="4"
                  fill={MARK}
                  opacity={on ? 1 : 0.9}
                />
              )}
            </svg>

            {r.note && on && (
              <div
                className="absolute z-10 right-2 -top-1 text-[11px] px-2 py-1 rounded-md pointer-events-none"
                style={{
                  background: "var(--ink)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
                role="status"
              >
                {r.note}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Columns over time.                                                 */
/* ------------------------------------------------------------------ */

export function ColumnChart({
  rows,
  emptyLabel,
}: {
  rows: Row[];
  emptyLabel: string;
}) {
  const [hover, setHover] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--faint)" }}>
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);
  const H = 120;

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: H }}>
        {rows.map((r) => {
          const h = Math.max((r.value / max) * (H - 22), 2);
          const on = hover === r.key;
          return (
            <div
              key={r.key}
              className="flex-1 flex flex-col items-center justify-end h-full cursor-default"
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(r.key)}
              onBlur={() => setHover(null)}
              tabIndex={0}
            >
              <span
                className="text-[11px] nums mb-1"
                style={{ color: on ? "var(--text)" : "var(--faint)" }}
              >
                {count(r.value)}
              </span>
              {/* Capped at 24px so the column never fills its slot — the
                  leftover is deliberate air, not a layout gap. */}
              <div
                style={{
                  height: h,
                  width: "100%",
                  maxWidth: 24,
                  background: MARK,
                  opacity: on ? 1 : 0.9,
                  // Rounded at the data end, square at the baseline.
                  borderRadius: "4px 4px 0 0",
                }}
                role="img"
                aria-label={`${r.label}: ${count(r.value)}`}
              />
            </div>
          );
        })}
      </div>

      {/* Baseline. Hairline, solid, recessive — never dashed. */}
      <div style={{ height: 1, background: "var(--line)" }} />

      <div className="flex gap-2 mt-1.5">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex-1 text-[10px] text-center leading-tight truncate"
            style={{ color: "var(--faint)" }}
            title={r.label}
          >
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The table view. Required, not optional: it is what makes the charts
   reachable for anyone the colour and geometry do not serve.         */
/* ------------------------------------------------------------------ */

export function TableView({
  headers,
  rows,
  label,
}: {
  headers: string[];
  rows: (string | number)[][];
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
        style={{ background: "var(--surface-3)", color: "var(--muted)" }}
        aria-expanded={open}
      >
        {label}
      </button>

      {open && (
        // Wide tables scroll inside their own box rather than pushing the page
        // sideways on a phone.
        <div className="overflow-x-auto mt-2">
          <table className="text-xs w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left font-semibold py-1.5 pr-4 whitespace-nowrap"
                    style={{ color: "var(--faint)", borderBottom: "1px solid var(--line)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td
                      key={j}
                      className="py-1.5 pr-4 nums whitespace-nowrap"
                      style={{ borderBottom: "1px solid var(--line)" }}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
