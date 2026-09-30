"use client";

import { useEffect, useState } from "react";
import { api, Ad, Placement, AdStats } from "@/lib/api";
import AdForm from "@/components/AdForm";
import {
  Eye,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

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

const dangerIconButtonClass = `
  flex h-6 w-6 shrink-0
  items-center justify-center
  rounded
  text-[var(--admin-muted)]
  transition-colors
  hover:bg-red-500/10
  hover:text-red-500
`;

export default function AdsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  const [stats, setStats] = useState<Record<string, AdStats>>({});

  async function load() {
    setLoading(true);

    try {
      const [p, a] = await Promise.all([
        api.get<Placement[]>("/api/admin/placements"),
        api.get<Ad[]>("/api/admin/ads"),
      ]);

      setPlacements(p);
      setAds(a);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadStats(adId: string) {
    if (stats[adId]) return;

    const s = await api.get<AdStats>(
      `/api/admin/ads/${adId}/stats`
    );

    setStats((prev) => ({
      ...prev,
      [adId]: s,
    }));
  }

  async function toggle(ad: Ad) {
    await api.post(`/api/admin/ads/${ad.id}/toggle`);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this ad?")) return;

    await api.del(`/api/admin/ads/${id}`);
    load();
  }

  function placementName(id: string) {
    return (
      placements.find((p) => p.id === id)?.name ||
      "—"
    );
  }

  function openCreateForm() {
    setEditingAd(null);
    setShowForm(true);
  }

  function openEditForm(ad: Ad) {
    setEditingAd(ad);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAd(null);
  }

  const visibleAds =
    filter === "all"
      ? ads
      : ads.filter(
          (a) => a.placement_id === filter
        );

  return (
    <>
      <main className="admin-page !w-full !max-w-none !px-4 !py-4 sm:!px-5 lg:!px-6">
        {/* Header */}
        <div className="mb-4 flex w-full items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="admin-title !text-lg">
              Ads
            </h1>

            <p className="admin-description mt-0.5 max-w-4xl !text-[11px] !leading-4">
              Create, schedule, and activate ads. Active ads
              matching the current date range appear on the
              vendor&apos;s site automatically — no redeploy
              needed on their end.
            </p>
          </div>

          {placements.length > 0 && (
            <button
              type="button"
              className="
                admin-button
                admin-button-primary
                !h-8
                !shrink-0
                !whitespace-nowrap
                !px-3
                !py-1
                !text-[11px]
              "
              onClick={openCreateForm}
            >
              + New ad
            </button>
          )}
        </div>

        {/* No placement */}
        {placements.length === 0 && (
          <div className="admin-card mb-4 !w-full !p-3">
            <p className="text-[10px] text-[var(--admin-muted)]">
              Create a vendor and a placement first.
            </p>
          </div>
        )}

        {/* Filter */}
        {placements.length > 0 && (
          <div className="mb-3 flex w-full items-center gap-2">
            <label className="mb-0 text-[10px] font-medium text-[var(--admin-foreground)]">
              Filter by placement
            </label>

            <select
              className={`${inputClass} !w-auto min-w-[160px]`}
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
            >
              <option value="all">
                All placements
              </option>

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
        )}

        {/* Ads table */}
        <section className="w-full">
          <div className="mb-2">
            <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
              Advertisement list
            </h2>

            <p className="mt-0.5 text-[10px] leading-4 text-[var(--admin-muted)]">
              Manage ad previews, schedules, status, and
              performance.
            </p>
          </div>

          <div className="admin-table-card !w-full !max-w-none overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="admin-table !w-full !text-[10px]">
                <thead>
                  <tr>
                    <th className="!px-3 !py-2">
                      Preview
                    </th>

                    <th className="!px-3 !py-2">
                      Title
                    </th>

                    <th className="!px-3 !py-2">
                      Placement
                    </th>

                    <th className="!px-3 !py-2">
                      Window
                    </th>

                    <th className="!px-3 !py-2">
                      Status
                    </th>

                    <th className="!px-3 !py-2">
                      Performance
                    </th>

                    <th className="!px-3 !py-2 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="
                          !px-3
                          !py-6
                          text-center
                          text-[10px]
                          text-[var(--admin-muted)]
                        "
                      >
                        Loading ads...
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    visibleAds.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center justify-center px-4 py-7 text-center">
                            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                              <span className="text-sm text-[var(--admin-muted)]">
                                +
                              </span>
                            </div>

                            <p className="text-[11px] font-medium text-[var(--admin-foreground)]">
                              No ads yet
                            </p>

                            <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                              Create your first ad to start
                              serving advertisements.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                  {visibleAds.map((ad) => (
                    <tr key={ad.id}>
                      {/* Preview */}
                      <td className="!px-3 !py-2">
                        <div className="flex h-10 w-16 items-center justify-center overflow-hidden rounded border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
                          <img
                            src={ad.image_url}
                            alt={ad.alt_text}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>

                      {/* Title */}
                      <td className="!px-3 !py-2">
                        <div className="max-w-[220px] truncate font-medium text-[var(--admin-foreground)]">
                          {ad.title}
                        </div>
                      </td>

                      {/* Placement */}
                      <td className="admin-table-muted !px-3 !py-2">
                        <div className="max-w-[180px] truncate text-[10px]">
                          {placementName(
                            ad.placement_id
                          )}
                        </div>
                      </td>

                      {/* Window */}
                      <td className="admin-table-muted !px-3 !py-2">
                        <div className="whitespace-nowrap text-[10px]">
                          {ad.start_at
                            ? new Date(
                                ad.start_at
                              ).toLocaleDateString()
                            : "Always"}

                          <span className="mx-1 text-[var(--admin-subtle)]">
                            →
                          </span>

                          {ad.end_at
                            ? new Date(
                                ad.end_at
                              ).toLocaleDateString()
                            : "No end"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="!px-3 !py-2">
                        <button
                          type="button"
                          className={`badge !px-1.5 !py-0.5 !text-[9px] ${
                            ad.is_active
                              ? "badge-active"
                              : "badge-inactive"
                          }`}
                          onClick={() =>
                            toggle(ad)
                          }
                        >
                          {ad.is_active
                            ? "Active"
                            : "Inactive"}
                        </button>
                      </td>

                      {/* Performance */}
                      <td className="!px-3 !py-2">
                        {stats[ad.id] ? (
                          <span className="whitespace-nowrap text-[9px] text-[var(--admin-muted)]">
                            {stats[ad.id].impressions}{" "}
                            views ·{" "}
                            {stats[ad.id].clicks} clicks ·{" "}
                            {stats[ad.id].ctr}% CTR
                          </span>
                        ) : (
                          <button
                            type="button"
                            title="Load ad statistics"
                            aria-label="Load ad statistics"
                            className="
                              flex
                              items-center
                              gap-1
                              text-[9px]
                              text-[var(--admin-muted)]
                              transition-colors
                              hover:text-[var(--admin-foreground)]
                            "
                            onClick={() =>
                              loadStats(ad.id)
                            }
                          >
                            <Eye
                              size={12}
                              strokeWidth={1.8}
                            />
                            Load stats
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="!px-3 !py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            title="Edit ad"
                            aria-label="Edit ad"
                            className={iconButtonClass}
                            onClick={() =>
                              openEditForm(ad)
                            }
                          >
                            <Pencil
                              size={13}
                              strokeWidth={1.8}
                            />
                          </button>

                          <button
                            type="button"
                            title="Delete ad"
                            aria-label="Delete ad"
                            className={
                              dangerIconButtonClass
                            }
                            onClick={() =>
                              remove(ad.id)
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

      {/* Ad Form Modal */}
      {showForm && placements.length > 0 && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-start
            justify-center
            overflow-y-auto
            bg-black/70
            px-3
            py-6
            backdrop-blur-[2px]
            sm:px-5
            sm:py-8
          "
          role="dialog"
          aria-modal="true"
          aria-label={
            editingAd
              ? "Edit advertisement"
              : "Create advertisement"
          }
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            className="
              relative
              w-full
              max-w-3xl
              rounded-md
              border
              border-[var(--admin-border)]
              bg-[var(--admin-background,#111111)]
              shadow-[0_20px_60px_rgba(0,0,0,0.55)]
            "
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            {/* Modal close button */}
            <button
              type="button"
              title="Close"
              aria-label="Close"
              className="
                absolute
                right-3
                top-3
                z-20
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded
                border
                border-[var(--admin-border)]
                bg-[var(--admin-surface)]
                text-[var(--admin-muted)]
                transition-colors
                hover:bg-[var(--admin-surface-hover)]
                hover:text-[var(--admin-foreground)]
              "
              onClick={closeForm}
            >
              <X
                size={14}
                strokeWidth={1.8}
              />
            </button>

            {/* Existing AdForm UI */}
            <div className="p-2 sm:p-3">
              <AdForm
                key={
                  editingAd
                    ? `edit-${editingAd.id}`
                    : "new-ad"
                }
                placements={placements}
                editingAd={editingAd}
                onSaved={() => {
                  closeForm();
                  load();
                }}
                onCancel={closeForm}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}