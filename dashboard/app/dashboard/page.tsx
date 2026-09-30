"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, OverviewStats } from "@/lib/api";

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="admin-card group !w-full !p-3.5">
      <div className="admin-card-label text-[11px]">{label}</div>

      <div className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--admin-foreground)]">
        {value}
      </div>

      {description && (
        <div className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
          {description}
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<OverviewStats>("/api/admin/stats/overview")
      .then(setStats)
      .catch(() => {
        setError("Unable to load overview statistics.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main className="admin-page !w-full !max-w-none !px-5 !py-5 sm:!px-6 lg:!px-8">
      {/* Header */}
      <div className="mb-5 !w-full">
        <div className="flex !w-full items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="admin-title text-xl">Overview</h1>

            <p className="admin-description mt-1 max-w-3xl text-xs leading-5">
              A single control plane for every vendor&apos;s advertising.
              Add a vendor, give them placements, and the same ad component
              serves all of them.
            </p>
          </div>

          <Link
            href="/dashboard/vendors"
            className="admin-button admin-button-primary shrink-0 !px-3 !py-1.5 text-xs"
          >
            Add vendor
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="admin-card !w-full !p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="admin-spinner" />

            <span className="text-xs text-[var(--admin-muted)]">
              Loading overview...
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="admin-card !w-full !border-red-500/30 !p-3.5">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && stats && (
        <div className="!w-full !max-w-none space-y-5">
          {/* Statistics */}
          <section className="!w-full">
            <div className="mb-2.5">
              <h2 className="text-xs font-medium text-[var(--admin-foreground)]">
                Advertising overview
              </h2>
            </div>

            <div className="grid !w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Vendors"
                value={`${stats.active_vendors} / ${stats.total_vendors}`}
                description="Active / total vendors"
              />

              <StatCard
                label="Placements"
                value={stats.total_placements}
                description="Total ad placements"
              />

              <StatCard
                label="Active ads"
                value={`${stats.active_ads} / ${stats.total_ads}`}
                description="Active / total ads"
              />

              <StatCard
                label="Overall CTR"
                value={`${stats.overall_ctr}%`}
                description="Across all vendors"
              />
            </div>
          </section>

          {/* Vendors */}
          <section className="!w-full !max-w-none">
            <div className="mb-2.5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xs font-medium text-[var(--admin-foreground)]">
                  Vendors
                </h2>

                <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
                  Performance across your advertising vendors.
                </p>
              </div>

              <Link
                href="/dashboard/vendors"
                className="admin-link shrink-0 text-[11px]"
              >
                View all
              </Link>
            </div>

            {/* FULL WIDTH TABLE */}
            <div className="admin-table-card !w-full !max-w-none">
              <div className="!w-full overflow-x-auto">
                <table className="admin-table !w-full text-xs">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Placements</th>
                      <th>Active ads</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>CTR</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.by_vendor.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)]">
                              <span className="text-base text-[var(--admin-muted)]">
                                +
                              </span>
                            </div>

                            <p className="text-xs font-medium text-[var(--admin-foreground)]">
                              No vendors yet
                            </p>

                            <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                              Add your first vendor to start managing
                              advertising.
                            </p>

                            <Link
                              href="/dashboard/vendors"
                              className="admin-button admin-button-primary mt-3 !px-3 !py-1.5 text-[11px]"
                            >
                              Add your first vendor
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )}

                    {stats.by_vendor.map((vendor) => (
                      <tr key={vendor.vendor_id}>
                        <td>
                          <div className="font-medium text-[var(--admin-foreground)]">
                            {vendor.vendor_name}
                          </div>
                        </td>

                        <td className="admin-table-muted">
                          {vendor.placements}
                        </td>

                        <td className="admin-table-muted">
                          {vendor.active_ads}
                        </td>

                        <td className="admin-table-muted">
                          {vendor.impressions}
                        </td>

                        <td className="admin-table-muted">
                          {vendor.clicks}
                        </td>

                        <td className="admin-table-muted">
                          {vendor.ctr}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}