// src/utils/formatPrice.js
import { round2 } from "./math.js";

export function formatPrice(n) {
  if (n == null || Number.isNaN(n)) return null;
  return round2(n);
}

export function round2(x) {
  return Math.round(x * 100) / 100;
}

export function toRupees(x) {
  return `₹${round2(x)}`;
}
