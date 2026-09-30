
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Eye,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  api,
  OverviewStats,
  Ad,
  AdStats,
  Placement,
  Vendor,
} from "@/lib/api";

const REFRESH_INTERVAL = 10000;

const SHADES = [
  "#18181b",
  "#27272a",
  "#3f3f46",
  "#52525b",
  "#71717a",
  "#a1a1aa",
  "#d4d4d8",
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [adStats, setAdStats] = useState<Record<string, AdStats>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setError(null);

        const [overview, adsData, placementsData, vendorsData] =
          await Promise.all([
            api.get<OverviewStats>("/api/admin/stats/overview"),
            api.get<Ad[]>("/api/admin/ads"),
            api.get<Placement[]>("/api/admin/placements"),
            api.get<Vendor[]>("/api/admin/vendors"),
          ]);

        setStats(overview);
        setAds(adsData);
        setPlacements(placementsData);
        setVendors(vendorsData);

        const entries = await Promise.all(
          adsData.map(async (ad) => {
            const stat = await api.get<AdStats>(
              `/api/admin/ads/${ad.id}/stats`
            );

            return [ad.id, stat] as const;
          })
        );

        setAdStats(Object.fromEntries(entries));
        setLastUpdated(new Date());
      } catch (err: any) {
        setError(err?.message || "Unable to load analytics.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAnalytics();

    const interval = setInterval(() => {
      loadAnalytics(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadAnalytics]);

  function vendorForPlacement(placementId: string) {
    const placement = placements.find((p) => p.id === placementId);

    return (
      vendors.find((v) => v.id === placement?.vendor_id)?.name || "—"
    );
  }

  function placementName(id: string) {
    return placements.find((p) => p.id === id)?.name || "—";
  }

  const totalImpressions =
    stats?.by_vendor.reduce(
      (sum, vendor) => sum + vendor.impressions,
      0
    ) ?? 0;

  const totalClicks =
    stats?.by_vendor.reduce(
      (sum, vendor) => sum + vendor.clicks,
      0
    ) ?? 0;

  const overallCtr =
    totalImpressions > 0
      ? Number(
          ((totalClicks / totalImpressions) * 100).toFixed(2)
        )
      : 0;

  const activeAds = ads.filter((ad) => ad.is_active).length;

  const activeVendors = vendors.filter(
    (vendor) => vendor.is_active
  ).length;

  const adsWithImpressions = Object.values(adStats).filter(
    (stat) => stat.impressions > 0
  ).length;

  const topAds = [...ads]
    .map((ad) => ({
      ad,
      stats: adStats[ad.id],
    }))
    .filter(
      ({ stats }) =>
        stats && stats.impressions > 0
    )
    .sort(
      (a, b) =>
        (b.stats?.ctr ?? 0) -
        (a.stats?.ctr ?? 0)
    );

  const topAdsByClicks = [...topAds]
    .sort(
      (a, b) =>
        (b.stats?.clicks ?? 0) -
        (a.stats?.clicks ?? 0)
    )
    .slice(0, 5);

  const maxVendorImpressions = Math.max(
    ...(stats?.by_vendor.map(
      (vendor) => vendor.impressions
    ) || [0]),
    1
  );

  const maxVendorCtr = Math.max(
    ...(stats?.by_vendor.map(
      (vendor) => vendor.ctr
    ) || [0]),
    1
  );

  const maxAdCtr = Math.max(
    ...topAds.map(
      ({ stats }) => stats?.ctr ?? 0
    ),
    1
  );

  const maxClicks = Math.max(
    ...topAdsByClicks.map(
      ({ stats }) => stats?.clicks ?? 0
    ),
    1
  );

  const pieGradient = useMemo(() => {
    if (!stats || totalImpressions === 0) {
      return "conic-gradient(#27272a 0deg 360deg)";
    }

    let current = 0;

    const segments = stats.by_vendor
      .filter((vendor) => vendor.impressions > 0)
      .map((vendor, index) => {
        const degrees =
          (vendor.impressions / totalImpressions) * 360;

        const start = current;
        const end = current + degrees;

        current = end;

        return `${
          SHADES[index % SHADES.length]
        } ${start}deg ${end}deg`;
      });

    return `conic-gradient(${segments.join(", ")})`;
  }, [stats, totalImpressions]);

  return (
    <main className="admin-page !w-full !max-w-none !px-4 !py-4 sm:!px-5 lg:!px-6">
      {/* HEADER */}
      <div className="mb-5 flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
            <BarChart3
              size={16}
              strokeWidth={1.7}
              className="text-[var(--admin-foreground)]"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="admin-title !text-lg">
                Analytics
              </h1>

              {!loading && (
                <span className="flex items-center gap-1 rounded-full border border-[var(--admin-border)] px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-[var(--admin-muted)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </span>
              )}
            </div>

            <p className="admin-description mt-0.5 max-w-4xl !text-[11px] !leading-4">
              Real-time performance across vendors,
              placements, and advertisements.
            </p>

            {lastUpdated && (
              <p className="mt-1 text-[9px] text-[var(--admin-subtle)]">
                Updated {lastUpdated.toLocaleTimeString()}
                {" · "}
                Auto-refresh every 10s
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadAnalytics(true)}
          disabled={refreshing}
          title="Refresh analytics"
          aria-label="Refresh analytics"
          className="
            flex h-8 w-8 shrink-0
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
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <RefreshCw
            size={14}
            strokeWidth={1.8}
            className={
              refreshing ? "animate-spin" : ""
            }
          />
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="admin-card mb-4 !w-full !border-red-500/30 !p-3">
          <p className="text-[10px] text-red-500">
            {error}
          </p>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="admin-card mb-4 !w-full !p-3">
          <div className="flex items-center gap-2">
            <div className="admin-spinner" />

            <span className="text-[10px] text-[var(--admin-muted)]">
              Loading analytics...
            </span>
          </div>
        </div>
      )}

      {!loading && stats && (
        <>
          {/* KPI CARDS */}
          <section className="mb-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Eye}
              label="Impressions"
              value={totalImpressions.toLocaleString()}
              description="Total ad views"
            />

            <MetricCard
              icon={MousePointerClick}
              label="Clicks"
              value={totalClicks.toLocaleString()}
              description="Total ad clicks"
            />

            <MetricCard
              icon={TrendingUp}
              label="Overall CTR"
              value={`${overallCtr}%`}
              description="Clicks / impressions"
            />

            <MetricCard
              icon={Activity}
              label="Active ads"
              value={`${activeAds} / ${ads.length}`}
              description="Active / total ads"
            />
          </section>

          {/* SECONDARY SUMMARY */}
          <section className="mb-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MiniMetric
              icon={Users}
              label="Active vendors"
              value={`${activeVendors} / ${vendors.length}`}
            />

            <MiniMetric
              icon={BarChart3}
              label="Placements"
              value={placements.length}
            />

            <MiniMetric
              icon={Activity}
              label="Ads with impressions"
              value={adsWithImpressions}
            />
          </section>

          {/* VENDOR + PIE */}
          <div className="mb-5 grid w-full grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            {/* VENDOR PERFORMANCE */}
            <section className="admin-table-card !w-full !max-w-none overflow-hidden">
              <div className="border-b border-[var(--admin-border)] px-3 py-2.5">
                <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                  Vendor performance
                </h2>

                <p className="mt-0.5 text-[9px] text-[var(--admin-muted)]">
                  Traffic and engagement generated by
                  each vendor.
                </p>
              </div>

              <div className="w-full">
                <table className="admin-table !w-full table-fixed !text-[10px]">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                    <col className="w-[20%]" />
                  </colgroup>

                  <thead>
                    <tr>
                      <th className="!px-3 !py-2 text-left">
                        Vendor
                      </th>

                      <th className="!px-3 !py-2 text-left">
                        Impressions
                      </th>

                      <th className="!px-3 !py-2 text-left">
                        Clicks
                      </th>

                      <th className="!px-3 !py-2 text-left">
                        CTR
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.by_vendor.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="!px-3 !py-7 text-center text-[10px] text-[var(--admin-muted)]"
                        >
                          No vendor analytics available.
                        </td>
                      </tr>
                    )}

                    {stats.by_vendor.map((vendor) => {
                      const share =
                        totalImpressions > 0
                          ? (
                              (vendor.impressions /
                                totalImpressions) *
                              100
                            ).toFixed(1)
                          : "0.0";

                      return (
                        <tr key={vendor.vendor_id}>
                          <td className="!px-3 !py-2 align-top">
                            <div className="w-full min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <span className="min-w-0 break-words font-medium text-[var(--admin-foreground)]">
                                  {vendor.vendor_name}
                                </span>

                                <span className="shrink-0 text-[8px] text-[var(--admin-subtle)]">
                                  {share}%
                                </span>
                              </div>

                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--admin-border)]">
                                <div
                                  className="h-full rounded-full bg-[var(--admin-foreground)] transition-all duration-700"
                                  style={{
                                    width: `${Math.max(
                                      2,
                                      (vendor.impressions /
                                        maxVendorImpressions) *
                                        100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="admin-table-muted !px-3 !py-2 align-top break-words">
                            {vendor.impressions.toLocaleString()}
                          </td>

                          <td className="admin-table-muted !px-3 !py-2 align-top break-words">
                            {vendor.clicks.toLocaleString()}
                          </td>

                          <td className="!px-3 !py-2 align-top">
                            <span className="font-medium text-[var(--admin-foreground)]">
                              {vendor.ctr}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* DONUT */}
            <section className="admin-card !w-full !p-3">
              <div className="mb-3">
                <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                  Impression distribution
                </h2>

                <p className="mt-0.5 text-[9px] text-[var(--admin-muted)]">
                  Share of total impressions by vendor.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative h-40 w-40 sm:h-44 sm:w-44">
                  <div
                    className="h-full w-full rounded-full transition-all duration-700"
                    style={{
                      background: pieGradient,
                    }}
                  />

                  <div className="absolute inset-[25%] flex flex-col items-center justify-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-inner">
                    <span className="max-w-[80px] break-words text-center text-base font-semibold tracking-tight text-[var(--admin-foreground)]">
                      {totalImpressions.toLocaleString()}
                    </span>

                    <span className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                      Total
                    </span>
                  </div>
                </div>

                <div className="mt-4 w-full space-y-2">
                  {stats.by_vendor.length === 0 && (
                    <p className="text-center text-[9px] text-[var(--admin-muted)]">
                      No vendor data available.
                    </p>
                  )}

                  {stats.by_vendor.map((vendor, index) => {
                    const share =
                      totalImpressions > 0
                        ? (
                            (vendor.impressions /
                              totalImpressions) *
                            100
                          ).toFixed(1)
                        : "0.0";

                    return (
                      <div
                        key={vendor.vendor_id}
                        className="flex min-w-0 items-center justify-between gap-2"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full border border-[var(--admin-border)]"
                            style={{
                              background:
                                SHADES[
                                  index % SHADES.length
                                ],
                            }}
                          />

                          <span className="min-w-0 break-words text-[9px] text-[var(--admin-foreground)]">
                            {vendor.vendor_name}
                          </span>
                        </div>

                        <span className="shrink-0 text-[9px] text-[var(--admin-muted)]">
                          {share}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* VENDOR CTR */}
          <section className="mb-5 w-full">
            <div className="mb-2">
              <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                Vendor CTR analysis
              </h2>

              <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                Compare engagement rate across vendors.
              </p>
            </div>

            <div className="admin-card !w-full !p-3">
              {stats.by_vendor.length === 0 ? (
                <div className="py-5 text-center text-[10px] text-[var(--admin-muted)]">
                  No vendor CTR data available.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.by_vendor.map((vendor) => (
                    <div key={vendor.vendor_id}>
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-[10px] font-medium text-[var(--admin-foreground)]">
                          {vendor.vendor_name}
                        </span>

                        <span className="shrink-0 text-[9px] text-[var(--admin-muted)]">
                          {vendor.ctr}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--admin-foreground)] transition-all duration-700"
                          style={{
                            width: `${Math.max(
                              1,
                              (vendor.ctr /
                                maxVendorCtr) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* TOP ADS */}
          <section className="mb-5 w-full">
            <div className="mb-2">
              <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                Top performing ads
              </h2>

              <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                Advertisements ranked by click-through
                rate.
              </p>
            </div>

            <div className="admin-table-card !w-full !max-w-none overflow-hidden">
              <div className="w-full">
                <table className="admin-table !w-full table-fixed !text-[10px]">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[13%]" />
                    <col className="w-[11%]" />
                    <col className="w-[9%]" />
                    <col className="w-[15%]" />
                  </colgroup>

                  <thead>
                    <tr>
                      <th className="!px-3 !py-2">
                        Ad
                      </th>

                      <th className="!px-3 !py-2">
                        Vendor
                      </th>

                      <th className="!px-3 !py-2">
                        Placement
                      </th>

                      <th className="!px-3 !py-2">
                        Impressions
                      </th>

                      <th className="!px-3 !py-2">
                        Clicks
                      </th>

                      <th className="!px-3 !py-2">
                        CTR
                      </th>

                      <th className="!px-3 !py-2">
                        Performance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {topAds.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="!px-3 !py-7 text-center text-[10px] text-[var(--admin-muted)]"
                        >
                          No impressions recorded yet.
                        </td>
                      </tr>
                    )}

                    {topAds.map(({ ad, stats }) => {
                      const ctr = stats?.ctr ?? 0;

                      return (
                        <tr key={ad.id}>
                          <td className="!px-3 !py-2 align-top">
                            <div className="break-words font-medium text-[var(--admin-foreground)]">
                              {ad.title}
                            </div>
                          </td>

                          <td className="admin-table-muted !px-3 !py-2 align-top">
                            <div className="break-words">
                              {vendorForPlacement(
                                ad.placement_id
                              )}
                            </div>
                          </td>

                          <td className="admin-table-muted !px-3 !py-2 align-top">
                            <div className="break-words">
                              {placementName(
                                ad.placement_id
                              )}
                            </div>
                          </td>

                          <td className="admin-table-muted !px-3 !py-2 align-top break-words">
                            {stats!.impressions.toLocaleString()}
                          </td>

                          <td className="admin-table-muted !px-3 !py-2 align-top break-words">
                            {stats!.clicks.toLocaleString()}
                          </td>

                          <td className="!px-3 !py-2 align-top">
                            <span className="font-medium text-[var(--admin-foreground)]">
                              {ctr}%
                            </span>
                          </td>

                          <td className="!px-3 !py-2 align-top">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--admin-border)]">
                                <div
                                  className="h-full rounded-full bg-[var(--admin-foreground)] transition-all duration-700"
                                  style={{
                                    width: `${Math.max(
                                      2,
                                      (ctr / maxAdCtr) *
                                        100
                                    )}%`,
                                  }}
                                />
                              </div>

                              <span className="shrink-0 text-[9px] text-[var(--admin-muted)]">
                                {ctr}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* MOST CLICKED ADS */}
          <section className="w-full">
            <div className="mb-2">
              <h2 className="text-[11px] font-medium text-[var(--admin-foreground)]">
                Most clicked advertisements
              </h2>

              <p className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
                Ads generating the highest number of
                clicks.
              </p>
            </div>

            <div className="admin-card !w-full !p-3">
              {topAdsByClicks.length === 0 ? (
                <div className="py-5 text-center text-[10px] text-[var(--admin-muted)]">
                  No click data available yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {topAdsByClicks.map(
                    ({ ad, stats }, index) => {
                      const clicks =
                        stats?.clicks ?? 0;

                      const percentage =
                        (clicks / maxClicks) * 100;

                      return (
                        <div
                          key={ad.id}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] text-[9px] font-medium text-[var(--admin-muted)]">
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-start justify-between gap-3">
                              <span className="min-w-0 break-words text-[10px] font-medium text-[var(--admin-foreground)]">
                                {ad.title}
                              </span>

                              <span className="shrink-0 text-[9px] text-[var(--admin-muted)]">
                                {clicks.toLocaleString()}{" "}
                                clicks
                              </span>
                            </div>

                            <div className="h-1 overflow-hidden rounded-full bg-[var(--admin-border)]">
                              <div
                                className="h-full rounded-full bg-[var(--admin-foreground)] transition-all duration-700"
                                style={{
                                  width: `${Math.max(
                                    2,
                                    percentage
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="admin-card group !w-full !p-3.5 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="admin-card-label text-[10px]">
            {label}
          </div>

          <div className="mt-1.5 break-words text-xl font-semibold tracking-tight text-[var(--admin-foreground)]">
            {value}
          </div>

          <div className="mt-0.5 text-[10px] text-[var(--admin-muted)]">
            {description}
          </div>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
          <Icon
            size={13}
            strokeWidth={1.7}
            className="text-[var(--admin-foreground)]"
          />
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="admin-card !p-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--admin-border)] bg-[var(--admin-surface-hover)]">
          <Icon
            size={12}
            strokeWidth={1.7}
            className="text-[var(--admin-foreground)]"
          />
        </div>

        <div className="min-w-0">
          <div className="text-[9px] text-[var(--admin-muted)]">
            {label}
          </div>

          <div className="break-words text-[12px] font-medium text-[var(--admin-foreground)]">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}