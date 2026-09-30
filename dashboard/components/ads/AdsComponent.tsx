"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import styles from "./AdsComponent.module.css";
import { fetchAds, trackEvent } from "./adsClient";
import type { AdsComponentProps, PublicAdsResponse } from "./types";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: PublicAdsResponse };

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/**
 * Universal ads component.
 *
 * Vendor-specific values come only through props:
 * vendor / placement / apiKey / apiBase
 *
 * The container uses the placement dimensions as a fallback ratio,
 * then automatically updates to the actual loaded image ratio.
 */
export default function AdsComponent({
  vendor,
  placement,
  apiKey,
  apiBase = DEFAULT_API_BASE,
  intervalMs = 4000,
  className,
}: AdsComponentProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // Actual image ratios indexed by ad ID.
  const imageRatios = useRef<Map<string, number>>(new Map());

  // Deduplicate impressions per mounted component.
  const impressed = useRef<Set<string>>(new Set());

  // ------------------------------------------------------------
  // Load ads
  // ------------------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    impressed.current = new Set();
    imageRatios.current = new Map();

    setState({ kind: "loading" });
    setIndex(0);

    fetchAds(
      apiBase,
      vendor,
      placement,
      apiKey,
      controller.signal
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ kind: "ready", data });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Could not load ads",
        });
      });

    return () => controller.abort();
  }, [apiBase, vendor, placement, apiKey]);

  const ads = state.kind === "ready" ? state.data.ads : [];

  const dims =
    state.kind === "ready"
      ? state.data.dimensions
      : null;

  // ------------------------------------------------------------
  // Visibility
  // ------------------------------------------------------------

  useEffect(() => {
    const node = rootRef.current;

    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [state.kind]);

  // ------------------------------------------------------------
  // Impression tracking
  // ------------------------------------------------------------

  useEffect(() => {
    if (!inView) return;

    const ad = ads[index];

    if (!ad) return;
    if (impressed.current.has(ad.id)) return;

    impressed.current.add(ad.id);

    trackEvent(
      apiBase,
      ad.id,
      "impression"
    );
  }, [inView, index, ads, apiBase]);

  // ------------------------------------------------------------
  // Auto rotation
  // ------------------------------------------------------------

  useEffect(() => {
    if (ads.length < 2) return;
    if (paused) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;

      setIndex((current) => {
        return (current + 1) % ads.length;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [ads.length, paused, intervalMs]);

  // ------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => {
        if (!ads.length) return 0;

        return (
          (current + delta + ads.length) %
          ads.length
        );
      });
    },
    [ads.length]
  );

  // ------------------------------------------------------------
  // Placement fallback ratio
  //
  // Example:
  // 1320 x 300
  // ratio = 4.4
  //
  // At 1000px width:
  // height = 1000 / 4.4 = 227.27px
  // ------------------------------------------------------------

  const placementRatio =
    dims &&
    Number(dims.desktop_width) > 0 &&
    Number(dims.desktop_height) > 0
      ? Number(dims.desktop_width) /
        Number(dims.desktop_height)
      : 4.4;

  // ------------------------------------------------------------
  // Actual active image ratio
  // ------------------------------------------------------------

  const activeAd = ads[index];

  const activeImageRatio = activeAd
    ? imageRatios.current.get(activeAd.id)
    : undefined;

  const currentRatio =
    activeImageRatio && activeImageRatio > 0
      ? activeImageRatio
      : placementRatio;

  // ------------------------------------------------------------
  // CSS variables
  //
  // Height values are kept available for compatibility,
  // but the actual container height is controlled by aspect ratio.
  // ------------------------------------------------------------

  const cssVars = {
    "--ads-max-width": dims
      ? `${dims.desktop_width}px`
      : "1320px",

    "--ads-aspect-ratio": String(currentRatio),

    "--ads-height-desktop": dims
      ? `${dims.desktop_height}px`
      : "300px",

    "--ads-height-tablet": dims
      ? `${dims.tablet_height}px`
      : "260px",

    "--ads-height-mobile": dims
      ? `${dims.mobile_height}px`
      : "220px",
  } as CSSProperties;

  // ------------------------------------------------------------
  // Image load
  //
  // Once image loads, use its real natural dimensions.
  // This makes the container follow the image exactly.
  // ------------------------------------------------------------

  const handleImageLoad = useCallback(
    (
      adId: string,
      event: React.SyntheticEvent<HTMLImageElement>
    ) => {
      const image = event.currentTarget;

      if (
        image.naturalWidth <= 0 ||
        image.naturalHeight <= 0
      ) {
        return;
      }

      const ratio =
        image.naturalWidth /
        image.naturalHeight;

      imageRatios.current.set(adId, ratio);

      // Only update if this is currently visible.
      if (ads[index]?.id === adId) {
        setState((current) => current);
      }
    },
    [ads, index]
  );

  // ------------------------------------------------------------
  // Empty placement
  // ------------------------------------------------------------

  if (
    state.kind === "ready" &&
    ads.length === 0
  ) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ""}`}
      style={cssVars}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Advertisements"
    >
      {state.kind === "loading" && (
        <div className={styles.status}>
          Loading…
        </div>
      )}

      {state.kind === "error" && (
        <div className={styles.status}>
          Ads unavailable: {state.message}
        </div>
      )}

      {state.kind === "ready" && (
        <>
          <div
            className={styles.viewport}
          >
            <div
              className={styles.track}
              style={{
                transform: `translateX(-${
                  index * 100
                }%)`,
              }}
            >
              {ads.map((ad, adIndex) => (
                <div
                  key={ad.id}
                  className={styles.slide}
                  aria-hidden={adIndex !== index}
                >
                  <a
                    className={styles.link}
                    href={ad.target_url}
                    target={
                      ad.open_in_new_tab
                        ? "_blank"
                        : "_self"
                    }
                    rel="noopener noreferrer sponsored"
                    onClick={() =>
                      trackEvent(
                        apiBase,
                        ad.id,
                        "click"
                      )
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.image}
                      src={ad.image_url}
                      alt={
                        ad.alt_text ||
                        ad.title
                      }
                      loading={
                        adIndex === 0
                          ? "eager"
                          : "lazy"
                      }
                      decoding="async"
                      onLoad={(event) =>
                        handleImageLoad(
                          ad.id,
                          event
                        )
                      }
                    />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {ads.length > 1 && (
            <>
              <button
                type="button"
                className={`${styles.nav} ${styles.prev}`}
                aria-label="Previous ad"
                onClick={() => go(-1)}
              >
                ‹
              </button>

              <button
                type="button"
                className={`${styles.nav} ${styles.next}`}
                aria-label="Next ad"
                onClick={() => go(1)}
              >
                ›
              </button>

              <div
                className={styles.dots}
              >
                {ads.map((ad, i) => (
                  <button
                    key={ad.id}
                    type="button"
                    aria-label={`Go to ad ${
                      i + 1
                    }`}
                    className={`${styles.dot} ${
                      i === index
                        ? styles.dotActive
                        : ""
                    }`}
                    onClick={() =>
                      setIndex(i)
                    }
                  />
                ))}
              </div>
            </>
          )}

          <span className={styles.label}>
            Ad
          </span>
        </>
      )}
    </div>
  );
}