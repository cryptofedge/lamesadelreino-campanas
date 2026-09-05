"use client";

/**
 * Drop a pin, see the radius.
 *
 * Typing "Brooklyn NY, 25 miles" into a text box is a guess — nobody can tell
 * from that whether the circle swallows Manhattan or stops at the bridge. The
 * ad managers all take a point and a radius, so this makes the same thing
 * visible before the money is spent.
 *
 * Leaflet with OpenStreetMap tiles, deliberately: Google Maps and Mapbox both
 * need an API key, and a key in a static page is a public key on someone
 * else's billing account. This needs none.
 *
 * Geocoding is Nominatim, OSM's own service. Its usage policy caps automated
 * use at one request per second, so the search is debounced and fires only on
 * an explicit press — never per keystroke.
 */
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
const ICON_BASE = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/";

const MILES_TO_M = 1609.34;

export interface Pin {
  name: string;
  lat: number;
  lng: number;
  radiusMiles: number;
}

/* Leaflet is loaded from a CDN at runtime, so it has no types here. */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    L?: any;
  }
}

/** Load the script once, even if two pickers mount. */
let loading: Promise<void> | null = null;
function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Leaflet no cargó"));
    document.head.appendChild(s);
  });
  return loading;
}

export default function MapPicker({
  pins,
  radiusMiles,
  onChange,
}: {
  pins: Pin[];
  radiusMiles: number;
  onChange: (pins: Pin[]) => void;
}) {
  const { t } = useLang();
  const boxRef = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");

  // Keep the newest pins reachable from Leaflet's click handler, which is bound
  // once and would otherwise capture the first render's array forever.
  const latest = useRef(pins);
  latest.current = pins;
  const radiusRef = useRef(radiusMiles);
  radiusRef.current = radiusMiles;

  useEffect(() => {
    let dead = false;

    loadLeaflet()
      .then(() => {
        if (dead || !boxRef.current || map.current) return;
        const L = window.L;

        // Default to Brooklyn — the show's home, and a sane view when there are
        // no pins yet.
        const m = L.map(boxRef.current).setView([40.645, -74.01], 10);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          // Attribution is a condition of using OSM tiles, not decoration.
          attribution: "© OpenStreetMap",
        }).addTo(m);

        m.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          onChange([
            ...latest.current,
            {
              name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              lat,
              lng,
              radiusMiles: radiusRef.current,
            },
          ]);
        });

        map.current = m;
        // featureGroup, not layerGroup: only a featureGroup has getBounds(),
        // and its children are on the map, which Leaflet's Circle.getBounds()
        // requires — a circle that was never added throws inside its own
        // projection code.
        layer.current = L.featureGroup().addTo(m);
        setReady(true);
      })
      .catch(() => setFailed(true));

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers and circles whenever the pins or the radius change.
  useEffect(() => {
    if (!ready || !map.current || !layer.current) return;
    const L = window.L;
    layer.current.clearLayers();

    const icon = L.icon({
      iconUrl: ICON_BASE + "marker-icon.png",
      iconRetinaUrl: ICON_BASE + "marker-icon-2x.png",
      shadowUrl: ICON_BASE + "marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    for (const p of pins) {
      L.marker([p.lat, p.lng], { icon, draggable: true })
        .addTo(layer.current)
        .bindTooltip(p.name)
        .on("dragend", (e: any) => {
          const { lat, lng } = e.target.getLatLng();
          onChange(
            latest.current.map((x) =>
              x === p ? { ...x, lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}` } : x,
            ),
          );
        });

      L.circle([p.lat, p.lng], {
        radius: (p.radiusMiles || radiusMiles) * MILES_TO_M,
        color: "#d6a854",
        weight: 1,
        fillColor: "#d6a854",
        fillOpacity: 0.12,
      }).addTo(layer.current);
    }

    // Fit to what is actually drawn. Building a throwaway group of circles to
    // measure would throw: an unadded circle has no map to project against.
    if (pins.length) {
      const b = layer.current.getBounds();
      if (b && b.isValid()) map.current.fitBounds(b.pad(0.15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, radiusMiles, ready]);

  async function search() {
    const term = q.trim();
    if (!term) return;
    setSearching(true);
    setNote("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(term)}`,
        { headers: { Accept: "application/json" } },
      );
      const hits = await res.json();
      if (!hits.length) {
        setNote(t("No encontramos ese lugar. Prueba con la ciudad y el estado."));
        return;
      }
      const h = hits[0];
      onChange([
        ...pins,
        {
          name: (h.display_name as string).split(",").slice(0, 2).join(",").trim(),
          lat: Number(h.lat),
          lng: Number(h.lon),
          radiusMiles,
        },
      ]);
      setQ("");
    } catch {
      setNote(t("No se pudo buscar ahora. Toca el mapa para poner el punto a mano."));
    } finally {
      setSearching(false);
    }
  }

  if (failed) {
    return (
      <p className="text-xs" style={{ color: "var(--amber)" }}>
        {t("El mapa no cargó. Puedes seguir escribiendo las ciudades a mano arriba.")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={q}
          placeholder={t("Busca una ciudad o dirección")}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={searching || !q.trim()}
          className="text-xs px-4 rounded-full font-semibold shrink-0 disabled:opacity-50"
          style={{ background: "var(--brass)", color: "#17130a" }}
        >
          {searching ? "…" : t("Buscar")}
        </button>
      </div>

      <div
        ref={boxRef}
        className="rounded-xl overflow-hidden"
        style={{ height: 280, border: "1px solid var(--line)", background: "var(--ink)" }}
      />

      <p className="text-xs mt-2" style={{ color: "var(--faint)" }}>
        {t("Toca el mapa para poner un punto, o arrastra uno para moverlo. El círculo es el radio.")}
      </p>

      {note && (
        <p className="text-xs mt-1" style={{ color: "var(--amber)" }}>
          {note}
        </p>
      )}

      {pins.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {pins.map((p, i) => (
            <div
              key={`${p.lat}-${p.lng}-${i}`}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
              style={{ background: "var(--ink)", border: "1px solid var(--line)" }}
            >
              <span className="font-semibold mr-auto truncate">{p.name}</span>
              <span className="nums shrink-0" style={{ color: "var(--faint)" }}>
                {p.lat.toFixed(3)}, {p.lng.toFixed(3)} · {p.radiusMiles} mi
              </span>
              <button
                type="button"
                onClick={() => onChange(pins.filter((_, j) => j !== i))}
                className="shrink-0 px-2 py-0.5 rounded-full"
                style={{ color: "var(--red)", border: "1px solid var(--line)" }}
                aria-label={t("Quitar")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
