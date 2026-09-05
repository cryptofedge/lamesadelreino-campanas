"use client";

/**
 * Crop an uploaded photo to the shape the platform actually wants.
 *
 * This is the edit that matters here and the one people cannot do on a phone
 * quickly: a picture shot horizontally is useless as a 9:16 Reel, and cropping
 * it elsewhere means leaving the console mid-task. Zoom, drag, rotate, done.
 *
 * Preview and output are driven by the same numbers on purpose. The preview is
 * CSS and the export is canvas, so any drift between the two maths means the
 * person crops one picture and saves a different one — the classic way an
 * editor like this quietly lies. `baseScale` and the offset conversion below
 * are the only places the two meet, and they are shared.
 */
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

/** Longest edge of the exported image. Big enough for a thumbnail, small
 *  enough not to hand a phone a 12MB blob. */
const OUT_MAX = 1440;

export interface Crop {
  label: string;
  ratio: number;
}

export const CROPS: Crop[] = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "1:1", ratio: 1 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:5", ratio: 4 / 5 },
];

export default function ImageEditor({
  src,
  fileName,
  onDone,
  onCancel,
}: {
  src: string;
  fileName: string;
  onDone: (file: File, url: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>(CROPS[0]);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);

  // Reset the framing whenever the target shape changes — an offset that made
  // sense in 16:9 usually puts the subject off-frame in 9:16.
  useEffect(() => {
    setOff({ x: 0, y: 0 });
    setZoom(1);
  }, [crop.ratio]);

  const boxW = 280;
  const boxH = Math.round(boxW / crop.ratio);

  // Cover fit, accounting for rotation swapping the image's effective sides.
  const swapped = rot % 180 !== 0;
  const iw = img ? (swapped ? img.naturalHeight : img.naturalWidth) : 1;
  const ih = img ? (swapped ? img.naturalWidth : img.naturalHeight) : 1;
  const baseScale = Math.max(boxW / iw, boxH / ih);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOff({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function apply() {
    if (!img) return;
    setBusy(true);

    // Export at the same aspect as the frame, scaled up from the preview.
    const outW = crop.ratio >= 1 ? OUT_MAX : Math.round(OUT_MAX * crop.ratio);
    const outH = crop.ratio >= 1 ? Math.round(OUT_MAX / crop.ratio) : OUT_MAX;
    const k = outW / boxW; // preview px -> output px

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }

    ctx.fillStyle = "#0b0a10";
    ctx.fillRect(0, 0, outW, outH);

    // Same order as the CSS transform on the preview: move to the frame's
    // centre plus the drag offset, rotate, then scale.
    ctx.translate(outW / 2 + off.x * k, outH / 2 + off.y * k);
    ctx.rotate((rot * Math.PI) / 180);
    const s = baseScale * zoom * k;
    ctx.scale(s, s);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.9),
    );
    if (!blob) {
      setBusy(false);
      return;
    }

    const name = fileName.replace(/\.[^.]+$/, "") + `-${crop.label.replace(":", "x")}.jpg`;
    const file = new File([blob], name, { type: "image/jpeg" });
    onDone(file, URL.createObjectURL(blob));
    setBusy(false);
  }

  return (
    <div
      className="p-3 rounded-xl mb-3"
      style={{ background: "var(--ink)", border: "1px solid var(--line)" }}
    >
      <div className="flex gap-1.5 flex-wrap mb-3">
        {CROPS.map((c) => {
          const on = c.label === crop.label;
          return (
            <button
              key={c.label}
              onClick={() => setCrop(c)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{
                background: on ? "var(--brass)" : "var(--surface-3)",
                color: on ? "#17130a" : "var(--muted)",
              }}
            >
              {c.label}
            </button>
          );
        })}
        <button
          onClick={() => setRot((r) => (r + 90) % 360)}
          className="text-xs px-3 py-1.5 rounded-full font-semibold"
          style={{ background: "var(--surface-3)", color: "var(--text)" }}
        >
          {t("Girar ↻")}
        </button>
      </div>

      {/* The frame. Everything outside it is what gets cut. */}
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative overflow-hidden rounded-lg mx-auto touch-none select-none"
        style={{
          width: boxW,
          height: boxH,
          background: "#0b0a10",
          border: "1px solid var(--line-warm)",
          cursor: drag.current ? "grabbing" : "grab",
        }}
      >
        {img && (
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: img.naturalWidth,
              height: img.naturalHeight,
              transform:
                `translate(${off.x}px, ${off.y}px) ` +
                `translate(-50%, -50%) ` +
                `rotate(${rot}deg) scale(${baseScale * zoom})`,
              transformOrigin: "center",
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          {t("Zoom")}
        </span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ padding: 0, border: "none", background: "transparent", flex: 1 }}
        />
      </div>

      <p className="text-xs mt-2 mb-3" style={{ color: "var(--faint)" }}>
        {t("Arrastra la foto para moverla dentro del marco.")}
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => void apply()}
          disabled={busy || !img}
          className="text-xs px-3 py-1.5 rounded-full font-semibold disabled:opacity-50"
          style={{ background: "var(--brass)", color: "#17130a" }}
        >
          {busy ? t("Recortando…") : t("Aplicar recorte")}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-full font-semibold"
          style={{ background: "var(--surface-3)", color: "var(--muted)" }}
        >
          {t("Cancelar")}
        </button>
      </div>
    </div>
  );
}
