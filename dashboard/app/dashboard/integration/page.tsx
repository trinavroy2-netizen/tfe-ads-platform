"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clipboard,
  Code2,
  Eye,
  Globe2,
  KeyRound,
} from "lucide-react";

import {
  api,
  API_BASE,
  Vendor,
  Placement,
} from "@/lib/api";

import AdsComponent from "@/components/ads/AdsComponent";

const inputClass = `
  w-full
  !h-8
  !px-2.5
  !text-[11px]
  focus:!border-white
  focus:!ring-1
  focus:!ring-white/40
  focus:!shadow-[0_0_8px_rgba(255,255,255,0.12)]
  focus:!outline-none
`;

export default function IntegrationPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [placementSlug, setPlacementSlug] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Vendor[]>("/api/admin/vendors"),
      api.get<Placement[]>("/api/admin/placements"),
    ]).then(([v, p]) => {
      setVendors(v);
      setPlacements(p);

      if (v.length) {
        setVendorId(v[0].id);
      }
    });
  }, []);

  const vendor = vendors.find(
    (v) => v.id === vendorId
  );

  const vendorPlacements = placements.filter(
    (p) => p.vendor_id === vendorId
  );

  const activePlacementSlug =
    placementSlug ||
    vendorPlacements[0]?.slug ||
    "homepage";

  const snippet = vendor
    ? `<div
  class="msi-ad-widget"
  data-vendor="${vendor.slug}"
  data-placement="${activePlacementSlug}"
  data-api-key="${vendor.api_key}"
  data-api-base="${API_BASE}">
</div>

<script
  src="${API_BASE}/components/msi-ads-component.js"
  defer>
</script>`
    : "";

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  }

  function handleVendorChange(
    value: string
  ) {
    setVendorId(value);
    setPlacementSlug("");
  }

  return (
    <main className="admin-page !w-full !max-w-none !px-4 !py-4 sm:!px-5 lg:!px-6">
      {/* HEADER */}
      <div className="mb-5 flex w-full items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <Code2
            size={15}
            strokeWidth={1.7}
            className="text-[var(--admin-foreground)]"
          />
        </div>

        <div className="min-w-0">
          <h1 className="admin-title !text-lg">
            Integration
          </h1>

          <p className="admin-description mt-0.5 max-w-4xl !text-[11px] !leading-4">
            Generate the exact embed snippet for each
            vendor. The same component works with PHP,
            WordPress, Laravel, static HTML, or any
            JavaScript framework.
          </p>
        </div>
      </div>

      {/* EMPTY STATE */}
      {vendors.length === 0 ? (
        <div className="admin-card !w-full !p-5">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
              <Globe2
                size={16}
                strokeWidth={1.7}
                className="text-[var(--admin-muted)]"
              />
            </div>

            <h2 className="text-xs font-medium text-[var(--admin-foreground)]">
              No vendors available
            </h2>

            <p className="mt-1 text-[10px] text-[var(--admin-muted)]">
              Add a vendor first to generate an
              integration snippet.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          {/* CONFIGURATION */}
          <section className="admin-card !w-full !p-3.5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
                <Globe2
                  size={12}
                  strokeWidth={1.7}
                  className="text-[var(--admin-foreground)]"
                />
              </div>

              <div>
                <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                  Integration configuration
                </h2>

                <p className="text-[9px] text-[var(--admin-muted)]">
                  Select the vendor and placement to
                  generate its embed code.
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
              {/* VENDOR */}
              <div className="min-w-0">
                <label
                  htmlFor="integration-vendor"
                  className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
                >
                  Vendor
                </label>

                <select
                  id="integration-vendor"
                  className={inputClass}
                  value={vendorId}
                  onChange={(e) =>
                    handleVendorChange(
                      e.target.value
                    )
                  }
                >
                  {vendors.map((v) => (
                    <option
                      key={v.id}
                      value={v.id}
                    >
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* PLACEMENT */}
              <div className="min-w-0">
                <label
                  htmlFor="integration-placement"
                  className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
                >
                  Placement
                </label>

                <select
                  id="integration-placement"
                  className={inputClass}
                  value={activePlacementSlug}
                  onChange={(e) =>
                    setPlacementSlug(
                      e.target.value
                    )
                  }
                >
                  {vendorPlacements.length === 0 && (
                    <option value="homepage">
                      homepage (create one on the
                      Placements page)
                    </option>
                  )}

                  {vendorPlacements.map((p) => (
                    <option
                      key={p.id}
                      value={p.slug}
                    >
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SELECTED DETAILS */}
            {vendor && (
              <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
                <InfoItem
                  label="Vendor"
                  value={vendor.name}
                />

                <InfoItem
                  label="Slug"
                  value={vendor.slug}
                />

                <InfoItem
                  label="Placement"
                  value={activePlacementSlug}
                />
              </div>
            )}
          </section>

          {/* EMBED SNIPPET */}
          <section className="admin-card !w-full !overflow-hidden !p-0">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
                  <Code2
                    size={12}
                    strokeWidth={1.7}
                    className="text-[var(--admin-foreground)]"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                    Embed snippet
                  </h2>

                  <p className="text-[9px] text-[var(--admin-muted)]">
                    Paste this code into the vendor&apos;s
                    website.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={copy}
                title={
                  copied
                    ? "Copied"
                    : "Copy snippet"
                }
                aria-label={
                  copied
                    ? "Copied"
                    : "Copy snippet"
                }
                className="
                  flex h-7 w-7 shrink-0
                  items-center justify-center
                  rounded-md
                  border border-[var(--admin-border)]
                  bg-[var(--admin-surface)]
                  text-[var(--admin-muted)]
                  transition-all
                  hover:bg-[var(--admin-surface-hover)]
                  hover:text-[var(--admin-foreground)]
                  focus:border-white
                  focus:outline-none
                  focus:ring-1
                  focus:ring-white/30
                "
              >
                {copied ? (
                  <Check
                    size={13}
                    strokeWidth={2}
                  />
                ) : (
                  <Clipboard
                    size={13}
                    strokeWidth={1.8}
                  />
                )}
              </button>
            </div>

            <div className="w-full bg-[#0d0d0f] px-3 py-3 sm:px-4">
              <pre className="w-full whitespace-pre-wrap break-words font-mono text-[9px] leading-4 text-[#d4d4d8] sm:text-[10px] sm:leading-5">
                {snippet}
              </pre>
            </div>
          </section>

          {/* LIVE PREVIEW */}
          {vendor && (
            <section className="admin-card !w-full !p-3.5">
              <div className="mb-3 flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
                  <Eye
                    size={12}
                    strokeWidth={1.7}
                    className="text-[var(--admin-foreground)]"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                    Live preview
                  </h2>

                  <p className="mt-0.5 text-[9px] leading-4 text-[var(--admin-muted)]">
                    This uses the same universal ad
                    component and public API that the
                    vendor website will use.
                  </p>
                </div>
              </div>

              <div className="w-full overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3">
                <AdsComponent
                  key={`${vendor.id}-${activePlacementSlug}`}
                  vendor={vendor.slug}
                  placement={activePlacementSlug}
                  apiKey={vendor.api_key}
                  apiBase={API_BASE}
                />
              </div>
            </section>
          )}

          {/* SECURITY / INTEGRATION INFO */}
          {vendor && (
            <section className="admin-card !w-full !p-3.5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
                  <KeyRound
                    size={12}
                    strokeWidth={1.7}
                    className="text-[var(--admin-foreground)]"
                  />
                </div>

                <div>
                  <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                    Integration notes
                  </h2>

                  <p className="text-[9px] text-[var(--admin-muted)]">
                    Important information for production
                    integrations.
                  </p>
                </div>
              </div>

              <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
                <InfoNote
                  title="Public API key"
                  description="data-api-key is this vendor's public integration key. It is designed to be included in vendor-facing HTML."
                />

                <InfoNote
                  title="Allowed domains"
                  description="Configure the vendor's allowed domains from the Vendors page so only approved websites can render their ads."
                />

                <InfoNote
                  title="Ad updates"
                  description="Changes made in the dashboard are picked up automatically by the widget. The vendor does not need to redeploy their website."
                />

                <InfoNote
                  title="Key rotation"
                  description="If the integration key is exposed or needs to be replaced, rotate it from the Vendors page and update the vendor snippet."
                />
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] px-2.5 py-2">
      <div className="text-[8px] uppercase tracking-wide text-[var(--admin-subtle)]">
        {label}
      </div>

      <div className="mt-0.5 break-words text-[10px] font-medium text-[var(--admin-foreground)]">
        {value}
      </div>
    </div>
  );
}

function InfoNote({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-2.5">
      <div className="text-[10px] font-medium text-[var(--admin-foreground)]">
        {title}
      </div>

      <p className="mt-1 break-words text-[9px] leading-4 text-[var(--admin-muted)]">
        {description}
      </p>
    </div>
  );
}