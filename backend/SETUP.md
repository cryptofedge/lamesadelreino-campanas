# Turning the console on for real

Right now the console runs on fixtures — everything resets on reload. This is
what moves it onto a real database, and then what makes the connect buttons do
the OAuth themselves.

Three stages. **Stage 1 is worth doing on its own**: it makes the data real and
the calendar live. Stage 3 is the only one that needs anything from the
platforms, and it is the slow one.

---

## Stage 1 — a real database (about 20 minutes)

Nothing here needs anyone's approval.

1. Create a Supabase project at [supabase.com](https://supabase.com). Any
   region near New York.
2. **SQL Editor → paste `schema.sql` → Run.** The last query prints a table;
   every row should say `rls = true`. `oauth_tokens` should show **0 policies** —
   that is deliberate, see below.
3. **Project Settings → API** — copy the Project URL and the publishable
   (`sb_publishable_…`) key.
4. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. In `.github/workflows/deploy.yml`, change `DEMO: "1"` to `DEMO: "0"` and push.

The workflow refuses to build without those two secrets rather than shipping a
console that cannot reach its database.

**Create the two accounts** in Authentication → Users (Richard, and the team
account), then run the `insert into profiles` block from the restaurant
console's `CREATE_OWNERS.sql`, pointed at these emails.

> **Why `oauth_tokens` has no policy.** RLS on with no policy denies everything
> that arrives with the public key — including the owner's session. Only an Edge
> Function using the service role can read it. Add a policy there and the access
> token for the ministry's Instagram becomes readable by anyone who opens
> devtools on the console.

---

## Stage 2 — the live calendar (about 10 minutes)

Makes the calendar a real subscription instead of a downloaded snapshot: change
a campaign and everyone's calendar updates itself.

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>

# The URL is the credential — calendar apps cannot send a header.
# Make this long and random, and treat it like a password.
supabase secrets set FEED_TOKEN="$(openssl rand -hex 24)"

supabase functions deploy calendar-feed --no-verify-jwt
```

Subscribe with the printed URL plus `?t=<the token>`:

- **Google Calendar** → Other calendars → From URL
- **Apple Calendar** → File → New Calendar Subscription

Anyone holding that URL can read the schedule, so share it like a password. If
it leaks, `supabase secrets set FEED_TOKEN=…` a new one and the old URL 404s.

---

## Stage 3 — one-click connect (days to weeks, mostly waiting)

This is where the Conectar buttons stop being a guided checklist and start doing
the OAuth themselves. The code is written; what it needs is an app registered
with each platform, and **only Richard can create those** — they are tied to his
business accounts and require agreeing to developer terms.

### First, the shared secrets

```bash
supabase secrets set OAUTH_STATE_SECRET="$(openssl rand -hex 32)"
supabase secrets set PUBLIC_FUNCTION_URL="https://<ref>.supabase.co/functions/v1/oauth"
supabase secrets set CONSOLE_URL="https://cryptofedge.github.io/lamesadelreino-campanas"
supabase functions deploy oauth --no-verify-jwt
```

The redirect URI to register with every platform below is exactly:

```
https://<ref>.supabase.co/functions/v1/oauth/callback
```

### Meta — Facebook and Instagram

1. [developers.facebook.com](https://developers.facebook.com) → **Create App** →
   type **Business**.
2. Add the **Facebook Login** product; put the redirect URI in *Valid OAuth
   Redirect URIs*.
3. App settings → Basic → copy the App ID and App Secret.

```bash
supabase secrets set META_CLIENT_ID=… META_CLIENT_SECRET=…
```

While the app is in development mode it only works for accounts listed as
testers — which is fine for Richard's own accounts, and means **you can use it
before App Review**. Review is only needed to connect accounts outside the team.

### Google — YouTube

1. [console.cloud.google.com](https://console.cloud.google.com) → new project.
2. Enable the **YouTube Data API v3**.
3. OAuth consent screen → External. Add Richard as a test user.
4. Credentials → OAuth client ID → **Web application** → add the redirect URI.

```bash
supabase secrets set GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=…
```

Unverified apps show a "Google hasn't verified this app" warning and cap at 100
users. For one channel that is nothing — click *Advanced → Go to…* and proceed.

### TikTok

1. [developers.tiktok.com](https://developers.tiktok.com) → create an app.
2. Add **Login Kit** and **Content Posting API**; set the redirect URI.

```bash
supabase secrets set TIKTOK_CLIENT_KEY=… TIKTOK_CLIENT_SECRET=…
```

TikTok reviews before granting `video.publish`. This is the slowest of the three.

---

## What this still does not do

**None of it buys ads.** Posting and buying are separate permissions everywhere:

| | Posting | Buying ads |
|---|---|---|
| Meta | app in dev mode is enough | App Review **and** business verification |
| Google | test user is enough | approved Ads API developer token |
| TikTok | Content Posting review | separate Ads API approval |

So Stage 3 makes the **organic** side genuinely one-click. Paid stays a prepared
brief and a deep link into the ad manager until those approvals land — and the
console will keep saying so rather than showing a green tick it has not earned.

**TikTok Promote**, inside the phone app, remains the one way to put money behind
a video with no approval at all.
