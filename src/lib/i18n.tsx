"use client";

/**
 * Spanish / English for the whole console.
 *
 * Spanish is the source language and the dictionary maps es -> en, rather than
 * both mapping from invented keys like `nav.campaigns`. That means every string
 * in the components stays readable in the language the app is actually designed
 * in, a missing translation degrades to Spanish instead of showing `nav.foo` to
 * a real person, and adding English never required touching a component twice.
 *
 * The trade is that changing a Spanish string orphans its translation. The
 * check in `missing()` below is there to catch exactly that during development.
 */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";

export type Lang = "es" | "en";

const KEY = "mesa-lang";

const EN: Record<string, string> = {
  // Nav and shell
  "Campañas": "Campaigns",
  "Ideas": "Ideas",
  "Generador": "Generator",
  "Episodios": "Episodes",
  "Calendario": "Calendar",
  "Conexiones": "Connections",
  "Ajustes": "Settings",
  "Salir": "Sign out",
  "Dueño": "Owner",
  "Equipo": "Team",
  "Cargando…": "Loading…",
  "Centro de campañas": "Campaign desk",

  // Login
  "Correo": "Email",
  "Contraseña": "Password",
  "Entrar": "Sign in",
  "Entrando…": "Signing in…",
  "Correo o contraseña incorrectos.": "Wrong email or password.",
  "Demostración · toca una cuenta para entrar":
    "Demo · tap an account to sign in",
  "dueño": "owner",
  "equipo": "team",
  "Los episodios, campañas y números son de ejemplo. Puedes cambiar lo que quieras: todo vuelve a su sitio al recargar.":
    "The episodes, campaigns and numbers are examples. Change whatever you like — everything resets on reload.",

  // Campaigns
  "+ Nueva campaña": "+ New campaign",
  "Nueva campaña": "New campaign",
  "Activas": "Active",
  "Gastado": "Spent",
  "Alcance": "Reach",
  "presupuesto": "budget",
  "Presupuesto": "Budget",
  "Todavía no hay campañas": "No campaigns yet",
  "Crea la primera para el próximo episodio.":
    "Create the first one for the next episode.",
  "Sin publicaciones todavía": "No posts yet",
  "Sin episodio": "No episode",
  "Sale": "Airs",
  "hoy": "today",
  "mañana": "tomorrow",
  "ya pasó": "past",
  "Aprobar campaña": "Approve campaign",
  "Publicaciones y anuncios": "Posts and ads",
  "No encontramos esa campaña": "We couldn't find that campaign",
  "Volver a campañas": "Back to campaigns",
  "Sin texto todavía": "No copy yet",
  "Poner en cola": "Queue it",
  "Preparar anuncio": "Prepare ad",
  "Ocultar": "Hide",
  "Copiar": "Copy",
  "Clics": "Clicks",
  "sin imagen": "no image",

  // Status
  "Borrador": "Draft",
  "Programada": "Scheduled",
  "Activa": "Live",
  "Pausada": "Paused",
  "Terminada": "Finished",
  "En cola": "Queued",
  "Publicado": "Posted",
  "Al aire": "Running",
  "Terminado": "Done",
  "Falló": "Failed",
  "Pagado": "Paid",
  "Orgánico": "Organic",

  // Goals
  "Más vistas": "More views",
  "Más suscriptores": "More subscribers",
  "Llenar un evento": "Fill an event",
  "Dar a conocer": "Get known",

  // Generator
  "Generador de posts": "Post generator",
  "Escoge el episodio y dónde va. Edita lo que quieras antes de guardarlo.":
    "Pick the episode and where it goes. Edit anything before saving.",
  "Episodio": "Episode",
  "Plataforma": "Platform",
  "Ángulo": "Angle",
  "Qué pedimos": "What we ask for",
  "Otra versión": "Another version",
  "Guardado ✓": "Saved ✓",
  "Copiado ✓": "Copied ✓",
  "Pregunta": "Question",
  "Frase": "Quote",
  "Invitación": "Invitation",
  "Adelanto": "Teaser",
  "Recordatorio": "Reminder",

  // Media
  "Imagen y video": "Image and video",
  "Generar": "Generate",
  "Subir la mía": "Upload mine",
  "Miniatura": "Thumbnail",
  "Reel": "Reel",
  "Video": "Video",
  "Copiar prompt": "Copy prompt",
  "Mandar al bot": "Send to the bot",
  "Ver el prompt completo": "See the full prompt",
  "Recortar": "Crop",
  "Quitar": "Remove",
  "Girar ↻": "Rotate ↻",
  "Aplicar recorte": "Apply crop",
  "Recortando…": "Cropping…",
  "Cancelar": "Cancel",
  "Zoom": "Zoom",
  "Arrastra la foto para moverla dentro del marco.":
    "Drag the photo to move it inside the frame.",
  "Un corte ya editado, o una foto del estudio. Se adjunta a la campaña como el creativo del post.":
    "A clip you already cut, or a studio photo. It attaches to the campaign as the post's creative.",
  "Crea una campaña primero para poder adjuntarlo.":
    "Create a campaign first so this can be attached.",
  "Subiendo…": "Uploading…",
  "Adjuntado ✓": "Attached ✓",
  "Va con": "Goes with",

  // Ideas
  "Otras ideas": "More ideas",
  "Temas y preguntas para los próximos domingos. Las preguntas son lo importante — el título se cambia después.":
    "Topics and questions for the coming Sundays. The questions are what matter — the title can change later.",
  "Programar como Ep.": "Schedule as Ep.",
  "Sobre los versículos": "About Bible verses",
  "Aquí no salen citas bíblicas a propósito. Un versículo mal citado hace más daño que no citarlo, y esa parte la pone Richard. Esto solo trae el tema y las preguntas.":
    "No Bible references appear here on purpose. A misquoted verse does more harm than none, and that part is Richard's. This only brings the topic and the questions.",
  "Filtrar": "Filter",
  "Limpiar": "Clear",
  "Invitado": "Guest",
  "Guardar": "Save",
  "Guardadas": "Saved",
  "Cualquier tema": "Any topic",
  "Cualquier formato": "Any format",
  "…o escribe tu propio tema": "…or type your own topic",
  "…o el tuyo": "…or your own",
  "Tema tuyo": "Your topic",
  "Las preguntas se arman para cualquier tema — ajústalas a tu manera antes de grabar.":
    "The questions are built to fit any topic — make them yours before recording.",
  "Conversación": "Conversation",
  "Con invitado": "With a guest",
  "Testimonio": "Testimony",
  "Preguntas": "Questions",
  "Serie": "Series",

  // Episodes
  "+ Nuevo episodio": "+ New episode",
  "Título": "Title",
  "Invitado (opcional)": "Guest (optional)",
  "Fecha de estreno": "Air date",
  "Guardar episodio": "Save episode",
  "Guardando…": "Saving…",
  "Promocionar": "Promote",

  // Connections
  "Las cuentas que este panel puede usar.":
    "The accounts this console can use.",
  "Publicaciones": "Posts",
  "Anuncios pagados": "Paid ads",
  "Conectada": "Connected",
  "Falta permiso": "Permission missing",
  "Sin conectar": "Not connected",
  "Posts, reels y cortes. Se programan desde aquí.":
    "Posts, reels and clips. Scheduled from here.",
  "Para gastar dinero desde aquí hace falta permiso de cada plataforma. Se pide una vez y tarda días.":
    "Spending money from here needs each platform's permission. You apply once and it takes days.",
  "Todavía no se ha conectado esta cuenta.":
    "This account hasn't been connected yet.",

  // Settings
  "Presupuesto normal por semana": "Usual weekly budget",
  "Cuándo sale el programa": "When the show airs",
  "Guardado": "Saved",

  // Calendar
  "Nada programado": "Nothing scheduled",
  "Crea una campaña y las publicaciones aparecerán aquí.":
    "Create a campaign and its posts will show up here.",
  "Sin fecha": "No date",
  "Anuncio": "Ad",
  "Post": "Post",
};

/** Development aid: which visible strings have no English yet. */
export function missing(strings: string[]): string[] {
  return strings.filter((s) => !(s in EN));
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string) => string;
}

const LangCtx = createContext<Ctx>({
  lang: "es",
  setLang: () => {},
  t: (s) => s,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Always start on Spanish so the server-rendered HTML and the first client
  // render agree; the stored choice is applied right after mount. Reading
  // localStorage during render would hydrate-mismatch every translated string.
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "en" || saved === "es") setLangState(saved);
    } catch {
      // Private mode or storage disabled — Spanish is a fine default.
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (s: string) => (lang === "en" ? (EN[s] ?? s) : s),
    [lang],
  );

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
