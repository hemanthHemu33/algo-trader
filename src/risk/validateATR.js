// src/risk/validateATR.js
/**
 * Optional ATR sanity check.
 * We make sure volatility (ATR%) isn't insane.
 * maxAtrPctOfPrice default ~7% like your hard gate idea.
 */
export function validateATR({ atrValue, lastClose, maxAtrPctOfPrice = 0.07 }) {
  if (atrValue == null || lastClose == null || lastClose <= 0) {
    return { ok: true, atrPct: null };
  }
  const atrPct = atrValue / lastClose;
  return {
    ok: atrPct <= maxAtrPctOfPrice,
    atrPct,
  };
}
