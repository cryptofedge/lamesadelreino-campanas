"use client";

/**
 * The reporting table, shaped like the ad managers.
 *
 * Meta, Google Ads and TikTok all present the same thing: a performance graph
 * on top, a level switcher (campaigns / ad sets / ads), and a dense sortable
 * table with a totals row. Copying that layout is the point — the numbers here
 * are small, and what Richard actually needs is to recognise this screen when
 * he opens Ads Manager for real.
 *
 * So: name on the left with a status dot, metrics right-aligned and
 * tabular-figured, sort by clicking a header, and a bold totals row pinned at
 * the top of the body the way Meta pins "Results from N campaigns".
 */
import { useState } from "react";

export interface Col {
  key: string;
  label: string;
  /** Right-align and use tabular figures. */
  numeric?: boolean;
  /** How the cell renders. */
  render: (row: TableRow) => string;
  /** Raw value for sorting, when the rendered string would sort wrong. */
  sortValue?: (row: TableRow) => number | string;
}

export interface TableRow {
  id: string;
  name: string;
  statusLabel: string;
  statusColor: string;
  /** Small colour chip beside the name, where a platform owns the row. */
  dot?: string;
  sub?: string;
  metrics: Record<string, number | null>;
  href?: string;
}

export default function AdTable({
  cols,
  rows,
  totals,
  totalsLabel,
  emptyLabel,
}: {
  cols: Col[];
  rows: TableRow[];
  totals: TableRow;
  totalsLabel: string;
  emptyLabel: string;
}) {
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({
    key: cols.find((c) => c.numeric)?.key ?? cols[0].key,
    desc: true,
  });

  if (rows.length === 0) {
    return (
      <p className="text-sm p-4" style={{ color: "var(--faint)" }}>
        {emptyLabel}
      </p>
    );
  }

  const col = cols.find((c) => c.key === sort.key);
  const sorted = [...rows].sort((a, b) => {
    const va = col?.sortValue ? col.sortValue(a) : (a.metrics[sort.key] ?? -1);
    const vb = col?.sortValue ? col.sortValue(b) : (b.metrics[sort.key] ?? -1);
    if (typeof va === "string" || typeof vb === "string") {
      const r = String(va).localeCompare(String(vb));
      return sort.desc ? -r : r;
    }
    return sort.desc ? vb - va : va - vb;
  });

  const th =
    "text-[11px] font-semibold uppercase tracking-wide py-2 px-3 whitespace-nowrap select-none cursor-pointer";
  const td = "py-2.5 px-3 whitespace-nowrap";

  return (
    // The table scrolls inside its own box rather than pushing the page
    // sideways — these are wide by nature on a phone.
    <div className="overflow-x-auto -mx-4 px-4">
      <table
        className="w-full text-sm"
        style={{ borderCollapse: "collapse", minWidth: 560 }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {cols.map((c, i) => (
              <th
                key={c.key}
                className={th}
                style={{
                  color: sort.key === c.key ? "var(--brass)" : "var(--faint)",
                  textAlign: c.numeric ? "right" : "left",
                  position: i === 0 ? "sticky" : undefined,
                  left: i === 0 ? 0 : undefined,
                  background: i === 0 ? "var(--surface)" : undefined,
                }}
                onClick={() =>
                  setSort((s) =>
                    s.key === c.key ? { key: c.key, desc: !s.desc } : { key: c.key, desc: true },
                  )
                }
                aria-sort={
                  sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"
                }
              >
                {c.label}
                {sort.key === c.key && (
                  <span aria-hidden> {sort.desc ? "↓" : "↑"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Totals first, the way Ads Manager pins the summary row. */}
          <tr
            style={{
              borderBottom: "1px solid var(--line)",
              background: "var(--surface-2)",
            }}
          >
            {cols.map((c, i) => (
              <td
                key={c.key}
                className={`${td} font-bold ${c.numeric ? "nums" : ""}`}
                style={{
                  textAlign: c.numeric ? "right" : "left",
                  position: i === 0 ? "sticky" : undefined,
                  left: i === 0 ? 0 : undefined,
                  background: i === 0 ? "var(--surface-2)" : undefined,
                }}
              >
                {i === 0 ? totalsLabel : c.render(totals)}
              </td>
            ))}
          </tr>

          {sorted.map((r) => (
            <tr
              key={r.id}
              className="transition-colors hover:brightness-125"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              {cols.map((c, i) => (
                <td
                  key={c.key}
                  className={`${td} ${c.numeric ? "nums" : ""}`}
                  style={{
                    textAlign: c.numeric ? "right" : "left",
                    color: c.numeric ? "var(--text)" : undefined,
                    position: i === 0 ? "sticky" : undefined,
                    left: i === 0 ? 0 : undefined,
                    background: i === 0 ? "var(--surface)" : undefined,
                  }}
                >
                  {i === 0 ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ background: r.dot ?? r.statusColor }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="truncate font-semibold" style={{ maxWidth: 210 }}>
                          {r.href ? (
                            <a href={r.href} className="hover:underline">
                              {r.name}
                            </a>
                          ) : (
                            r.name
                          )}
                        </div>
                        <div
                          className="text-[11px] truncate"
                          style={{ color: r.statusColor, maxWidth: 210 }}
                        >
                          {r.statusLabel}
                          {r.sub ? ` · ${r.sub}` : ""}
                        </div>
                      </div>
                    </div>
                  ) : (
                    c.render(r)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
