/**
 * Centrální konfigurace funnelu — všechno, co se "doplní později",
 * je tady na jednom místě. Měň hodnoty tady, ne v komponentách.
 */
export const FUNNEL = {
  /** Google Calendar rezervační stránka (call zdarma pro kvalifikované). */
  calendarUrl: "https://calendar.app.google/opeUKRzkAPLNFKdo6",

  /** Cena strategické konzultace (Kč, vč. DPH). */
  consultationPrice: 14990,

  /**
   * ThriveCart / Stripe embed URL pro konzultaci. Prázdné = zatím se ukáže
   * placeholder místo checkoutu. Doplň, až bude produkt vytvořený.
   */
  consultationCheckoutUrl: "",

  /**
   * VSL embed URL (YouTube/Vimeo) pro jednotlivá umístění. Prázdné = placeholder
   * "video brzy". Doplň, až bude video natočené a nahrané.
   */
  vsl: {
    dekovacka: "",
    strategy: "",
    planning: "",
  },
} as const;
