/**
 * Centrální konfigurace funnelu — všechno, co se "doplní později",
 * je tady na jednom místě. Měň hodnoty tady, ne v komponentách.
 */
export const FUNNEL = {
  /** Google Calendar rezervační stránka (call zdarma pro kvalifikované). */
  calendarUrl: "https://calendar.app.google/opeUKRzkAPLNFKdo6",

  /** Název produktu — používá se v UI i v komunikaci. */
  consultationProductName: "Strategie realitního rentiéra",

  /** Cena (Kč, vč. DPH). */
  consultationPrice: 14990,

  /**
   * ThriveCart embed produktu "Strategie realitního rentiéra" (product 37,
   * účet doskvelosti). Embed se renderuje skriptem thrivecart.js, který
   * najde div podle `embeddableId`.
   */
  thrivecart: {
    account: "doskvelosti",
    product: "37",
    embeddableId: "tc-doskvelosti-37-H737E5",
    scriptSrc: "//tinder.thrivecart.com/embed/v1/thrivecart.js",
  },

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
