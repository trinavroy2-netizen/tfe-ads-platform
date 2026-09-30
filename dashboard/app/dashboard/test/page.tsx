"use client";

import { useState } from "react";
import AdsComponent from "@/components/AdsComponent";

export default function AdTestPage() {
  const [vendor, setVendor] = useState("toolsforengineers");
  const [placement, setPlacement] = useState("homepage");
  const [apiKey, setApiKey] = useState(
    "dc6d69ecf125479a826509afdd3e467b"
  );

  const [testConfig, setTestConfig] = useState({
    vendor: "toolsforengineers",
    placement: "homepage",
    apiKey: "dc6d69ecf125479a826509afdd3e467b",
  });

  function handleTest() {
    setTestConfig({
      vendor: vendor.trim(),
      placement: placement.trim(),
      apiKey: apiKey.trim(),
    });
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 text-[#0f172a]">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-[#64748b]">
            TFE Ads Platform
          </div>

          <h1 className="text-xl font-semibold">
            Ads Component Test
          </h1>

          <p className="mt-1 text-sm text-[#64748b]">
            Test the reusable AdsComponent with a vendor and placement.
          </p>
        </div>

        {/* Configuration */}
        <section className="mb-6 rounded-[6px] border border-[#e2e8f0] bg-white">
          <div className="border-b border-[#e2e8f0] px-5 py-4">
            <h2 className="text-sm font-semibold">
              Test Configuration
            </h2>

            <p className="mt-1 text-xs text-[#64748b]">
              Enter the same vendor configuration used by the public widget.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3">
            {/* Vendor */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Vendor Slug
              </label>

              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="toolsforengineers"
                className="h-10 w-full rounded-[4px] border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#64748b]"
              />
            </div>

            {/* Placement */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Placement
              </label>

              <input
                type="text"
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                placeholder="homepage"
                className="h-10 w-full rounded-[4px] border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#64748b]"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Vendor API Key
              </label>

              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Public vendor API key"
                className="h-10 w-full rounded-[4px] border border-[#cbd5e1] bg-white px-3 text-sm outline-none transition focus:border-[#64748b]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#e2e8f0] px-5 py-4">
            <div className="text-xs text-[#64748b]">
              API:
              <span className="ml-1 font-mono">
                {process.env.NEXT_PUBLIC_API_BASE ||
                  "API URL not configured"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTest}
              className="h-9 rounded-[4px] bg-[#0f172a] px-5 text-xs font-medium text-white transition hover:bg-[#1e293b]"
            >
              Test Component
            </button>
          </div>
        </section>

        {/* Preview */}
        <section className="rounded-[6px] border border-[#e2e8f0] bg-white">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">
                Live Component Preview
              </h2>

              <p className="mt-1 text-xs text-[#64748b]">
                {testConfig.vendor} · {testConfig.placement}
              </p>
            </div>

            <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[10px] font-medium text-[#166534]">
              TEST MODE
            </span>
          </div>

          <div className="p-5">
            <div className="mx-auto w-full max-w-[1320px]">
              <AdsComponent
                vendor={testConfig.vendor}
                placement={testConfig.placement}
                apiKey={testConfig.apiKey}
                interval={4000}
                maxWidth={1320}
              />
            </div>
          </div>
        </section>

        {/* Test information */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[6px] border border-[#e2e8f0] bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-[#64748b]">
              Vendor
            </div>
            <div className="mt-1 text-sm font-medium">
              {testConfig.vendor}
            </div>
          </div>

          <div className="rounded-[6px] border border-[#e2e8f0] bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-[#64748b]">
              Placement
            </div>
            <div className="mt-1 text-sm font-medium">
              {testConfig.placement}
            </div>
          </div>

          <div className="rounded-[6px] border border-[#e2e8f0] bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-[#64748b]">
              Rotation
            </div>
            <div className="mt-1 text-sm font-medium">
              4 seconds
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}