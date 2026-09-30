
"use client";

import { useEffect, useState } from "react";
import { api, Placement, Vendor } from "@/lib/api";
import {
  ChevronDown,
  ChevronUp,
  Ruler,
  Trash2,
} from "lucide-react";

const emptyForm = {
  vendor_id: "",
  name: "",
  slug: "",
  description: "",
  desktop_width: 1320,
  desktop_height: 300,
  tablet_height: 260,
  mobile_height: 220,
};

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
  flex h-6 w-6
  items-center justify-center
  rounded
  text-[var(--admin-muted)]
  transition-colors
  hover:bg-red-500/10
  hover:text-red-500
`;

export default function PlacementsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  // Responsive dimensions are hidden by default.
  const [showDimensions, setShowDimensions] =
    useState(false);

  async function load() {
    setLoading(true);

    try {
      const [v, p] = await Promise.all([
        api.get<Vendor[]>("/api/admin/vendors"),
        api.get<Placement[]>("/api/admin/placements"),
      ]);

      setVendors(v);
      setPlacements(p);

      if (!form.vendor_id && v.length) {
        setForm((f) => ({
          ...f,
          vendor_id: v[0].id,
        }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(
    e: React.FormEvent
  ) {
    e.preventDefault();
    setError("");

    try {
      await api.post<Placement>(
        "/api/admin/placements",
        form
      );

      setForm({
        ...emptyForm,
        vendor_id: form.vendor_id,
      });

      // Keep dimensions collapsed after creation.
      setShowDimensions(false);

      load();
    } catch (err: any) {
      setError(
        err?.message || "Unable to create placement."
      );
    }
  }

  async function toggleActive(p: Placement) {
    try {
      await api.patch<Placement>(
        `/api/admin/placements/${p.id}`,
        {
          is_active: !p.is_active,
        }
      );

      load();
    } catch (err: any) {
      setError(
        err?.message || "Unable to update placement."
      );
    }
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Delete this placement and all its ads?"
      )
    ) {
      return;
    }

    try {
      await api.del(
        `/api/admin/placements/${id}`
      );

      load();
    } catch (err: any) {
      setError(
        err?.message || "Unable to delete placement."
      );
    }
  }

  function vendorName(id: string) {
    return (
      vendors.find((v) => v.id === id)?.name ||
      "—"
    );
  }

  return (
    <main className="admin-page !w-full !max-w-none !px-4 !py-4 sm:!px-5 lg:!px-6">
      {/* =====================================================
          HEADER
          ===================================================== */}
      <div className="mb-4 w-full">
        <h1 className="admin-title !text-lg">
          Placements
        </h1>

        <p className="admin-description mt-0.5 max-w-3xl !text-[11px] !leading-4">
          A slot on a vendor&apos;s site — e.g.
          Homepage, Hydro Dashboard, Solar Dashboard —
          with its own responsive dimensions.
        </p>
      </div>

      {/* =====================================================
          ADD PLACEMENT
          ===================================================== */}
      {vendors.length === 0 ? (
        <div className="admin-card mb-4 !w-full !p-3">
          <p className="text-[10px] text-[var(--admin-muted)]">
            Add a vendor first before creating
            placements.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleCreate}
          className="admin-card mb-4 !w-full !p-3"
        >
          <div className="mb-2.5">
            <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
              Add placement
            </h2>

            <p className="mt-0.5 text-[10px] leading-4 text-[var(--admin-muted)]">
              Create a responsive ad slot and define
              its display settings.
            </p>
          </div>

          {/* =================================================
              MAIN FIELDS
              ================================================= */}
          <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            {/* Vendor */}
            <div className="min-w-0">
              <label
                htmlFor="placement-vendor"
                className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
              >
                Vendor
              </label>

              <select
                id="placement-vendor"
                value={form.vendor_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vendor_id: e.target.value,
                  })
                }
                className={inputClass}
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

            {/* Name */}
            <div className="min-w-0">
              <label
                htmlFor="placement-name"
                className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
              >
                Name
              </label>

              <input
                id="placement-name"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                placeholder="Homepage"
                required
                className={inputClass}
              />
            </div>

            {/* Slug */}
            <div className="min-w-0">
              <label
                htmlFor="placement-slug"
                className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
              >
                Slug
              </label>

              <input
                id="placement-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value,
                  })
                }
                placeholder="homepage"
                required
                className={inputClass}
              />
            </div>

            {/* Add button */}
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
                Add placement
              </button>
            </div>
          </div>

          {/* =================================================
              DESCRIPTION
              ================================================= */}
          <div className="mt-2.5">
            <label
              htmlFor="placement-description"
              className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
            >
              Description
              <span className="ml-1 font-normal text-[var(--admin-muted)]">
                (optional)
              </span>
            </label>

            <input
              id="placement-description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              placeholder="e.g. Banner above the engineering fields grid"
              className={inputClass}
            />
          </div>

          {/* =================================================
              DIMENSIONS TOGGLE
              ================================================= */}
          <div className="mt-2.5 border-t border-[var(--admin-border)] pt-2.5">
            <button
              type="button"
              onClick={() =>
                setShowDimensions(
                  (current) => !current
                )
              }
              className="
                flex
                w-full
                items-center
                justify-between
                rounded-md
                border
                border-[var(--admin-border)]
                bg-[var(--admin-surface-hover)]
                px-2.5
                py-2
                text-left
                transition-colors
                hover:bg-[var(--admin-surface)]
              "
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <Ruler
                    size={12}
                    strokeWidth={1.7}
                    className="text-[var(--admin-foreground)]"
                  />
                </span>

                <span className="min-w-0">
                  <span className="block text-[10px] font-medium text-[var(--admin-foreground)]">
                    Responsive dimensions
                  </span>

                  <span className="mt-0.5 block text-[9px] text-[var(--admin-muted)]">
                    Configure desktop, tablet and mobile
                    ad heights.
                  </span>
                </span>
              </span>

              <span className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--admin-muted)]">
                {showDimensions ? (
                  <ChevronUp
                    size={14}
                    strokeWidth={1.8}
                  />
                ) : (
                  <ChevronDown
                    size={14}
                    strokeWidth={1.8}
                  />
                )}
              </span>
            </button>

            {/* =================================================
                DIMENSIONS — HIDDEN BY DEFAULT
                ================================================= */}
            {showDimensions && (
              <div className="mt-2.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-2.5">
                <div className="mb-2 text-[9px] text-[var(--admin-muted)]">
                  Default dimensions are pre-filled. You
                  can change them if this placement has
                  different vendor requirements.
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {/* Desktop Width */}
                  <div className="min-w-0">
                    <label
                      htmlFor="desktop-width"
                      className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                    >
                      Desktop width (px)
                    </label>

                    <input
                      id="desktop-width"
                      type="number"
                      min="1"
                      value={form.desktop_width}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          desktop_width:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* Desktop Height */}
                  <div className="min-w-0">
                    <label
                      htmlFor="desktop-height"
                      className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                    >
                      Desktop height (px)
                    </label>

                    <input
                      id="desktop-height"
                      type="number"
                      min="1"
                      value={form.desktop_height}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          desktop_height:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* Tablet Height */}
                  <div className="min-w-0">
                    <label
                      htmlFor="tablet-height"
                      className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                    >
                      Tablet height ≤900px
                    </label>

                    <input
                      id="tablet-height"
                      type="number"
                      min="1"
                      value={form.tablet_height}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tablet_height:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      className={inputClass}
                    />
                  </div>

                  {/* Mobile Height */}
                  <div className="min-w-0">
                    <label
                      htmlFor="mobile-height"
                      className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                    >
                      Mobile height ≤650px
                    </label>

                    <input
                      id="mobile-height"
                      type="number"
                      min="1"
                      value={form.mobile_height}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mobile_height:
                            Number(
                              e.target.value
                            ),
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="mt-2 text-[10px] text-red-500">
              {error}
            </p>
          )}
        </form>
      )}

      {/* =====================================================
          PLACEMENT LIST
          ===================================================== */}
      <section className="w-full">
        <div className="mb-2">
          <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
            Placement list
          </h2>

          <p className="mt-0.5 text-[10px] leading-4 text-[var(--admin-muted)]">
            Manage placement dimensions and active
            status for each vendor.
          </p>
        </div>

        <div className="admin-table-card !w-full !max-w-none overflow-hidden">
          <div className="w-full">
            <table className="admin-table !w-full table-fixed !text-[10px]">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
              </colgroup>

              {/* Table Header */}
              <thead>
                <tr>
                  <th className="!px-3 !py-2 text-left">
                    Vendor
                  </th>

                  <th className="!px-3 !py-2 text-left">
                    Name
                  </th>

                  <th className="!px-3 !py-2 text-left">
                    Slug
                  </th>

                  <th className="!px-3 !py-2 text-left">
                    Desktop
                  </th>

                  <th className="!px-3 !py-2 text-left">
                    Tablet
                  </th>

                  <th className="!px-3 !py-2 text-left">
                    Mobile
                  </th>

                  <th className="!px-3 !py-2 text-left">
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
                      colSpan={8}
                      className="
                        !px-3
                        !py-6
                        text-center
                        text-[10px]
                        text-[var(--admin-muted)]
                      "
                    >
                      Loading placements...
                    </td>
                  </tr>
                )}

                {/* Empty */}
                {!loading &&
                  placements.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center justify-center px-4 py-7 text-center">
                          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                            <Ruler
                              size={13}
                              strokeWidth={1.7}
                              className="text-[var(--admin-muted)]"
                            />
                          </div>

                          <p className="text-[11px] font-medium text-[var(--admin-foreground)]">
                            No placements yet
                          </p>

                          <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                            Create your first placement
                            above to start serving
                            advertisements.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                {/* Placement Rows */}
                {placements.map((p) => (
                  <tr key={p.id}>
                    {/* Vendor */}
                    <td className="!px-3 !py-2 align-top">
                      <div className="break-words font-medium text-[var(--admin-foreground)]">
                        {vendorName(p.vendor_id)}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="!px-3 !py-2 align-top">
                      <div className="break-words font-medium text-[var(--admin-foreground)]">
                        {p.name}
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="admin-table-muted !px-3 !py-2 align-top">
                      <div className="min-w-0">
                        <div className="break-words text-[10px]">
                          {p.slug}
                        </div>

                        {p.description && (
                          <div className="mt-0.5 break-words text-[9px] text-[var(--admin-muted)]">
                            {p.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Desktop */}
                    <td className="admin-table-muted !px-3 !py-2 align-top break-words">
                      {p.desktop_width}×
                      {p.desktop_height}
                    </td>

                    {/* Tablet */}
                    <td className="admin-table-muted !px-3 !py-2 align-top break-words">
                      {p.tablet_height}h
                    </td>

                    {/* Mobile */}
                    <td className="admin-table-muted !px-3 !py-2 align-top break-words">
                      {p.mobile_height}h
                    </td>

                    {/* Status */}
                    <td className="!px-3 !py-2 align-top">
                      <button
                        type="button"
                        className={`badge !px-1.5 !py-0.5 !text-[9px] ${
                          p.is_active
                            ? "badge-active"
                            : "badge-inactive"
                        }`}
                        onClick={() =>
                          toggleActive(p)
                        }
                      >
                        {p.is_active
                          ? "Active"
                          : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="!px-3 !py-2 align-top">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          title="Delete placement"
                          aria-label="Delete placement"
                          className={iconButtonClass}
                          onClick={() =>
                            remove(p.id)
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
  );
}