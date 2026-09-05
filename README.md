# La Mesa del Reino — Centro de Campañas

One place to run the week's promotion for the podcast, instead of Google Ads,
Meta Business Suite and TikTok Ads Manager in separate tabs.

A campaign belongs to an **episode** and fans out into **placements** — one per
platform, each either *organic* (a post we publish) or *paid* (an ad we buy).
Keeping both in one table is the point: Richard thinks "this week's episode",
not "my Instagram post" and "my Instagram ad" as separate projects.

## What actually works today

**Organic posting is real.** Posts, reels and clips go out through a scheduler
that already holds the account tokens.

**Paid ads are prepared here and launched there.** Spending money through Meta,
Google or TikTok needs approved API access — a Google Ads developer token, Meta
App Review plus Business verification, TikTok Ads API approval. Those are
applications against Richard's own business accounts and take days to weeks; no
amount of code shortens them.

Until they land, each paid placement produces a deep link into the right ad
manager plus a brief with copy, budget, dates, audience and objective already
decided. The *deciding* happens here; only the final click happens there.

When a token arrives, implement `submit()` on that adapter in
[`src/lib/launch.ts`](src/lib/launch.ts) and flip its `apiReady` to `true`.
Nothing else in the app changes — which is why the adapters are a lookup table
rather than deep links sprinkled through the components.

## Running it

```bash
npm install
npm run dev
```

The demo build needs no database and no keys:

```bash
NEXT_PUBLIC_DEMO=1 npm run dev
```

Edits are real within a session and reset on reload, which is what you want
from something handed to a client to poke at.

## Deploying

Pushing to `main` publishes to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Set
**Settings → Pages → Source** to *GitHub Actions*.

The workflow currently ships the demo build (`DEMO: "1"`). To point it at a real
Supabase project, add the `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` repository secrets and set `DEMO: "0"`. The
workflow refuses to build without them rather than shipping a console that
cannot reach its database.

## Notes for whoever picks this up

- **Static export, so no dynamic route segments.** Detail pages take a query
  param (`/campanas/ver?id=…`) because Pages has no server to resolve an id
  that does not exist at build time.
- **Date-only strings are parsed as local, not UTC.** `new Date("2026-09-10")`
  is midnight UTC, which renders as the 9th in New York — see `parseDate` in
  [`src/lib/types.ts`](src/lib/types.ts).
- **The anon key is public by design.** Row Level Security decides what it can
  reach, so never put a row in a table the reader is not allowed to see. There
  is no server-side filter to fall back on.
