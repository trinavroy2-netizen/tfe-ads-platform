"use client";

import { useEffect, useRef, useState } from "react";

type Ad = {
  id: number;
  title?: string | null;
  alt_text?: string | null;
  image_url: string;
  target_url?: string | null;
  click_url?: string | null;
  open_in_new_tab?: boolean;
};

type AdsResponse = {
  ads?: Ad[];
  dimensions?: {
    desktop_width?: number | string;
    desktop_height?: number | string;
    tablet_width?: number | string;
    tablet_height?: number | string;
    mobile_width?: number | string;
    mobile_height?: number | string;
  };
};

export type AdsComponentProps = {
  /**
   * Vendor slug.
   * Example: "toolsforengineers"
   */
  vendor: string;

  /**
   * Ad placement.
   * Example: "homepage", "hydro", "solar"
   */
  placement: string;

  /**
   * Public vendor API key.
   */
  apiKey?: string;

  /**
   * Carousel interval in milliseconds.
   * Default: 4000
   */
  interval?: number;

  /**
   * Additional CSS classes.
   */
  className?: string;

  /**
   * Maximum desktop width.
   * Default: 1320
   */
  maxWidth?: number;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || ""
).replace(/\/$/, "");

export default function AdsComponent({
  vendor,
  placement,
  apiKey = "",
  interval = 4000,
  className = "",
  maxWidth = 1320,
}: AdsComponentProps) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const impressedAds = useRef<Set<number>>(new Set());

  /*
   * --------------------------------------------------
   * FETCH ADS
   * --------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchAds() {
      if (!API_BASE) {
        console.error(
          "AdsComponent: NEXT_PUBLIC_API_BASE is not configured."
        );

        setAds([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const url = new URL(
          `${API_BASE}/api/public/ads`
        );

        url.searchParams.set("vendor", vendor);
        url.searchParams.set("placement", placement);

        const response = await fetch(
          url.toString(),
          {
            method: "GET",
            headers: apiKey
              ? {
                  "X-API-Key": apiKey,
                }
              : undefined,
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Ads request failed: ${response.status}`
          );
        }

        const data: AdsResponse =
          await response.json();

        const loadedAds = Array.isArray(data.ads)
          ? data.ads
          : [];

        if (!cancelled) {
          setAds(loadedAds);
          setCurrentIndex(0);
          impressedAds.current.clear();
        }
      } catch (error) {
        console.error(
          "AdsComponent:",
          error
        );

        if (!cancelled) {
          setAds([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAds();

    return () => {
      cancelled = true;
    };
  }, [vendor, placement, apiKey]);

  /*
   * --------------------------------------------------
   * AUTO ROTATION
   * --------------------------------------------------
   */
  useEffect(() => {
    if (ads.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex(
        (previous) =>
          (previous + 1) % ads.length
      );
    }, interval);

    return () => {
      window.clearInterval(timer);
    };
  }, [ads.length, interval]);

  /*
   * --------------------------------------------------
   * IMPRESSION TRACKING
   * --------------------------------------------------
   */
  useEffect(() => {
    const ad = ads[currentIndex];

    if (!ad) {
      return;
    }

    if (impressedAds.current.has(ad.id)) {
      return;
    }

    impressedAds.current.add(ad.id);

    if (!API_BASE) {
      return;
    }

    fetch(
      `${API_BASE}/api/public/track`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey
            ? {
                "X-API-Key": apiKey,
              }
            : {}),
        },
        body: JSON.stringify({
          ad_id: ad.id,
          event_type: "impression",
        }),
        keepalive: true,
      }
    ).catch(() => {});
  }, [
    ads,
    currentIndex,
    apiKey,
  ]);

  /*
   * --------------------------------------------------
   * CLICK TRACKING
   * --------------------------------------------------
   */
  function trackClick(adId: number) {
    if (!API_BASE) {
      return;
    }

    fetch(
      `${API_BASE}/api/public/track`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey
            ? {
                "X-API-Key": apiKey,
              }
            : {}),
        },
        body: JSON.stringify({
          ad_id: adId,
          event_type: "click",
        }),
        keepalive: true,
      }
    ).catch(() => {});
  }

  /*
   * --------------------------------------------------
   * LOADING / EMPTY STATE
   * --------------------------------------------------
   */
  if (loading) {
    return null;
  }

  if (!ads.length) {
    return null;
  }

  const activeAd = ads[currentIndex];

  if (!activeAd) {
    return null;
  }

  const targetUrl =
    activeAd.target_url ||
    activeAd.click_url ||
    "#";

  /*
   * --------------------------------------------------
   * COMPONENT
   * --------------------------------------------------
   */
  return (
    <div
      className={[
        "relative",
        "block",
        "w-full",
        "mx-auto",
        "overflow-hidden",
        "rounded-[8px]",
        "bg-transparent",
        "leading-[0]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        maxWidth: `${maxWidth}px`,
      }}
    >
      {/* AD IMAGE */}
      <a
        href={targetUrl}
        target={
          activeAd.open_in_new_tab === false
            ? "_self"
            : "_blank"
        }
        rel="noopener noreferrer sponsored"
        aria-label={
          activeAd.title ||
          "Advertisement"
        }
        onClick={() =>
          trackClick(activeAd.id)
        }
        className="
          block
          w-full
          overflow-hidden
          rounded-[8px]
          leading-[0]
        "
      >
        <img
          src={activeAd.image_url}
          alt={
            activeAd.alt_text ||
            activeAd.title ||
            "Advertisement"
          }
          loading={
            currentIndex === 0
              ? "eager"
              : "lazy"
          }
          decoding="async"
          className="
            block
            w-full
            h-auto
            max-w-full
            min-w-0
            rounded-[8px]
            border-0
            object-contain
            object-center
          "
        />
      </a>

      {/* AD LABEL */}
      <span
        className="
          pointer-events-none
          absolute
          right-1.5
          top-1
          z-10
          text-[10px]
          leading-none
          tracking-[0.05em]
          text-black/35
        "
      >
        Ad
      </span>

      {/* DOT NAVIGATION */}
      {ads.length > 1 && (
        <div
          className="
            absolute
            bottom-2
            left-0
            right-0
            z-10
            flex
            items-center
            justify-center
            gap-1.5
          "
        >
          {ads.map((ad, index) => (
            <button
              key={ad.id}
              type="button"
              aria-label={`Go to ad ${index + 1}`}
              aria-current={
                index === currentIndex
              }
              onClick={() =>
                setCurrentIndex(index)
              }
              className={[
                "h-[7px]",
                "rounded-full",
                "border",
                "border-black/15",
                "p-0",
                "cursor-pointer",
                "transition-all",
                "duration-200",
                index === currentIndex
                  ? "w-5 bg-[#1a73e8]"
                  : "w-[7px] bg-white/65",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}