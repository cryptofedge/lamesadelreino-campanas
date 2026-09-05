"use client";

/**
 * Which accounts this console can actually reach.
 *
 * Deliberately blunt about the two tiers. Posting is connected and works;
 * buying ads needs API access that is an application, not a setting. A console
 * that showed six green ticks would be lying, and the first time a campaign
 * silently failed nobody would trust this page again.
 */
import { useQuery } from "@/lib/useQuery";
import { PLATFORMS } from "@/lib/types";
import type { Connection } from "@/lib/types";

export default function ConnectionsPage() {
  const { data: connections, loading } = useQuery<Connection[]>((sb) =>
    sb.from("connections").select("*"),
  );

  const organic = (connections ?? []).filter((c) => c.kind === "organic");
  const paid = (connections ?? []).filter((c) => c.kind === "paid");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black tracking-tight mb-1">Conexiones</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        Las cuentas que este panel puede usar.
      </p>

      {loading && (
        <p className="text-sm" style={{ color: "var(--faint)" }}>
          Cargando…
        </p>
      )}

      <Section
        title="Publicaciones"
        hint="Posts, reels y cortes. Esto ya funciona solo."
        items={organic}
      />

      <Section
        title="Anuncios pagados"
        hint="Para gastar dinero desde aquí hace falta permiso de cada plataforma. Se pide una vez."
        items={paid}
      />
    </div>
  );
}

function Section({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: Connection[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-7">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--faint)" }}>
        {title}
      </h2>
      <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
        {hint}
      </p>

      <div className="space-y-2">
        {items.map((c) => {
          const pf = PLATFORMS[c.platform];
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: pf.color }}
                />
                <span className="font-bold text-sm mr-auto">{c.account_name}</span>
                <span
                  className="chip"
                  style={{
                    color: c.connected ? "var(--green)" : "var(--amber)",
                    borderColor: "var(--line)",
                  }}
                >
                  {c.connected ? "Conectada" : "Falta permiso"}
                </span>
              </div>

              {!c.connected && c.blocked_reason && (
                <p
                  className="text-xs mt-2 leading-relaxed"
                  style={{ color: "var(--muted)" }}
                >
                  {c.blocked_reason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
