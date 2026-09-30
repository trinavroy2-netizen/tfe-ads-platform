import type { PublicAdsResponse } from "./types";

export class AdsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const trimSlash = (s: string) => s.replace(/\/$/, "");

export async function fetchAds(
  apiBase: string,
  vendor: string,
  placement: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<PublicAdsResponse> {
  const url = `${trimSlash(apiBase)}/api/public/ads?vendor=${encodeURIComponent(vendor)}&placement=${encodeURIComponent(placement)}`;
  const res = await fetch(url, { headers: { "X-API-Key": apiKey }, signal });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      detail = (await res.json()).detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new AdsApiError(detail, res.status);
  }
  return res.json();
}

export function trackEvent(apiBase: string, adId: string, eventType: "impression" | "click") {
  const url = `${trimSlash(apiBase)}/api/public/track`;
  const body = JSON.stringify({ ad_id: adId, event_type: eventType });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}
