export interface PublicAd {
  id: string;
  title: string;
  image_url: string;
  target_url: string;
  alt_text: string;
  open_in_new_tab: boolean;
}

export interface PlacementDimensions {
  desktop_width: number;
  desktop_height: number;
  tablet_height: number;
  mobile_height: number;
}

export interface PublicAdsResponse {
  placement: string;
  dimensions: PlacementDimensions;
  ads: PublicAd[];
}

export interface AdsComponentProps {
  /** Vendor slug, e.g. "toolsforengineers". Never hardcoded in the component. */
  vendor: string;
  /** Placement slug for that vendor, e.g. "homepage". */
  placement: string;
  /** Public per-vendor integration key (not an admin secret). */
  apiKey: string;
  /** Backend base URL. Defaults to NEXT_PUBLIC_API_BASE, else same-origin. */
  apiBase?: string;
  /** Auto-rotation interval in ms (default 4000). */
  intervalMs?: number;
  className?: string;
}
