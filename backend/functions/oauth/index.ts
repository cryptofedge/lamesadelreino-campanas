/**
 * Real one-click connect.
 *
 * This is the piece a static site cannot have: OAuth needs somewhere to keep a
 * client secret and somewhere for the platform to redirect back to, and a page
 * on GitHub Pages is neither. It runs as one function with two routes:
 *
 *   GET /oauth/start?platform=instagram   -> redirects to the platform
 *   GET /oauth/callback?code=…&state=…    -> exchanges the code, stores tokens
 *
 * Deploy:
 *   supabase functions deploy oauth --no-verify-jwt
 *
 * `--no-verify-jwt` is required because the platform's redirect arrives with
 * no Authorization header — it is a browser navigation, not an API call. The
 * `state` parameter is what carries trust instead: it is signed here, checked
 * on return, and expires, so a callback nobody started is rejected.
 *
 * Tokens land in `oauth_tokens`, a table with RLS on and no policy, which
 * denies the anon and authenticated keys outright. Only this function's
 * service role can read it. Nothing token-shaped is ever returned to a
 * browser — the console asks "is it connected", never "what is the token".
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------------------------------------------------------ */
/* Providers.

   Scopes are the least each job needs. Asking for more is how an app
   review gets rejected, and it is a bigger promise than the console
   keeps.                                                              */
/* ------------------------------------------------------------------ */

interface Provider {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Some providers want the secret in the body, some in Basic auth. */
  bodyAuth?: boolean;
  extraAuth?: Record<string, string>;
}

const PROVIDERS: Record<string, Provider> = {
  // Facebook Pages + Instagram publishing both come from Meta's login.
  meta: {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish",
      "read_insights",
    ].join(","),
    clientIdEnv: "META_CLIENT_ID",
    clientSecretEnv: "META_CLIENT_SECRET",
  },

  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload",
    ].join(" "),
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    bodyAuth: true,
    // Without these Google returns no refresh token on the second consent,
    // and the connection silently dies about an hour later.
    extraAuth: { access_type: "offline", prompt: "consent" },
  },

  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scope: "user.info.basic,video.publish,video.upload",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
    bodyAuth: true,
  },
};

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

/* ------------------------------------------------------------------ */
/* Signed state.

   The callback arrives unauthenticated, so `state` is the only thing
   proving this browser is finishing a flow we started. It is an HMAC
   over the platform and a timestamp, so it cannot be forged and cannot
   be replayed a day later.                                            */
/* ------------------------------------------------------------------ */

const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function hmac(input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(Deno.env.get("OAUTH_STATE_SECRET")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64u(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input)));
}

async function makeState(platform: string): Promise<string> {
  const body = `${platform}.${Date.now()}`;
  return `${body}.${await hmac(body)}`;
}

async function readState(state: string): Promise<string | null> {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [platform, ts, sig] = parts;
  if (sig !== (await hmac(`${platform}.${ts}`))) return null;
  // Ten minutes is plenty to click "Allow" and far too short to reuse.
  if (Date.now() - Number(ts) > 10 * 60 * 1000) return null;
  return platform;
}

/* ------------------------------------------------------------------ */

const redirectUri = () => `${Deno.env.get("PUBLIC_FUNCTION_URL")}/callback`;
const consoleUrl = () =>
  Deno.env.get("CONSOLE_URL") ??
  "https://cryptofedge.github.io/lamesadelreino-campanas";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.split("/").pop();

  /* ---- start ---- */
  if (route === "start") {
    const platform = url.searchParams.get("platform") ?? "";
    const p = PROVIDERS[platform];
    if (!p) return new Response("Unknown platform", { status: 400 });

    const clientId = Deno.env.get(p.clientIdEnv);
    if (!clientId) {
      // Say which secret is missing rather than bouncing the person to a
      // blank platform error they cannot act on.
      return new Response(
        `Missing ${p.clientIdEnv}. Set it with: supabase secrets set ${p.clientIdEnv}=…`,
        { status: 500 },
      );
    }

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: p.scope,
      state: await makeState(platform),
      ...(p.extraAuth ?? {}),
    });

    // TikTok names the field client_key, not client_id.
    if (platform === "tiktok") {
      q.delete("client_id");
      q.set("client_key", clientId);
    }

    return Response.redirect(`${p.authUrl}?${q}`, 302);
  }

  /* ---- callback ---- */
  if (route === "callback") {
    const err = url.searchParams.get("error");
    if (err) {
      return Response.redirect(`${consoleUrl()}/conexiones/?error=${encodeURIComponent(err)}`, 302);
    }

    const code = url.searchParams.get("code") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const platform = await readState(state);

    if (!platform || !code) {
      return Response.redirect(`${consoleUrl()}/conexiones/?error=state`, 302);
    }

    const p = PROVIDERS[platform];
    const clientId = Deno.env.get(p.clientIdEnv)!;
    const clientSecret = Deno.env.get(p.clientSecretEnv)!;

    const form = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    });
    if (p.bodyAuth) {
      form.set(platform === "tiktok" ? "client_key" : "client_id", clientId);
      form.set("client_secret", clientSecret);
    }

    const headers: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
    };
    if (!p.bodyAuth) {
      form.set("client_id", clientId);
      form.set("client_secret", clientSecret);
    }

    const res = await fetch(p.tokenUrl, { method: "POST", headers, body: form });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.access_token) {
      // Never echo the provider's body back to the browser — it can contain
      // the client secret in some error shapes.
      console.error("token exchange failed", platform, res.status);
      return Response.redirect(`${consoleUrl()}/conexiones/?error=token`, 302);
    }

    const expiresIn = Number(json.expires_in ?? 0);

    await admin().from("oauth_tokens").upsert({
      platform,
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? null,
      expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      scope: json.scope ?? p.scope,
      account_id: json.open_id ?? json.user_id ?? null,
      updated_at: new Date().toISOString(),
    });

    // Mark the console rows connected. This is the only thing the browser
    // ever learns — that it worked, never the token.
    const rows =
      platform === "meta"
        ? [
            { id: "cx-facebook-o", platform: "facebook", kind: "organic" },
            { id: "cx-instagram-o", platform: "instagram", kind: "organic" },
          ]
        : platform === "google"
          ? [{ id: "cx-youtube-o", platform: "youtube", kind: "organic" }]
          : [{ id: "cx-tiktok-o", platform: "tiktok", kind: "organic" }];

    for (const r of rows) {
      await admin().from("connections").upsert({
        ...r,
        connected: true,
        blocked_reason: null,
        last_checked: new Date().toISOString(),
      });
    }

    return Response.redirect(`${consoleUrl()}/conexiones/?connected=${platform}`, 302);
  }

  return new Response("Not found", { status: 404 });
});
