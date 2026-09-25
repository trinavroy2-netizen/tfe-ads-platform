"use client";

import { useEffect, useState } from "react";
import { api, Vendor } from "@/lib/api";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    allowed_domains: "",
  });

  const [error, setError] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    try {
      const data = await api.get<Vendor[]>("/api/admin/vendors");
      setVendors(data);
    } catch (err: any) {
      setError(err.message || "Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

async function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setRevealedKey(null);

  try {
    const vendor = await api.post<Vendor>(
      "/api/admin/vendors",
      form
    );

    // Show the newly generated API key immediately after creation
    if (vendor.api_key) {
      setRevealedKey(vendor.api_key);
    }

    setForm({
      name: "",
      slug: "",
      allowed_domains: "",
    });

    await load();
  } catch (err: any) {
    setError(err.message || "Failed to create vendor.");
  }
}


  async function rotate(id: string) {
    if (
      !confirm(
        "Rotate API key? The old key will stop working immediately."
      )
    ) {
      return;
    }

    try {
      const vendor = await api.post<Vendor>(
        `/api/admin/vendors/${id}/rotate-key`
      );

      setRevealedKey(vendor.api_key);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to rotate API key.");
    }
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Delete this vendor and all its placements/ads?"
      )
    ) {
      return;
    }

    try {
      await api.del(`/api/admin/vendors/${id}`);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete vendor.");
    }
  }

  return (
    <div className="min-h-full bg-[#111111] text-white">
      {/* PAGE HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-[28px] font-semibold tracking-tight">
            Vendors
          </h1>
        </div>

        <p className="text-sm text-[#999] max-w-3xl">
          Partner websites that embed the advertising widget.
          Each vendor gets a unique API key to authenticate widget
          requests.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-md border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* CREATE VENDOR */}
      <section className="mb-8 rounded-md border border-[#303030] bg-[#1c1c1c]">
        <div className="border-b border-[#303030] px-5 py-4">
          <h2 className="text-[15px] font-semibold">
            Create Vendor
          </h2>

          <p className="mt-1 text-xs text-[#888]">
            Add a website that will display your advertisements.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-5 p-5 md:grid-cols-3"
        >
          {/* NAME */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#aaa]">
              Vendor name
            </label>

            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="ToolsForEngineers"
              required
              className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
            />
          </div>

          {/* SLUG */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#aaa]">
              Slug
            </label>

            <input
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value,
                })
              }
              placeholder="toolsforengineers"
              required
              className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
            />
          </div>

          {/* DOMAIN */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#aaa]">
              Allowed domain
            </label>

            <input
              value={form.allowed_domains}
              onChange={(e) =>
                setForm({
                  ...form,
                  allowed_domains: e.target.value,
                })
              }
              placeholder="toolsforengineers.com"
              className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
            />
          </div>

          {/* BUTTON */}
          <div className="md:col-span-3 flex items-center justify-between border-t border-[#303030] pt-5">
            <p className="text-xs text-[#777]">
              API credentials will be generated automatically.
            </p>

            <button
              type="submit"
              className="h-10 rounded-md border border-[#444] bg-[#f1f1f1] px-5 text-sm font-medium text-[#111] transition hover:bg-white"
            >
              Add vendor
            </button>
          </div>
        </form>
      </section>

      {/* API KEY */}
      {revealedKey && (
        <section className="mb-8 rounded-md border border-[#3b4650] bg-[#182027]">
          <div className="px-5 py-4">
            <div className="mb-2 text-sm font-medium text-white">
              New API key
            </div>

            <p className="mb-3 text-xs text-[#8e9aa5]">
              Copy this key now. It will only be shown once.
            </p>

            <div className="rounded-md border border-[#303b44] bg-[#11171c] px-4 py-3">
              <code className="break-all text-sm text-[#d6e5ef]">
                {revealedKey}
              </code>
            </div>
          </div>
        </section>
      )}

      {/* VENDORS TABLE */}
      <section className="rounded-md border border-[#303030] bg-[#1c1c1c] overflow-hidden">
        {/* TABLE HEADER */}
        <div className="flex flex-col gap-4 border-b border-[#303030] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">
              Vendors
            </h2>

            <p className="mt-1 text-xs text-[#777]">
              Manage websites connected to the advertising system.
            </p>
          </div>

          <div className="text-xs text-[#777]">
            {vendors.length}{" "}
            {vendors.length === 1 ? "vendor" : "vendors"}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#303030] bg-[#191919]">
                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Name
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Slug
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  API Key
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Status
                </th>

                <th className="px-5 py-3 text-right text-xs font-medium text-[#888]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-[#666]"
                  >
                    Loading vendors...
                  </td>
                </tr>
              )}

              {!loading && vendors.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center"
                  >
                    <div className="text-sm text-[#777]">
                      No vendors found.
                    </div>

                    <div className="mt-1 text-xs text-[#555]">
                      Create your first vendor above.
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="border-b border-[#292929] last:border-b-0 hover:bg-[#202020]"
                  >
                    {/* NAME */}
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-white">
                        {vendor.name}
                      </div>

                      {vendor.allowed_domains && (
                        <div className="mt-1 text-xs text-[#666]">
                          {vendor.allowed_domains}
                        </div>
                      )}
                    </td>

                    {/* SLUG */}
                    <td className="px-5 py-4">
                      <code className="rounded bg-[#151515] px-2 py-1 text-xs text-[#999]">
                        {vendor.slug}
                      </code>
                    </td>

                    {/* API KEY */}
                    <td className="px-5 py-4">
                      <code className="text-xs text-[#777]">
                        {vendor.api_key.slice(0, 8)}...
                      </code>
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
                          vendor.is_active
                            ? "border-[#304735] bg-[#17221a] text-[#9fc5a5]"
                            : "border-[#4a3434] bg-[#241818] text-[#c99595]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            vendor.is_active
                              ? "bg-[#75a77d]"
                              : "bg-[#a56b6b]"
                          }`}
                        />

                        {vendor.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => rotate(vendor.id)}
                          className="h-8 rounded-md border border-[#3a3a3a] bg-[#222] px-3 text-xs text-[#ccc] transition hover:bg-[#2b2b2b] hover:text-white"
                        >
                          Rotate key
                        </button>

                        <button
                          onClick={() => remove(vendor.id)}
                          className="h-8 rounded-md border border-[#4a3030] bg-[#241919] px-3 text-xs text-[#c99] transition hover:bg-[#302020]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}