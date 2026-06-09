/**
 * Centrální konfigurace funnelu (kalkulačková část).
 *
 * Výsledkové stránky (rezervace + prodejka konzultace) i ThriveCart/kalendář
 * jsou na hlavním webu realitnirentier.cz (WBV) — viz webbyvoice/scripts/pages.
 * Tady zůstává jen to, co potřebuje samotná kalkulačka.
 */
export const FUNNEL = {
  /** Cílové stránky brány — na hlavním webu (jednotná data: pixel 5048 + GA4). */
  resultPages: {
    rezervace: "https://realitnirentier.cz/rezervace",
    konzultace: "https://realitnirentier.cz/strategicka-konzultace",
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
