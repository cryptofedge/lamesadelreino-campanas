"use client";

/**
 * Share something to WhatsApp.
 *
 * Uses the native share sheet where it exists (every phone), which lets the
 * person pick WhatsApp along with everything else. Falls back to wa.me, which
 * opens WhatsApp Web on a desktop — the deep link only prefills a message, it
 * never sends anything on its own.
 */
export default function ShareButton({
  text,
  url,
  label = "Compartir",
  title,
}: {
  text: string;
  url?: string;
  label?: string;
  title?: string;
}) {
  async function share() {
    const payload = url ? `${text}\n${url}` : text;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: title ?? "La Mesa del Reino", text, url });
        return;
      } catch {
        // Cancelling the sheet throws too, so fall through quietly rather than
        // opening WhatsApp behind a dismissed dialog.
        return;
      }
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(payload)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <button
      onClick={() => void share()}
      className="text-xs px-3 py-1.5 rounded-full font-semibold"
      style={{ background: "#25D366", color: "#06301a" }}
    >
      {label}
    </button>
  );
}
