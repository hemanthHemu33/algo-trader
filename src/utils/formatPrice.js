// src/utils/formatPrice.js
import { round2 } from "./math.js";

export function formatPrice(n) {
  if (n == null || Number.isNaN(n)) return null;
  return round2(n);
}
