# Universal Multi-Vendor Ads Platform

MSI manages every vendor's advertising from one dashboard. Each vendor embeds
the **same** ad component on their site with three values — vendor, placement,
public key — and MSI controls the ads (and the component itself) centrally.

```
MSI Dashboard (Next.js) → FastAPI → PostgreSQL
                              ↑
              MSI Ads Component  (/components/msi-ads-component.js)
                              ↑
        Vendor A site   Vendor B site   Vendor C site   ...
```

ToolsForEngineers is simply the first vendor *record*. Nothing in the code
branches on a vendor name.

## Data model
`Vendor` (name, slug, public API key, allowed domains, active) →
`Placement` (name, slug, description, desktop/tablet/mobile dimensions, active) →
`Ad` (image, title, alt, target URL, active, start/end, order, new-tab) →
`AdEvent` (impression / click). Dimensions come from the placement via the API;
the component never assumes any vendor's sizes.

## Run locally
```bash
cd backend && cp .env.example .env     # set SECRET_KEY / admin password
cd .. && docker compose up --build
```
Dashboard `:3000`, API `:8000` (docs at `/docs`), Postgres `:5433`.

First steps: **Vendors** → add vendor (set *Allowed domains*) → **Placements** →
**Advertisements** → **Integration** (copy the snippet, live preview included).

## Vendor integration (any stack)
```html
<div class="msi-ad-widget"
     data-vendor="VENDOR_SLUG"
     data-placement="PLACEMENT_SLUG"
     data-api-key="VENDOR_PUBLIC_API_KEY"
     data-api-base="https://YOUR-PRODUCTION-DOMAIN"></div>
<script src="https://YOUR-PRODUCTION-DOMAIN/components/msi-ads-component.js" defer></script>
```
One script tag serves every container on the page. See `components/vendor-demo.php`.
Ad, schedule, image, link and dimension changes made in the dashboard reach the
vendor's site on its next page load — no vendor-side edit.

Behaviour: auto-rotation (`data-interval`, ms), prev/next + dots, pause on hover,
smooth transition, images `object-fit: contain` (no crop/stretch), no horizontal
overflow, slot sized from placement config (breakpoints 900px / 650px), works from
320px. Impressions count once per ad per page view, only when ≥50% of the slot is
visible; clicks are sent via `sendBeacon`. Failures render nothing.
JS API: `MSIAdsComponent.init()`, `.refresh()`, `.destroy()` (for SPAs).

## Two front-end artifacts, one contract
- `components/msi-ads-component.js` — dependency-free script vendors load (this is
  the production distribution; centrally hosted, so fixes reach all vendors).
- `dashboard/components/ads/AdsComponent.tsx` (+ `AdsComponent.module.css`,
  `adsClient.ts`, `types.ts`) — the React/TypeScript component, used for the
  dashboard's live preview and usable directly by React/Next.js vendors
  (`<AdsComponent vendor placement apiKey apiBase />`).

They implement the same behaviour against the same public API but are **separate
implementations**, not one source compiled twice; change both if you change behaviour.
I kept the vendor script framework-free deliberately: bundling React into every
vendor page adds weight and can clash with the vendor's own React.
Browser JavaScript is always inspectable; the goal is central control, not secrecy.

`backend/components/` is the copy the API serves at `/components/` — keep it in sync
with `components/` (`cp components/msi-ads-component.js backend/components/`).

## Security model
- **Public key, not a secret.** `data-api-key` identifies the vendor; it's visible
  in page source by design. Admin credentials/JWT secret never reach vendor sites.
- **Allowed domains per vendor.** Origin/Referer is checked on `/api/public/ads`
  and `/api/public/track`; `www.` variants are matched. The CORS header for the
  public API is only returned to origins in that vendor's list (no wildcard).
  **A vendor with an empty list is unrestricted** (for testing) — set it before go-live.
- Requests with no Origin header (curl/server-side) are not domain-checked; the
  key still applies. Domain checks stop casual reuse of a key on other sites, not
  a determined attacker who can spoof headers — treat the key accordingly and rotate
  if leaked.
- `/api/public/track` identifies the vendor via the ad, so its CORS response is
  permissive but the handler still enforces the domain list; tracking is not
  rate-limited (add rate limiting at your proxy before high traffic).
- Admin CORS (`CORS_ORIGINS`) is an explicit list of dashboard origins.

## Dev vs production
Copy `backend/.env.production.example`, set `ENVIRONMENT=production` (startup logs
warnings for default secrets / localhost URLs). Set `NEXT_PUBLIC_API_BASE` for the
dashboard build. Serve the API over HTTPS. The component has no baked-in URL; it
warns in the console if a non-local page omits `data-api-base`.

## Database changes
Additive only: `placements.description`, applied automatically on startup via
`ALTER TABLE … ADD COLUMN IF NOT EXISTS` (Postgres). Existing vendors, ads and events
are untouched. Introduce Alembic for any larger future change.

## Known follow-ups
- Uploaded images live on local disk; use object storage for multiple replicas.
- Dashboard JWT is in `localStorage`; consider httpOnly cookies.
- `npm audit` still lists advisories on Next 14.2.x that clear only on a major upgrade.
- Automated tests are not included; the flows were verified with scripted API checks.
