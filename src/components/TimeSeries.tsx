"use client";

/**
 * The performance graph the ad managers put above the table.
 *
 * One metric at a time, chosen by the tabs above it — which is exactly how Meta
 * and TikTok do it, and it is the right call for a reason beyond imitation:
 * reach is in the tens of thousands and CTR is a single-digit percentage, so
 * putting both on one plot needs two y-axes, and a second axis lets the reader
 * believe a crossing means something. One metric, one scale, switch to compare.
 *
 * 2px line, round caps, an 8px end marker with a surface ring, a 10% wash
 * underneath, and a crosshair that follows the pointer.
 */
import { useState } from "react";

const MARK = "#d6a854";

export interface Point {
  label: string;
  value: number;
}

export default function TimeSeries({
  points,
  format,
  emptyLabel,
}: {
  points: Point[];
  format: (n: number) => string;
  emptyLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div
        className="grid place-items-center text-xs"
        style={{ height: 160, color: "var(--faint)" }}
      >
        {emptyLabel}
      </div>
    );
  }

  const W = 700;
  const H = 160;
  const PAD = { t: 14, r: 12, b: 22, l: 46 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const max = Math.max(...points.map((p) => p.value), 1);
  // Round the top to something clean so the axis ticks read as real numbers.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;

  const x = (i: number) => PAD.l + (i / (points.length - 1)) * iw;
  const y = (v: number) => PAD.t + ih - (v / top) * ih;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.t + ih} L${x(0)},${PAD.t + ih} Z`;

  const ticks = [0, top / 2, top];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={emptyLabel}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.l) / iw) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Gridlines: hairline, solid, one step off the surface. */}
        {ticks.map((tv) => (
          <g key={tv}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(tv)}
              y2={y(tv)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 8}
              y={y(tv) + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--faint)"
            >
              {format(tv)}
            </text>
          </g>
        ))}

        <path d={area} fill={MARK} opacity="0.1" />
        <path
          d={line}
          fill="none"
          stroke={MARK}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.t}
            y2={PAD.t + ih}
            stroke="var(--line-warm)"
            strokeWidth="1"
          />
        )}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={hover === i ? 5 : 4}
            fill={MARK}
            // A ring in the surface colour keeps the marker legible where it
            // sits on the line.
            stroke="var(--surface)"
            strokeWidth="2"
          />
        ))}

        {points.map((p, i) => (
          <text
            key={`x${i}`}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="var(--faint)"
          >
            {p.label}
          </text>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="absolute pointer-events-none text-xs px-2.5 py-1.5 rounded-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
            background: "var(--ink)",
            border: "1px solid var(--line)",
            whiteSpace: "nowrap",
          }}
          role="status"
        >
          <span style={{ color: "var(--faint)" }}>{points[hover].label}</span>{" "}
          <strong className="nums">{format(points[hover].value)}</strong>
        </div>
      )}
    </div>
  );
}
