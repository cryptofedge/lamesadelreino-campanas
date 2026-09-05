import path from "path";
import type { NextConfig } from "next";

/**
 * Static export, for GitHub Pages — same shape as the Go Picadera console.
 *
 * Pages serves files, not a Node process, so there is no server to render on.
 * Everything is a browser app talking straight to Supabase with the anon key;
 * Row Level Security is the only thing between a visitor and the data.
 *
 * Note this means no API routes, which is why the paid-ad launch adapters are
 * written against a transport interface rather than assuming a backend — the
 * day a Meta token exists it needs somewhere server-side to live, and that is a
 * deliberate, isolated change rather than a rewrite.
 */
const BASE_PATH = process.env.NEXT_BASE_PATH ?? "/lamesadelreino-campanas";

const nextConfig: NextConfig = {
  output: "export",

  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,

  // Next prefixes its own assets and every next/link href, but a plain
  // <img src="/logo.png"> is untouched and would resolve to the domain root.
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },

  // Emit /campanas/index.html rather than /campanas.html, so the URL survives
  // being typed or refreshed.
  trailingSlash: true,

  images: { unoptimized: true },

  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
