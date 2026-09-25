# TFE Ads Platform

A self-contained ad-management platform: a **Next.js dashboard** for creating and
scheduling ads, a **FastAPI + PostgreSQL** backend, and a dependency-free
**embeddable JS widget** that vendor sites (e.g. a PHP site like
ToolsForEngineers.com) drop in with two lines of markup.

```
Next.js Dashboard  →  FastAPI  →  PostgreSQL
                          ↑
                   Embeddable Widget (vanilla JS)
                          ↑
                  Vendor PHP Website (<div> + <script>)
```

This build is meant to be run **standalone first, for testing**, then the three
pieces can be integrated into your existing infrastructure independently:
- The dashboard can be deployed as its own app, or its pages/components lifted
  into an existing Next.js site.
- The backend is a normal FastAPI service — deploy it anywhere you run Python.
- The widget is one static `.js` file — host it anywhere and the vendor's PHP
  site loads it with a `<script>` tag. It needs no Next.js runtime.

---

## 1. Quick start (local testing)

Requirements: Docker + Docker Compose.

```bash
cd tfe-ads-platform/backend
cp .env.example .env        # edit SECRET_KEY, ADMIN_EMAIL/PASSWORD before real use
cd ..
docker compose up --build
```

This starts:
- **PostgreSQL** on `localhost:5433`
- **FastAPI backend** on `http://localhost:8000` (interactive docs at `/docs`)
- **Next.js dashboard** on `http://localhost:3000`

Log into the dashboard with the admin credentials from `backend/.env`
(defaults: `admin@mahavirshree.com` / `ChangeMe123!` — **change these**).

### First-time setup in the dashboard
1. **Vendors** → add a vendor, e.g. name `ToolsForEngineers`, slug
   `toolsforengineers`. This generates an API key.
2. **Placements** → add one placement per ad slot on their site — e.g.
   `Homepage`, `Hydro`, `Solar` — with the dimensions from their spec
   (defaults already match: 1320×300 desktop / 260h tablet / 220h mobile).
3. **Ads** → upload an ad image, set the destination link, optionally schedule
   a start/end date, and save. It goes live immediately if active.

### Testing the widget without touching PHP
Open `widget/demo.html` directly in a browser (or `python3 -m http.server` from
the `widget/` folder) after filling in the vendor's real API key. It talks to
`http://localhost:8000` and renders exactly what the vendor's site will show.

---

## 2. Architecture & data model

| Table        | Purpose                                                              |
|--------------|-----------------------------------------------------------------------|
| `users`      | Dashboard login (admin/editor)                                       |
| `vendors`    | A partner site embedding the widget (e.g. ToolsForEngineers), holds its API key |
| `placements` | A specific slot on that vendor's site (Homepage / Hydro / Solar), with per-breakpoint dimensions |
| `ads`        | An ad creative: image, destination link, active flag, schedule window, sort order |
| `ad_events`  | Append-only impression/click log, one row per event                   |

Ads are filtered server-side by `is_active` **and** the `start_at`/`end_at`
window, so scheduling "just works" — no cron job needed, the public endpoint
always returns only what should currently be live.

---

## 3. API reference (summary)

Full interactive docs: `http://localhost:8000/docs`

**Auth**
- `POST /api/auth/login` `{email, password}` → `{access_token}`
- `GET /api/auth/me` (Bearer token)

**Admin (all require `Authorization: Bearer <token>`)**
- `GET/POST /api/admin/vendors`, `PATCH/DELETE /api/admin/vendors/{id}`, `POST /api/admin/vendors/{id}/rotate-key`
- `GET/POST /api/admin/placements`, `PATCH/DELETE /api/admin/placements/{id}`
- `GET/POST /api/admin/ads`, `GET/PATCH/DELETE /api/admin/ads/{id}`, `POST /api/admin/ads/{id}/toggle`, `GET /api/admin/ads/{id}/stats`
- `POST /api/admin/upload` (multipart `file`) → `{url}`

**Public (called by the widget, no login — gated by vendor API key)**
- `GET /api/public/ads?vendor=<slug>&placement=<slug>` header `X-API-Key: <vendor key>`
- `POST /api/public/track` `{ad_id, event_type: "impression"|"click"}`

---

## 4. Vendor integration (PHP site)

The vendor adds this once per ad slot, anywhere in their template:

```html
<div class="tfe-ad-widget"
     data-vendor="toolsforengineers"
     data-placement="homepage"
     data-api-key="THEIR_VENDOR_API_KEY"
     data-api-base="https://ads-api.mahavirshree.com">
</div>
```

...and the widget script once per page (near the end of `<body>`, works for
every `.tfe-ad-widget` div on the page — Homepage, Hydro, Solar all share one
`<script>` tag):

```html
<script src="https://ads-api.mahavirshree.com/widget/tfe-ad-widget.js" async></script>
```

See `widget/vendor-demo.php` for a full example matching their PHP stack.

**What the widget does automatically:**
- Fetches only active, in-schedule ads for that vendor + placement
- Auto-slides through multiple ads (right-to-left), pauses on hover
- Resizes responsively at the 900px/650px breakpoints from their spec
- Fires an impression once a slide is actually visible (`IntersectionObserver`), and a click event via `sendBeacon` on click
- Fails silently (renders nothing) if the API is unreachable or no ads are active — never breaks their page

No new ad requires a vendor deploy: uploading/activating an ad in the
dashboard makes it appear on their live site on the widget's next poll of
that page load.

---

## 5. Before going to production

This build is deliberately test-ready, not production-hardened out of the
box. Before pointing it at the real ToolsForEngineers.com integration:

- **Secrets**: set a strong random `SECRET_KEY` and change the default admin
  password in `backend/.env`. Don't commit `.env`.
- **HTTPS**: put the backend behind a reverse proxy (nginx/Caddy) with TLS —
  the widget spec requires the embed URL to be `https://`.
- **CORS / API key**: `CORS_ORIGINS` in `.env` should list your dashboard's
  real domain. The widget itself isn't blocked by CORS (ads must be readable
  cross-origin from any vendor domain), so per-vendor access is controlled by
  the `X-API-Key` header instead — rotate a vendor's key from the dashboard if
  it ever leaks.
- **Auth storage**: the dashboard currently stores the JWT in `localStorage`
  for simplicity. For production, consider moving to an httpOnly cookie set
  by a small Next.js API route, or reuse your existing website's auth/SSO if
  you fold these pages into your current site instead of running them
  standalone.
- **Next.js version**: pinned to `14.2.34` (patches the Dec 2025 RCE
  advisories). `npm audit` will still show older transitive advisories that
  only clear on a Next 15/16 upgrade — worth doing before production, not
  required for local testing.
- **Database backups / migrations**: tables are created via
  `Base.metadata.create_all` on startup for simplicity. For real schema
  changes going forward, introduce Alembic migrations (the dependency is
  already in `requirements.txt`).
- **Image storage**: uploads are saved to a local `uploads/` volume. If you
  run multiple backend replicas, move this to S3-compatible object storage.

---

## 6. Folder structure

```
tfe-ads-platform/
├── backend/            FastAPI app (auth, CRUD, public widget API, uploads)
│   └── app/
│       ├── models.py, schemas.py, security.py, config.py, main.py
│       └── routers/    auth.py, vendors.py, placements.py, ads.py, upload.py, public.py
├── dashboard/          Next.js 14 + Tailwind admin dashboard
│   ├── app/            login, dashboard/{ads,placements,vendors}
│   ├── components/     Sidebar, AdForm
│   └── lib/api.ts      typed fetch client
├── widget/
│   ├── tfe-ad-widget.js   the embeddable script (also served at /widget/... by the backend)
│   ├── vendor-demo.php    example PHP integration
│   └── demo.html          local browser test page
└── docker-compose.yml  Postgres + backend + dashboard, one command
```
