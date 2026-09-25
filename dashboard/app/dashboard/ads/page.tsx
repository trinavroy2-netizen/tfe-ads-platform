"use client";

import { useEffect, useState } from "react";
import {
  api,
  Ad,
  Placement,
  AdStats,
} from "@/lib/api";
import AdForm from "@/components/AdForm";

export default function AdsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
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
    await api.post(
      `/api/admin/ads/${ad.id}/toggle`
    );

    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this ad?")) return;

    await api.del(`/api/admin/ads/${id}`);

    await load();
  }

  function placementName(id: string) {
    return (
      placements.find(
        (p) => p.id === id
      )?.name || "—"
    );
  }

  const visibleAds =
    filter === "all"
      ? ads
      : ads.filter(
          (a) => a.placement_id === filter
        );

  return (
    <div className="min-h-full bg-[#111111] text-white">

      {/* PAGE HEADER */}
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            Ads
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-[#999]">
            Create, schedule, and activate advertisements.
            Active ads matching their date range appear on
            the vendor's website automatically.
          </p>
        </div>

        {placements.length > 0 && !showForm && (
          <button
            className="h-10 shrink-0 rounded-md border border-[#444] bg-[#f1f1f1] px-5 text-sm font-medium text-[#111] transition hover:bg-white"
            onClick={() => {
              setEditingAd(null);
              setShowForm(true);
            }}
          >
            + New ad
          </button>
        )}
      </div>

      {/* NO PLACEMENTS */}
      {placements.length === 0 && (
        <section className="mb-8 rounded-md border border-[#303030] bg-[#1c1c1c]">
          <div className="px-5 py-10 text-center">

            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#151515]">
              <span className="text-lg text-[#777]">
                +
              </span>
            </div>

            <h2 className="text-sm font-medium text-white">
              No placements available
            </h2>

            <p className="mt-1 text-xs text-[#777]">
              Create a vendor and placement first before
              creating an advertisement.
            </p>

          </div>
        </section>
      )}

      {/* AD FORM */}
      {showForm && placements.length > 0 && (
        <section className="mb-8">

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold">
                {editingAd
                  ? "Edit Advertisement"
                  : "Create Advertisement"}
              </h2>

              <p className="mt-1 text-xs text-[#777]">
                Configure the advertisement content,
                placement and schedule.
              </p>
            </div>
          </div>

          <AdForm
            placements={placements}
            editingAd={editingAd}
            onSaved={() => {
              setShowForm(false);
              setEditingAd(null);
              load();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingAd(null);
            }}
          />

        </section>
      )}

      {/* FILTER */}
      {placements.length > 0 && (
        <section className="mb-6 rounded-md border border-[#303030] bg-[#1c1c1c]">

          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-[14px] font-semibold">
                Advertisement List
              </h2>

              <p className="mt-1 text-xs text-[#666]">
                Manage active advertisements and view
                their performance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="whitespace-nowrap text-xs font-medium text-[#888]">
                Placement
              </label>

              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value)
                }
                className="h-9 min-w-[180px] rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-xs text-white outline-none focus:border-[#777]"
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

          </div>

        </section>
      )}

      {/* ADS TABLE */}
      <section className="overflow-hidden rounded-[3px] border border-[#303030] bg-[#1c1c1c]">

        {/* TABLE HEADER */}
        <div className="flex items-center justify-between border-b border-[#303030] px-5 py-4">

          <div>
            <h2 className="text-[15px] font-semibold">
              Ads
            </h2>

            <p className="mt-1 text-xs text-[#777]">
              {visibleAds.length}{" "}
              {visibleAds.length === 1
                ? "advertisement"
                : "advertisements"}
            </p>
          </div>

        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">

            <thead>
              <tr className="border-b border-[#303030] bg-[#191919]">

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Preview
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Title
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Placement
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Schedule
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Status
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium text-[#888]">
                  Performance
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
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#666]"
                  >
                    Loading advertisements...
                  </td>
                </tr>
              )}

              {/* EMPTY */}
              {!loading &&
                visibleAds.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center"
                    >
                      <div className="text-sm text-[#777]">
                        No advertisements found.
                      </div>

                      <div className="mt-1 text-xs text-[#555]">
                        Create your first ad using the
                        New ad button.
                      </div>
                    </td>
                  </tr>
                )}

              {/* ADS */}
              {!loading &&
                visibleAds.map((ad) => (
                  <tr
                    key={ad.id}
                    className="border-b border-[#292929] last:border-b-0 hover:bg-[#202020]"
                  >

                    {/* PREVIEW */}
                    <td className="px-5 py-4">

                      <div className="flex h-12 w-20 items-center justify-center overflow-hidden rounded-md border border-[#383838] bg-[#151515]">

                        <img
                          src={ad.image_url}
                          alt={ad.alt_text}
                          className="h-full w-full object-cover"
                        />

                      </div>

                    </td>

                    {/* TITLE */}
                    <td className="px-5 py-4">
                      <div className="max-w-[220px] text-sm font-medium text-white">
                        {ad.title}
                      </div>

                      {ad.alt_text && (
                        <div className="mt-1 max-w-[220px] truncate text-xs text-[#666]">
                          {ad.alt_text}
                        </div>
                      )}
                    </td>

                    {/* PLACEMENT */}
                    <td className="px-5 py-4">
                      <span className="rounded bg-[#151515] px-2 py-1 text-xs text-[#999]">
                        {placementName(
                          ad.placement_id
                        )}
                      </span>
                    </td>

                    {/* SCHEDULE */}
                    <td className="px-5 py-4">

                      <div className="text-xs text-[#999]">
                        {ad.start_at
                          ? new Date(
                              ad.start_at
                            ).toLocaleDateString()
                          : "Always"}
                      </div>

                      <div className="mt-1 text-[11px] text-[#555]">
                        →
                      </div>

                      <div className="text-xs text-[#999]">
                        {ad.end_at
                          ? new Date(
                              ad.end_at
                            ).toLocaleDateString()
                          : "No end"}
                      </div>

                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">

                      <button
                        onClick={() =>
                          toggle(ad)
                        }
                        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                          ad.is_active
                            ? "border-[#304735] bg-[#17221a] text-[#9fc5a5] hover:bg-[#1c2a20]"
                            : "border-[#4a3434] bg-[#241818] text-[#c99595] hover:bg-[#302020]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            ad.is_active
                              ? "bg-[#75a77d]"
                              : "bg-[#a56b6b]"
                          }`}
                        />

                        {ad.is_active
                          ? "Active"
                          : "Inactive"}
                      </button>

                    </td>

                    {/* PERFORMANCE */}
                    <td className="px-5 py-4">

                      {stats[ad.id] ? (
                        <div className="space-y-1">

                          <div className="text-xs text-[#aaa]">
                            {stats[ad.id].impressions.toLocaleString()}{" "}
                            views
                          </div>

                          <div className="text-[11px] text-[#666]">
                            {stats[ad.id].clicks.toLocaleString()}{" "}
                            clicks
                            <span className="mx-1.5">
                              ·
                            </span>
                            {stats[ad.id].ctr}% CTR
                          </div>

                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            loadStats(ad.id)
                          }
                          className="text-xs text-[#aaa] underline decoration-[#555] underline-offset-2 transition hover:text-white"
                        >
                          Load stats
                        </button>
                      )}

                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">

                      <div className="flex justify-end gap-2">

                        <button
                          onClick={() => {
                            setEditingAd(ad);
                            setShowForm(true);
                          }}
                          className="h-8 rounded-md border border-[#3a3a3a] bg-[#222] px-3 text-xs text-[#ccc] transition hover:bg-[#2b2b2b] hover:text-white"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            remove(ad.id)
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