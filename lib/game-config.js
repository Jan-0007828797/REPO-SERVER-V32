export const GAME_PHASE_FLOW = [
  "ML_BID",
  "MOVE",
  "AUCTION_ENVELOPE",
  "ACQUIRE",
  "CRYPTO",
  "SETTLE",
];

export const CONTINENT_ORDER = [
  "Severní Amerika",
  "Evropa",
  "Asie",
  "Jižní Amerika",
  "Afrika",
  "Austrálie",
];

export const CRYPTO_COINS = ["BTC", "ETH", "LTC", "SIA"];

export function getBasePriceForYear(year) {
  const y = Math.max(1, Number(year || 1));
  return y * 5000;
}
