# Kryptopoly V32 – technický refaktor

## Co bylo změněno

### 1. Izolace identity hráče podle hry
Původní verze ukládala `playerId` globálně do `localStorage`. To vytvářelo riziko, že se v jednom prohlížeči přepíše identita mezi dvěma hrami nebo dvěma taby.

Nová verze zavádí per-game session model:

- `savePlayerSession(gameId, session)`
- `loadPlayerSession(gameId)`
- `loadPlayerIdForGame(gameId)`

Data se ukládají do `sessionStorage` i do root metadat v `localStorage` kvůli jednoduchému reconnectu. Frontend tak už nepoužívá jeden globální `playerId` pro všechny hry.

### 2. Centrální herní konfigurace
Byl přidán soubor `lib/game-config.js`.

Obsahuje:

- `GAME_PHASE_FLOW`
- `CONTINENT_ORDER`
- `CRYPTO_COINS`
- `getBasePriceForYear(year)`

Smysl: odstranit část rozptýlených konstant z UI a připravit základ pro další refaktor game engine vrstvy.

### 3. Přepojení obrazovek na per-game session
Byly upraveny stránky:

- `app/page.js`
- `app/create/page.js`
- `app/join/[gameId]/page.js`
- `app/lobby/[gameId]/page.js`
- `app/game/[gameId]/page.js`

Nově pracují s identitou navázanou na konkrétní `gameId`.

### 4. Stabilnější základní cena roku
Výpočet `Základní cena` v herní obrazovce už není natvrdo v JSX. Používá helper `getBasePriceForYear()` z centrální konfigurace.

---

## Co tento refaktor řeší

### Vyřešené / zlepšené
- omezení přepisování identity hráče mezi více hrami
- menší vazba UI na natvrdo zapsané herní konstanty
- lepší základ pro budoucí rozdělení monolitického `page.js`

### Nevyřešené v tomto balíku
Tyto body nelze poctivě dokončit bez backendového repozitáře / serverového zdrojového kódu:

1. **Plně server-authoritative identita hráče**
   - frontend je připravený na lepší session model,
   - ale server stále musí přestat důvěřovat `playerId` posílanému klientem.

2. **Server-authoritative phase machine**
   - ideálně musí být v backendu centrální řízení fází a committed stavů.

3. **Plné oddělení game engine logiky od UI**
   - část logiky je stále v `app/game/[gameId]/page.js`, protože serverová vrstva není součástí dodaného baseline ZIPu.

4. **Kompletní rozpad `page.js` na separátní phase komponenty**
   - tento krok je doporučený jako další fáze refaktoru.

---

## Doporučený další krok

### Fáze 2 – server + UI architektura
Jakmile bude k dispozici backendový zdroják, doporučený další refaktor je:

1. zavést server-authoritative session / reconnect token
2. přesunout phase machine na server
3. zavést centrální model trendů a hráčských akcí
4. rozdělit `app/game/[gameId]/page.js` na samostatné komponenty:
   - `MarketLeaderScreen`
   - `MarketSelectionScreen`
   - `AuctionScreen`
   - `AcquireScreen`
   - `CryptoScreen`
   - `AuditScreen`
   - `NewTrendsPopup`

---

## Zásady zachované při refaktoru
- **golden rule**: neměnit funkční flow bez důvodu
- **UX bible**: desková hra je hlavní médium, aplikace má být nástroj
- změny jsou záměrně omezené na stabilizační vrstvu, ne na redesign pravidel
