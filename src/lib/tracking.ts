/**
 * Tenká vrstva nad GA4 (gtag) a Meta Pixel (fbq).
 * Bezpečné no-op, pokud trackery ještě nejsou na stránce nasazené —
 * nic nespadne, jen se event tiše zahodí. Až se přidá GTM/Pixel, eventy
 * začnou téct automaticky bez změny volajícího kódu.
 */

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/** GA4 custom event. */
export function ga4(event: string, params: Props = {}): void {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, params);
    } else if (typeof window !== "undefined") {
      // Fallback: zapiš do dataLayer, ať to GTM chytne, až bude.
      (window.dataLayer = window.dataLayer || []).push({ event, ...params });
    }
  } catch {
    /* ignore */
  }
}

/** Meta Pixel standardní nebo custom event. */
export function meta(event: string, params: Props = {}, standard = true): void {
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq(standard ? "track" : "trackCustom", event, params);
    }
  } catch {
    /* ignore */
  }
}

/** Funnel eventy na jednom místě — ať se nepřeklepneme v názvech. */
export const funnelEvents = {
  vslPlay: () => ga4("vsl_play"),
  vslProgress: (percent: 25 | 50 | 75 | 100) => ga4(`vsl_${percent}`),
  ctaClicked: (where: string) => {
    ga4("cta_clicked", { where });
  },
  qualificationComplete: (status: string, reason?: string) => {
    ga4("qualification_complete", { status, reason });
  },
  arrCallBooked: () => {
    ga4("arr_call_booked");
    meta("Schedule");
  },
  consultationOffered: () => {
    ga4("consultation_offered");
  },
  consultationPurchased: (value = 14990) => {
    ga4("consultation_purchased", { value, currency: "CZK" });
    meta("Purchase", { value, currency: "CZK" });
  },
};
