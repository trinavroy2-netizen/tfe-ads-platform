
"use client";

import { useEffect, useState } from "react";
import { api, Vendor } from "@/lib/api";
import {
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Popup from "@/components/Popup";

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

const iconButtonClass = `
  flex h-6 w-6 shrink-0
  items-center justify-center
  rounded
  text-[var(--admin-muted)]
  transition-colors
  hover:bg-[var(--admin-surface-hover)]
  hover:text-[var(--admin-foreground)]
`;

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
  const [shownKeys, setShownKeys] = useState<Record<string, boolean>>({});

  // Edit domains popup
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editDomainsValue, setEditDomainsValue] = useState("");
  const [savingDomains, setSavingDomains] = useState(false);

  async function load() {
    setLoading(true);

    try {
      setVendors(
        await api.get<Vendor[]>("/api/admin/vendors")
      );
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

    try {
      await api.post<Vendor>(
        "/api/admin/vendors",
        form
      );

      setForm({
        name: "",
        slug: "",
        allowed_domains: "",
      });

      load();
    } catch (err: any) {
      setError(err.message);
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

    const v = await api.post<Vendor>(
      `/api/admin/vendors/${id}/rotate-key`
    );

    setRevealedKey(v.api_key);
    load();
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Delete this vendor and all its placements/ads?"
      )
    ) {
      return;
    }

    await api.del(
      `/api/admin/vendors/${id}`
    );

    load();
  }

  // Open edit popup
  function openEditDomains(v: Vendor) {
    setError("");
    setEditVendor(v);
    setEditDomainsValue(
      v.allowed_domains || ""
    );
  }

  // Close edit popup
  function closeEditDomains() {
    if (savingDomains) return;

    setEditVendor(null);
    setEditDomainsValue("");
  }

  // Save domains
  async function saveDomains() {
    if (!editVendor) return;

    setSavingDomains(true);
    setError("");

    try {
      await api.patch<Vendor>(
        `/api/admin/vendors/${editVendor.id}`,
        {
          allowed_domains: editDomainsValue,
        }
      );

      setEditVendor(null);
      setEditDomainsValue("");

      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingDomains(false);
    }
  }

  async function toggleActive(v: Vendor) {
    await api.patch<Vendor>(
      `/api/admin/vendors/${v.id}`,
      {
        is_active: !v.is_active,
      }
    );

    load();
  }

  return (
    <>
      <main className="admin-page !w-full !max-w-none !px-4 !py-4 sm:!px-5 lg:!px-6">

        {/* =====================================================
            Header
            ===================================================== */}
        <div className="mb-4 w-full">
          <h1 className="admin-title !text-lg">
            Vendors
          </h1>

          <p className="admin-description mt-0.5 max-w-3xl !text-[11px] !leading-4">
            Partner websites that embed the ad widget. Each
            vendor gets a unique API key to authenticate the
            widget&apos;s requests.
          </p>
        </div>

        {/* =====================================================
            Add Vendor
            ===================================================== */}
        <form
          onSubmit={handleCreate}
          className="admin-card mb-4 !w-full !p-3"
        >
          <div className="mb-2.5">
            <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
              Add vendor
            </h2>

            <p className="mt-0.5 text-[10px] leading-4 text-[var(--admin-muted)]">
              Create a vendor and configure the domain used
              by its ad widget.
            </p>
          </div>

          <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto]">

            {/* Name */}
            <div className="min-w-0">
              <label className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]">
                Name
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
                className={inputClass}
              />
            </div>

            {/* Slug */}
            <div className="min-w-0">
              <label className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]">
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
                className={inputClass}
              />
            </div>

            {/* Allowed Domains */}
            <div className="min-w-0">
              <label className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]">
                Allowed domains
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
                className={inputClass}
              />
            </div>

            {/* Add Button */}
            <div className="flex h-8 items-end">
              <button
                type="submit"
                className="
                  admin-button
                  admin-button-primary
                  !h-8
                  !whitespace-nowrap
                  !px-3
                  !py-1
                  !text-[11px]
                "
              >
                Add vendor
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-2 text-[10px] text-red-500">
              {error}
            </p>
          )}
        </form>

        {/* =====================================================
            Revealed API Key
            ===================================================== */}
        {revealedKey && (
          <div className="admin-card mb-4 !w-full !border-[var(--admin-accent)] !p-2.5">
            <p className="mb-0.5 text-[10px] text-[var(--admin-foreground)]">
              New public API key. Update it in the
              vendor&apos;s embed snippet:
            </p>

            <code className="break-all text-[10px] text-[var(--admin-accent)]">
              {revealedKey}
            </code>
          </div>
        )}

        {/* =====================================================
            Vendor Table
            ===================================================== */}
        <section className="w-full">
          <div className="mb-2">
            <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
              Vendor list
            </h2>

            <p className="mt-0.5 text-[10px] leading-4 text-[var(--admin-muted)]">
              Manage API keys, allowed domains, and vendor
              status.
            </p>
          </div>

          <div className="admin-table-card !w-full !max-w-none overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="admin-table !w-full !text-[10px]">
                <thead>
                  <tr>
                    <th className="!px-3 !py-2">
                      Name
                    </th>

                    <th className="!px-3 !py-2">
                      Slug
                    </th>

                    <th className="!px-3 !py-2">
                      Public API key
                    </th>

                    <th className="!px-3 !py-2">
                      Allowed domains
                    </th>

                    <th className="!px-3 !py-2">
                      Status
                    </th>

                    <th className="!px-3 !py-2 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {/* Loading */}
                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="
                          !px-3
                          !py-6
                          text-center
                          text-[10px]
                          text-[var(--admin-muted)]
                        "
                      >
                        Loading vendors...
                      </td>
                    </tr>
                  )}

                  {/* Empty */}
                  {!loading &&
                    vendors.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="flex flex-col items-center justify-center px-4 py-7 text-center">
                            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                              <span className="text-sm text-[var(--admin-muted)]">
                                +
                              </span>
                            </div>

                            <p className="text-[11px] font-medium text-[var(--admin-foreground)]">
                              No vendors yet
                            </p>

                            <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                              Add your first vendor above
                              to start managing advertising.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                  {/* Vendor Rows */}
                  {vendors.map((v) => (
                    <tr key={v.id}>

                      {/* Name */}
                      <td className="!px-3 !py-2">
                        <div className="font-medium text-[var(--admin-foreground)]">
                          {v.name}
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="admin-table-muted !px-3 !py-2">
                        {v.slug}
                      </td>

                      {/* API Key */}
                      <td className="admin-table-muted !px-3 !py-2">
                        <div className="flex items-center gap-1">
                          <code className="max-w-[220px] truncate text-[10px]">
                            {shownKeys[v.id]
                              ? v.api_key
                              : `${v.api_key.slice(
                                  0,
                                  8
                                )}...`}
                          </code>

                          <button
                            type="button"
                            title={
                              shownKeys[v.id]
                                ? "Hide API key"
                                : "Show API key"
                            }
                            aria-label={
                              shownKeys[v.id]
                                ? "Hide API key"
                                : "Show API key"
                            }
                            className={iconButtonClass}
                            onClick={() =>
                              setShownKeys({
                                ...shownKeys,
                                [v.id]:
                                  !shownKeys[v.id],
                              })
                            }
                          >
                            {shownKeys[v.id] ? (
                              <EyeOff
                                size={13}
                                strokeWidth={1.8}
                              />
                            ) : (
                              <Eye
                                size={13}
                                strokeWidth={1.8}
                              />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Allowed Domains */}
                      <td className="admin-table-muted !px-3 !py-2">
                        <div className="flex items-center gap-1">
                          <span className="min-w-0 truncate text-[10px]">
                            {v.allowed_domains ? (
                              v.allowed_domains
                            ) : (
                              <span className="text-yellow-500">
                                any origin
                              </span>
                            )}
                          </span>

                          <button
                            type="button"
                            title="Edit allowed domains"
                            aria-label="Edit allowed domains"
                            className={iconButtonClass}
                            onClick={() =>
                              openEditDomains(v)
                            }
                          >
                            <Pencil
                              size={13}
                              strokeWidth={1.8}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="!px-3 !py-2">
                        <button
                          type="button"
                          className={`badge !px-1.5 !py-0.5 !text-[9px] ${
                            v.is_active
                              ? "badge-active"
                              : "badge-inactive"
                          }`}
                          onClick={() =>
                            toggleActive(v)
                          }
                        >
                          {v.is_active
                            ? "Active"
                            : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="!px-3 !py-2">
                        <div className="flex items-center justify-end gap-0.5">

                          {/* Rotate */}
                          <button
                            type="button"
                            title="Rotate API key"
                            aria-label="Rotate API key"
                            className={iconButtonClass}
                            onClick={() =>
                              rotate(v.id)
                            }
                          >
                            <RefreshCw
                              size={13}
                              strokeWidth={1.8}
                            />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            title="Delete vendor"
                            aria-label="Delete vendor"
                            className="
                              flex h-6 w-6
                              items-center justify-center
                              rounded
                              text-[var(--admin-muted)]
                              transition-colors
                              hover:bg-red-500/10
                              hover:text-red-500
                            "
                            onClick={() =>
                              remove(v.id)
                            }
                          >
                            <Trash2
                              size={13}
                              strokeWidth={1.8}
                            />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          Edit Allowed Domains Popup
          ========================================================= */}
      <Popup
        open={!!editVendor}
        onClose={closeEditDomains}
        title="Edit allowed domains"
        description={
          editVendor
            ? `Update the domains allowed to use ${editVendor.name}'s ad widget.`
            : undefined
        }
        footer={
          <>
            <button
              type="button"
              onClick={closeEditDomains}
              disabled={savingDomains}
              className="
                admin-button
                !px-3
                !py-1.5
                !text-[11px]
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveDomains}
              disabled={savingDomains}
              className="
                admin-button
                admin-button-primary
                !px-3
                !py-1.5
                !text-[11px]
              "
            >
              {savingDomains
                ? "Saving..."
                : "Save changes"}
            </button>
          </>
        }
      >
        <div>
          <label className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]">
            Allowed domains
          </label>

          <input
            value={editDomainsValue}
            onChange={(e) =>
              setEditDomainsValue(e.target.value)
            }
            placeholder="example.com,www.example.com"
            autoFocus
            className={inputClass}
          />

          <p className="mt-1.5 text-[10px] leading-4 text-[var(--admin-muted)]">
            Use comma-separated domains. Leave empty to
            allow any origin during testing.
          </p>
        </div>
      </Popup>
    </>
  );
}