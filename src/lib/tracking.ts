type W = Window & { dataLayer?: unknown[]; fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...params });
  if (w.fbq) {
    if (event === "lead") w.fbq("track", "Lead", params);
    else if (event === "schedule_complete") w.fbq("track", "Schedule", params);
    else w.fbq("trackCustom", event, params);
  }
}

export function captureAttribution() {
  const p = new URLSearchParams(window.location.search);
  const g = (k: string) => p.get(k) || null;
  return {
    utm_source: g("utm_source"),
    utm_medium: g("utm_medium"),
    utm_campaign: g("utm_campaign"),
    utm_content: g("utm_content"),
    utm_term: g("utm_term"),
    gclid: g("gclid"),
    fbclid: g("fbclid"),
    landing_page: window.location.href.slice(0, 500),
    referrer: document.referrer ? document.referrer.slice(0, 500) : null,
  };
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
