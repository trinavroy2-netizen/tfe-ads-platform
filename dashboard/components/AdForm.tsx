
"use client";

import { useState } from "react";
import { api, Ad, Placement, API_BASE, getToken } from "@/lib/api";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Link2,
  Settings2,
  Clock3,
} from "lucide-react";

/**
 * Convert a database image URL into a full backend URL.
 *
 * Supports both:
 *
 * Full URL:
 * https://tfe-ads-backend.onrender.com/api/public/images/UUID
 *
 * Relative URL:
 * /api/public/images/UUID
 *
 * This is important because the dashboard and API
 * can run on different ports/domains.
 */
function resolveImageUrl(url: string | null | undefined) {
  if (!url) return "";

  const trimmedUrl = url.trim();

  if (!trimmedUrl) return "";

  // Already an absolute URL
  if (
    trimmedUrl.startsWith("http://") ||
    trimmedUrl.startsWith("https://")
  ) {
    return trimmedUrl;
  }

  // Database-backed image URL returned by backend
  if (trimmedUrl.startsWith("/api/")) {
    return `${API_BASE.replace(/\/$/, "")}${trimmedUrl}`;
  }

  // Keep other relative URLs working
  if (trimmedUrl.startsWith("/")) {
    return `${API_BASE.replace(/\/$/, "")}${trimmedUrl}`;
  }

  return trimmedUrl;
}

/**
 * Backend stores datetime values as UTC-naive datetime.
 *
 * Example:
 * Backend:
 * 2026-10-01T04:55:00
 *
 * Nepal browser:
 * 2026-10-01T10:40
 *
 * The "Z" tells JavaScript that the backend value is UTC.
 */
function toLocalInput(dt: string | null) {
  if (!dt) return "";

  try {
    const utcDate = new Date(
      dt.endsWith("Z") ? dt : `${dt}Z`
    );

    if (Number.isNaN(utcDate.getTime())) {
      return "";
    }

    const year = utcDate.getFullYear();
    const month = String(utcDate.getMonth() + 1).padStart(2, "0");
    const day = String(utcDate.getDate()).padStart(2, "0");
    const hours = String(utcDate.getHours()).padStart(2, "0");
    const minutes = String(utcDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

/**
 * Convert browser-local datetime-local value to UTC ISO.
 *
 * Example in Nepal:
 *
 * 2026-10-01T10:40
 *        ↓
 * 2026-10-01T04:55:00.000Z
 */
function toUtcISOString(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

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

const sectionButtonClass = `
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
`;

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
    placement_id:
      editingAd?.placement_id ||
      placements[0]?.id ||
      "",

    title: editingAd?.title || "",

    image_url: resolveImageUrl(
      editingAd?.image_url || ""
    ),

    target_url:
      editingAd?.target_url || "",

    alt_text:
      editingAd?.alt_text || "",

    sort_order:
      editingAd?.sort_order ?? 0,

    start_at:
      toLocalInput(editingAd?.start_at ?? null),

    end_at:
      toLocalInput(editingAd?.end_at ?? null),

    open_in_new_tab:
      editingAd?.open_in_new_tab ?? true,

    is_active:
      editingAd?.is_active ?? true,
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showMedia, setShowMedia] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/admin/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: fd,
        }
      );

      if (!res.ok) {
        let message = "Upload failed";

        try {
          const data = await res.json();
          message = data.detail || message;
        } catch {
          // Ignore non-JSON error response
        }

        throw new Error(message);
      }

      const data = await res.json();

      /**
       * Backend may return either:
       *
       * /api/public/images/UUID
       *
       * or:
       *
       * https://backend-domain/api/public/images/UUID
       *
       * Normalize both to the backend URL.
       */
      const imageUrl = resolveImageUrl(data.url);

      if (!imageUrl) {
        throw new Error(
          "Upload succeeded but no image URL was returned."
        );
      }

      setForm((current) => ({
        ...current,
        image_url: imageUrl,
      }));
    } catch (err: any) {
      setError(
        err?.message || "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSaving(true);

    /**
     * datetime-local contains browser-local time.
     * Convert it to UTC before sending to backend.
     */
    const payload = {
      ...form,

      /**
       * Make sure old database-backed image URLs are also
       * stored as full backend URLs.
       */
      image_url: resolveImageUrl(
        form.image_url
      ),

      start_at: toUtcISOString(
        form.start_at
      ),

      end_at: toUtcISOString(
        form.end_at
      ),
    };

    console.log("[AD SCHEDULE DEBUG]", {
      browser_start_at: form.start_at,
      browser_end_at: form.end_at,
      api_start_at: payload.start_at,
      api_end_at: payload.end_at,
    });

    try {
      if (editingAd) {
        await api.patch(
          `/api/admin/ads/${editingAd.id}`,
          payload
        );
      } else {
        await api.post(
          "/api/admin/ads",
          payload
        );
      }

      onSaved();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to save ad"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-card mb-4 !w-full !p-3"
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="mb-3">
        <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
          {editingAd
            ? "Edit advertisement"
            : "Add advertisement"}
        </h2>

        <p className="mt-0.5 text-[10px] leading-4 text-[var(--admin-muted)]">
          Configure the advertisement content,
          destination and display schedule.
        </p>
      </div>

      {/* =====================================================
          BASIC INFORMATION
          ===================================================== */}

      <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr]">
        {/* Placement */}

        <div className="min-w-0">
          <label
            htmlFor="ad-placement"
            className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
          >
            Placement
          </label>

          <select
            id="ad-placement"
            value={form.placement_id}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                placement_id:
                  e.target.value,
              }))
            }
            className={inputClass}
            required
          >
            {placements.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}

        <div className="min-w-0">
          <label
            htmlFor="ad-title"
            className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
          >
            Title
          </label>

          <input
            id="ad-title"
            value={form.title}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                title: e.target.value,
              }))
            }
            placeholder="Internal ad reference"
            className={inputClass}
            required
          />
        </div>

        {/* Sort Order */}

        <div className="min-w-0">
          <label
            htmlFor="ad-sort-order"
            className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
          >
            Sort order
          </label>

          <input
            id="ad-sort-order"
            type="number"
            value={form.sort_order}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                sort_order:
                  Number(e.target.value),
              }))
            }
            className={inputClass}
          />
        </div>
      </div>

      {/* =====================================================
          DESTINATION
          ===================================================== */}

      <div className="mt-2.5">
        <label
          htmlFor="ad-target-url"
          className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
        >
          Destination link
        </label>

        <div className="relative">
          <Link2
            size={12}
            strokeWidth={1.7}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]"
          />

          <input
            id="ad-target-url"
            value={form.target_url}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                target_url:
                  e.target.value,
              }))
            }
            placeholder="https://advertiser-site.com/campaign"
            className={`${inputClass} !pl-8`}
            required
          />
        </div>
      </div>

      {/* =====================================================
          MEDIA
          ===================================================== */}

      <div className="mt-2.5 border-t border-[var(--admin-border)] pt-2.5">
        <button
          type="button"
          onClick={() =>
            setShowMedia(
              (current) => !current
            )
          }
          className={sectionButtonClass}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface)]">
              <ImageIcon
                size={12}
                strokeWidth={1.7}
                className="text-[var(--admin-foreground)]"
              />
            </span>

            <span className="min-w-0">
              <span className="block text-[10px] font-medium text-[var(--admin-foreground)]">
                Advertisement media
              </span>

              <span className="mt-0.5 block text-[9px] text-[var(--admin-muted)]">
                Upload an image or provide an
                image URL.
              </span>
            </span>
          </span>

          <span className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--admin-muted)]">
            {showMedia ? (
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

        {showMedia && (
          <div className="mt-2.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-2.5">
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[220px_1fr]">
              {/* Upload */}

              <div>
                <label
                  htmlFor="ad-image-upload"
                  className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                >
                  Upload image
                </label>

                <input
                  id="ad-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="w-full text-[10px] text-[var(--admin-muted)] file:mr-2 file:rounded file:border-0 file:bg-[var(--admin-surface)] file:px-2 file:py-1.5 file:text-[10px] file:text-[var(--admin-foreground)]"
                />

                {uploading && (
                  <p className="mt-1 text-[9px] text-[var(--admin-muted)]">
                    Uploading...
                  </p>
                )}
              </div>

              {/* Image URL */}

              <div>
                <label
                  htmlFor="ad-image-url"
                  className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                >
                  Image URL
                </label>

                <input
                  id="ad-image-url"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      image_url:
                        e.target.value,
                    }))
                  }
                  placeholder="https://example.com/banner.jpg"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Preview */}


            {form.image_url && ( 
              <div className="mt-2 border-t border-[var(--admin-border)] pt-2"> 
              <p className="mb-1 text-[9px] text-[var(--admin-muted)]"> Preview </p>
               <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]"> 
                <img src={resolveImageUrl(form.image_url)} alt={form.alt_text || "Advertisement preview"} className="block h-full w-full object-contain" /> 
                </div> 
                </div> 
              )}

          </div>
        )}
      </div>

      {/* =====================================================
          ALT TEXT
          ===================================================== */}

      <div className="mt-2.5">
        <label
          htmlFor="ad-alt-text"
          className="mb-1 block text-[10px] font-medium text-[var(--admin-foreground)]"
        >
          Alt text
          <span className="ml-1 font-normal text-[var(--admin-muted)]">
            (optional)
          </span>
        </label>

        <input
          id="ad-alt-text"
          value={form.alt_text}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              alt_text:
                e.target.value,
            }))
          }
          placeholder="Describe the advertisement image"
          className={inputClass}
        />
      </div>

      {/* =====================================================
          SCHEDULE
          ===================================================== */}

      <div className="mt-2.5 border-t border-[var(--admin-border)] pt-2.5">
        <button
          type="button"
          onClick={() =>
            setShowSchedule(
              (current) => !current
            )
          }
          className={sectionButtonClass}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface)]">
              <Clock3
                size={12}
                strokeWidth={1.7}
                className="text-[var(--admin-foreground)]"
              />
            </span>

            <span className="min-w-0">
              <span className="block text-[10px] font-medium text-[var(--admin-foreground)]">
                Display schedule
              </span>

              <span className="mt-0.5 block text-[9px] text-[var(--admin-muted)]">
                Control when this advertisement
                starts and stops displaying.
              </span>
            </span>
          </span>

          <span className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--admin-muted)]">
            {showSchedule ? (
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

        {showSchedule && (
          <div className="mt-2.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-2.5">
            <div className="mb-2 text-[9px] leading-4 text-[var(--admin-muted)]">
              Times are entered in your local
              browser timezone and stored by the
              system as UTC.
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* Start */}

              <div>
                <label
                  htmlFor="ad-start-at"
                  className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                >
                  Start showing at
                </label>

                <input
                  id="ad-start-at"
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      start_at:
                        e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              {/* End */}

              <div>
                <label
                  htmlFor="ad-end-at"
                  className="mb-1 block text-[9px] text-[var(--admin-muted)]"
                >
                  Stop showing at
                </label>

                <input
                  id="ad-end-at"
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      end_at:
                        e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          OPTIONS
          ===================================================== */}

      <div className="mt-2.5 border-t border-[var(--admin-border)] pt-2.5">
        <button
          type="button"
          onClick={() =>
            setShowOptions(
              (current) => !current
            )
          }
          className={sectionButtonClass}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface)]">
              <Settings2
                size={12}
                strokeWidth={1.7}
                className="text-[var(--admin-foreground)]"
              />
            </span>

            <span className="min-w-0">
              <span className="block text-[10px] font-medium text-[var(--admin-foreground)]">
                Display options
              </span>

              <span className="mt-0.5 block text-[9px] text-[var(--admin-muted)]">
                Configure link behavior and active
                status.
              </span>
            </span>
          </span>

          <span className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--admin-muted)]">
            {showOptions ? (
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

        {showOptions && (
          <div className="mt-2.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-2.5">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-6">
              <label className="flex items-center gap-2 normal-case text-[10px] text-[var(--admin-foreground)]">
                <input
                  type="checkbox"
                  className="!m-0 !h-3 !w-3"
                  checked={
                    form.open_in_new_tab
                  }
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      open_in_new_tab:
                        e.target.checked,
                    }))
                  }
                />

                Open link in new tab
              </label>

              <label className="flex items-center gap-2 normal-case text-[10px] text-[var(--admin-foreground)]">
                <input
                  type="checkbox"
                  className="!m-0 !h-3 !w-3"
                  checked={
                    form.is_active
                  }
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      is_active:
                        e.target.checked,
                    }))
                  }
                />

                Active
              </label>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <p className="mt-2 text-[10px] text-red-500">
          {error}
        </p>
      )}

      {/* =====================================================
          ACTIONS
          ===================================================== */}

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--admin-border)] pt-3">
        <button
          type="button"
          className="
            admin-button
            !h-8
            !px-3
            !py-1
            !text-[11px]
          "
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="
            admin-button
            admin-button-primary
            !h-8
            !px-3
            !py-1
            !text-[11px]
          "
          disabled={
            saving || uploading
          }
        >
          {saving
            ? "Saving..."
            : editingAd
              ? "Save changes"
              : "Add advertisement"}
        </button>
      </div>
    </form>
  );
}
