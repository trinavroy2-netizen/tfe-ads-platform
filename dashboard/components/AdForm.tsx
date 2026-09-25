"use client";

import { useState } from "react";
import { api, Ad, Placement, API_BASE, getToken } from "@/lib/api";

function toLocalInput(dt: string | null) {
  if (!dt) return "";
  return dt.slice(0, 16);
}

export default function AdForm({
  placements,
  editingAd,
  onSaved,
  onCancel,
}: {
  placements: Placement[];
  editingAd: Ad | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    placement_id: editingAd?.placement_id || placements[0]?.id || "",
    title: editingAd?.title || "",
    image_url: editingAd?.image_url || "",
    target_url: editingAd?.target_url || "",
    alt_text: editingAd?.alt_text || "",
    sort_order: editingAd?.sort_order ?? 0,
    start_at: toLocalInput(editingAd?.start_at ?? null),
    end_at: toLocalInput(editingAd?.end_at ?? null),
    open_in_new_tab: editingAd?.open_in_new_tab ?? true,
    is_active: editingAd?.is_active ?? true,
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });

      if (!res.ok)
        throw new Error((await res.json()).detail || "Upload failed");

      const data = await res.json();

      setForm((f) => ({
        ...f,
        image_url: data.url,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      ...form,
      start_at: form.start_at
        ? new Date(form.start_at).toISOString()
        : null,
      end_at: form.end_at
        ? new Date(form.end_at).toISOString()
        : null,
    };

    try {
      if (editingAd) {
        await api.patch(`/api/admin/ads/${editingAd.id}`, payload);
      } else {
        await api.post("/api/admin/ads", payload);
      }

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-[#303030] bg-[#1c1c1c] overflow-hidden"
    >
      {/* HEADER */}
      <div className="border-b border-[#303030] px-5 py-4">
        <h2 className="text-[15px] font-semibold text-white">
          {editingAd ? "Edit Ad" : "Create Ad"}
        </h2>

        <p className="mt-1 text-xs text-[#888]">
          {editingAd
            ? "Update the advertisement details and display settings."
            : "Create an advertisement and configure where and when it should appear."}
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mx-5 mt-5 rounded-md border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* FORM CONTENT */}
      <div className="space-y-6 p-5">
        {/* BASIC INFORMATION */}
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white">
              Basic Information
            </h3>

            <p className="mt-1 text-xs text-[#777]">
              Define the placement and internal advertisement reference.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* PLACEMENT */}
            <div>
              <label className="mb-2 block text-xs font-medium text-[#aaa]">
                Placement
              </label>

              <select
                value={form.placement_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    placement_id: e.target.value,
                  })
                }
                className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition focus:border-[#777]"
              >
                {placements.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* TITLE */}
            <div>
              <label className="mb-2 block text-xs font-medium text-[#aaa]">
                Title
              </label>

              <input
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                placeholder="Summer campaign"
                required
                className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
              />

              <p className="mt-1.5 text-[11px] text-[#666]">
                Internal reference name for this advertisement.
              </p>
            </div>
          </div>
        </div>

        {/* AD IMAGE */}
        <div className="border-t border-[#303030] pt-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white">
              Advertisement Creative
            </h3>

            <p className="mt-1 text-xs text-[#777]">
              Upload the advertisement image or provide an image URL.
            </p>
          </div>

          {/* UPLOAD AREA */}
          <div className="rounded-md border border-dashed border-[#3a3a3a] bg-[#151515] p-5">
            <label className="mb-2 block text-xs font-medium text-[#aaa]">
              Ad image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="block w-full text-xs text-[#888] file:mr-4 file:rounded-md file:border file:border-[#444] file:bg-[#222] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#ccc] file:transition hover:file:bg-[#2b2b2b]"
            />

            {uploading && (
              <p className="mt-2 text-xs text-[#888]">
                Uploading image...
              </p>
            )}

            {form.image_url && (
              <div className="mt-4 flex flex-col gap-4 rounded-md border border-[#303030] bg-[#191919] p-3 sm:flex-row sm:items-center">
                <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#303030] bg-[#111]">
                  <img
                    src={form.image_url}
                    alt="preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <label className="mb-2 block text-xs font-medium text-[#aaa]">
                    Image URL
                  </label>

                  <input
                    value={form.image_url}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        image_url: e.target.value,
                      })
                    }
                    placeholder="https://example.com/ad.jpg"
                    className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
                  />
                </div>
              </div>
            )}

            {!form.image_url && (
              <input
                className="mt-3 h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
                value={form.image_url}
                onChange={(e) =>
                  setForm({
                    ...form,
                    image_url: e.target.value,
                  })
                }
                placeholder="or paste an image URL"
              />
            )}
          </div>
        </div>

        {/* DESTINATION */}
        <div className="border-t border-[#303030] pt-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white">
              Destination
            </h3>

            <p className="mt-1 text-xs text-[#777]">
              Configure the link users will open when they interact with the ad.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[#aaa]">
              Destination link (CTA)
            </label>

            <input
              value={form.target_url}
              onChange={(e) =>
                setForm({
                  ...form,
                  target_url: e.target.value,
                })
              }
              placeholder="https://advertiser-site.com/campaign"
              required
              className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
            />
          </div>
        </div>

        {/* DISPLAY SETTINGS */}
        <div className="border-t border-[#303030] pt-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white">
              Display Settings
            </h3>

            <p className="mt-1 text-xs text-[#777]">
              Configure accessibility, ordering and display timing.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* ALT TEXT */}
            <div>
              <label className="mb-2 block text-xs font-medium text-[#aaa]">
                Alt text
              </label>

              <input
                value={form.alt_text}
                onChange={(e) =>
                  setForm({
                    ...form,
                    alt_text: e.target.value,
                  })
                }
                placeholder="Advertisement description"
                className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition placeholder:text-[#666] focus:border-[#777]"
              />
            </div>

            {/* SORT ORDER */}
            <div>
              <label className="mb-2 block text-xs font-medium text-[#aaa]">
                Sort order
              </label>

              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sort_order: +e.target.value,
                  })
                }
                className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition focus:border-[#777]"
              />

              <p className="mt-1.5 text-[11px] text-[#666]">
                Lower values are shown first.
              </p>
            </div>

            {/* START */}
            <div>
              <label className="mb-2 block text-xs font-medium text-[#aaa]">
                Start showing at
              </label>

              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_at: e.target.value,
                  })
                }
                className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition focus:border-[#777]"
              />

              <p className="mt-1.5 text-[11px] text-[#666]">
                Optional. Leave empty to start immediately.
              </p>
            </div>

            {/* END */}
            <div>
              <label className="mb-2 block text-xs font-medium text-[#aaa]">
                Stop showing at
              </label>

              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) =>
                  setForm({
                    ...form,
                    end_at: e.target.value,
                  })
                }
                className="h-10 w-full rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-white outline-none transition focus:border-[#777]"
              />

              <p className="mt-1.5 text-[11px] text-[#666]">
                Optional. Leave empty for no end date.
              </p>
            </div>
          </div>
        </div>

        {/* OPTIONS */}
        <div className="border-t border-[#303030] pt-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white">
              Behaviour
            </h3>

            <p className="mt-1 text-xs text-[#777]">
              Control how the advertisement behaves when displayed.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[#303030] bg-[#151515] px-4 py-3 text-sm text-[#ccc] transition hover:bg-[#191919]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#f1f1f1]"
                checked={form.open_in_new_tab}
                onChange={(e) =>
                  setForm({
                    ...form,
                    open_in_new_tab: e.target.checked,
                  })
                }
              />

              <span>
                <span className="block text-xs font-medium text-[#ddd]">
                  Open link in new tab
                </span>

                <span className="mt-0.5 block text-[11px] text-[#666]">
                  Opens the destination separately.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[#303030] bg-[#151515] px-4 py-3 text-sm text-[#ccc] transition hover:bg-[#191919]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#f1f1f1]"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.checked,
                  })
                }
              />

              <span>
                <span className="block text-xs font-medium text-[#ddd]">
                  Active
                </span>

                <span className="mt-0.5 block text-[11px] text-[#666]">
                  Allow this advertisement to be displayed.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* FOOTER / ACTIONS */}
      <div className="flex flex-col gap-4 border-t border-[#303030] bg-[#191919] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#777]">
          {editingAd
            ? "Changes will be applied to the existing advertisement."
            : "Review the advertisement details before saving."}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            className="h-9 rounded-md border border-[#3a3a3a] bg-[#222] px-4 text-xs font-medium text-[#ccc] transition hover:bg-[#2b2b2b] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onCancel}
            disabled={saving || uploading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="h-9 rounded-md border border-[#444] bg-[#f1f1f1] px-5 text-xs font-medium text-[#111] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || uploading}
          >
            {saving
              ? "Saving..."
              : editingAd
              ? "Save changes"
              : "Create ad"}
          </button>
        </div>
      </div>
    </form>
  );
}