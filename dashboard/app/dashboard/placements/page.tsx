"use client";

import { useEffect, useState } from "react";
import { api, Placement, Vendor } from "@/lib/api";

const emptyForm = {
  vendor_id: "",
  name: "",
  slug: "",
  desktop_width: 1320,
  desktop_height: 300,
  tablet_height: 260,
  mobile_height: 220,
};

export default function PlacementsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

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
    } catch (err: any) {
      setError(err.message || "Failed to load placements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
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

      await load();
    } catch (err: any) {
      setError(
        err.message || "Failed to create placement."
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

      await load();
    } catch (err: any) {
      setError(
        err.message || "Failed to update placement."
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

      await load();
    } catch (err: any) {
      setError(
        err.message || "Failed to delete placement."
      );
    }
  }

  function vendorName(id: string) {
    return (
      vendors.find((v) => v.id === id)?.name || "—"
    );
  }

  return (
    <div className="min-h-full bg-[#111111] text-white">

      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight">
          Placements
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-[#999]">
          A placement is an advertising slot on a vendor's
          website. Configure responsive dimensions for
          desktop, tablet, and mobile screens.
        </p>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="mb-6 rounded-md border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* NO VENDOR */}
      {vendors.length === 0 ? (
        <section className="mb-8 rounded-md border border-[#303030] bg-[#1c1c1c]">
          <div className="px-5 py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#151515]">
              <span className="text-lg text-[#777]">
                +
              </span>
            </div>

            <h2 className="text-sm font-medium text-white">
              No vendors available
            </h2>

            <p className="mt-1 text-xs text-[#777]">
              Add a vendor first before creating a
              placement.
            </p>
          </div>
        </section>
      ) : (
        /* CREATE PLACEMENT */
        <section className="mb-8 rounded-md border border-[#303030] bg-[#1c1c1c]">

          {/* CARD HEADER */}
          <div className="border-b border-[#303030] px-5 py-4">
            <h2 className="text-[15px] font-semibold">
              Create Placement
            </h2>

            <p className="mt-1 text-xs text-[#777]">
              Configure an advertising slot and its
              responsive dimensions.
            </p>
          </div>

          <form
            onSubmit={handleCreate}
            className="p-5"
          >
            {/* BASIC INFORMATION */}
            <div className="mb-6">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-[#777]">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

                {/* VENDOR */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#aaa]">
                    Vendor
                  </label>

                  <select
                    value={form.vendor_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        vendor_id:
                          e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition focus:border-[#777]"
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

                {/* NAME */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#aaa]">
                    Placement name
                  </label>

                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    placeholder="Homepage"
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
                    placeholder="homepage"
                    required
                    className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
                  />
                </div>
              </div>
            </div>

            {/* RESPONSIVE DIMENSIONS */}
            <div className="border-t border-[#303030] pt-6">
              <div className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#777]">
                  Responsive Dimensions
                </h3>

                <p className="mt-1 text-xs text-[#666]">
                  Define the size of the advertising slot
                  for different screen sizes.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">

                {/* DESKTOP WIDTH */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#aaa]">
                    Desktop width
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={
                        form.desktop_width
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          desktop_width:
                            +e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 pr-12 text-sm text-white outline-none transition focus:border-[#777]"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#666]">
                      px
                    </span>
                  </div>
                </div>

                {/* DESKTOP HEIGHT */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#aaa]">
                    Desktop height
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={
                        form.desktop_height
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          desktop_height:
                            +e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 pr-12 text-sm text-white outline-none transition focus:border-[#777]"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#666]">
                      px
                    </span>
                  </div>
                </div>

                {/* TABLET */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#aaa]">
                    Tablet height
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={
                        form.tablet_height
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tablet_height:
                            +e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 pr-12 text-sm text-white outline-none transition focus:border-[#777]"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#666]">
                      px
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] text-[#555]">
                    Screens ≤ 900px
                  </p>
                </div>

                {/* MOBILE */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#aaa]">
                    Mobile height
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={
                        form.mobile_height
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mobile_height:
                            +e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 pr-12 text-sm text-white outline-none transition focus:border-[#777]"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#666]">
                      px
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] text-[#555]">
                    Screens ≤ 650px
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-6 flex flex-col gap-3 border-t border-[#303030] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#666]">
                The placement dimensions can be changed
                later.
              </p>

              <button
                type="submit"
                className="h-10 rounded-md border border-[#444] bg-[#f1f1f1] px-5 text-sm font-medium text-[#111] transition hover:bg-white"
              >
                Add placement
              </button>
            </div>
          </form>
        </section>
      )}

      {/* PLACEMENTS LIST */}
      <section className="overflow-hidden rounded-md border border-[#303030] bg-[#1c1c1c]">

        {/* HEADER */}
        <div className="flex flex-col gap-3 border-b border-[#303030] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">
              Placements
            </h2>

            <p className="mt-1 text-xs text-[#777]">
              Manage your advertising slots and responsive
              dimensions.
            </p>
          </div>

          <div className="text-xs text-[#777]">
            {placements.length}{" "}
            {placements.length === 1
              ? "placement"
              : "placements"}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">

            <thead>
              <tr className="border-b border-[#303030] bg-[#191919]">

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Vendor
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Name
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Slug
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Desktop
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Tablet
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Mobile
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

              {/* LOADING */}
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-[#666]"
                  >
                    Loading placements...
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading &&
                placements.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center"
                    >
                      <div className="text-sm text-[#777]">
                        No placements found.
                      </div>

                      <div className="mt-1 text-xs text-[#555]">
                        Create your first placement above.
                      </div>
                    </td>
                  </tr>
                )}

              {/* DATA */}
              {!loading &&
                placements.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#292929] last:border-b-0 hover:bg-[#202020]"
                  >

                    {/* VENDOR */}
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-white">
                        {vendorName(
                          p.vendor_id
                        )}
                      </div>
                    </td>

                    {/* NAME */}
                    <td className="px-5 py-4">
                      <div className="text-sm text-white">
                        {p.name}
                      </div>
                    </td>

                    {/* SLUG */}
                    <td className="px-5 py-4">
                      <code className="rounded bg-[#151515] px-2 py-1 text-xs text-[#999]">
                        {p.slug}
                      </code>
                    </td>

                    {/* DESKTOP */}
                    <td className="px-5 py-4">
                      <span className="text-xs text-[#999]">
                        {p.desktop_width}
                        ×
                        {p.desktop_height}
                      </span>
                    </td>

                    {/* TABLET */}
                    <td className="px-5 py-4">
                      <span className="text-xs text-[#999]">
                        {p.tablet_height}px
                      </span>
                    </td>

                    {/* MOBILE */}
                    <td className="px-5 py-4">
                      <span className="text-xs text-[#999]">
                        {p.mobile_height}px
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() =>
                          toggleActive(p)
                        }
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                          p.is_active
                            ? "border-[#304735] bg-[#17221a] text-[#9fc5a5] hover:bg-[#1c2a20]"
                            : "border-[#4a3434] bg-[#241818] text-[#c99595] hover:bg-[#302020]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.is_active
                              ? "bg-[#75a77d]"
                              : "bg-[#a56b6b]"
                          }`}
                        />

                        {p.is_active
                          ? "Active"
                          : "Inactive"}
                      </button>
                    </td>

                    {/* ACTION */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() =>
                            remove(p.id)
                          }
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