---
name: prepinam
description: Magické slovo „přepínám" — bleskový LOKÁLNÍ handoff (bez pushe, bez commitů, s minimem tokenů) pro plynulé přenesení rozdělané práce do jiného účtu na tomtéž počítači (docházejí limity účtu). Aktivuj OKAMŽITĚ, když uživatel napíše „přepínám" — samostatně nebo ve větě o limitech/přenosu do jiného účtu. NEAKTIVUJ pro plné předání na konci práce (→ projektový skill handoff) ani když je „přepínám" citace v textu/copy.
---

# přepínám — rychlopřepínač účtů

## KRITICKÉ PRAVIDLO

Cíl = MINIMUM tokenů a času. Piš VÝHRADNĚ z toho, co už máš v kontextu
session. ŽÁDNÉ prohledávání repa, žádné git log / čtení souborů „pro
připomenutí", žádné ověřování po sobě, žádné doplňující otázky.
**Jeden Write + jeden rámeček v chatu → konec turnu.**

## Workflow (přesně 2 kroky)

**1. Write** `docs/handoffs/HANDOFF-prepinam-latest.md` **v aktuálním repu**
(jednotná cesta ve všech repech; Write chybějící složky vytvoří sám;
přepiš celý soubor bez čtení předchozí verze). Struktura (max ~50 řádků):

```markdown
# PŘEPÍNÁM — <téma session> (<datum čas>)

## Co děláme a proč
<2–3 věty>

## Stav
- HOTOVO: <odrážky s konkréty — commit sha / soubor / URL>
- ROZDĚLÁNO: <odrážky — přesně kde to stojí>

## Rozhodnutí z téhle session (+ proč)
<jen nová z této session; když žádná, napiš „—">

## OKAMŽITÝ další krok
<1 věta v imperativu — co má nová session udělat PRVNÍ>

## Klíčové soubory
- <cesta> — <proč>

## Pozor
<rozjeté procesy (porty/logy), necommitnuté změny, souběžné sessions,
gates/ploty — jen co reálně platí>
```

Necommitnuté změny **NECH být** — nový účet běží nad stejným working
tree, takže je uvidí. Committovat/pushovat NENÍ tvoje práce (převezme je
nová session se svým prvním commitem).

**2. Vypiš rámeček** do chatu jako kód blok (copy-paste) a ukonči turn:

```
Jsi v repu <absolutní cesta k repu>. Navazuji na session „<téma>" — přepnutí účtu, <datum>.
NEJDŘÍV přečti docs/handoffs/HANDOFF-prepinam-latest.md — pak už NIC neprohledávej.
Rozdělaná práce: <1 věta>.
OKAMŽITÝ KROK: <1 věta>.
POZOR: working tree může mít necommitnuté změny z minulé session — jsou záměrné, pokračuj na nich (git pull/rebase až po přečtení handoffu).
```

## Hard blocks

- **ŽÁDNÝ push, ŽÁDNÝ commit** — ani handoff souboru. (Plné předání
  s IMPROVEMENT-LOG, TEAM-BOARD a pushem dělá projektový skill `handoff`
  na konci práce — tohle je přepínač uprostřed rozdělané práce.)
- Žádný IMPROVEMENT-LOG, žádná system mapa, žádný TEAM-BOARD zápis.
- Žádné otázky uživateli („chceš doplnit?") — napiš a skonči.
- Max 1 pomocný příkaz za celý běh, a jen když bez něj neumíš vyjmenovat
  rozdělané soubory (typicky `git status --short`). Jinak nula příkazů.

## Reference

- Skill je verzovaný per-repo v `.claude/skills/prepinam/` a k týmu se
  dostává git pullem (webbyvoice · hermes-journal · Muj-AI-COO ·
  rentanadosah). **Kanonická verze = webbyvoice** — při úpravě propsat
  stejný soubor do ostatních rep (žádné user-level kopie, žádný drift).
- Plné předání (konec práce): projektový skill `handoff`, pokud v repu je.

## Příklad

Uživatel: *„dochází mi tady limity, přepínám"*
→ Write `docs/handoffs/HANDOFF-prepinam-latest.md` (z kontextu, ~40 řádků)
→ rámeček do chatu (včetně absolutní cesty k repu — nový účet nemusí hádat)
→ konec. Žádný push, žádné otázky, žádné další tool cally.
