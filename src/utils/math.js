// src/utils/math.js
export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function sum(arr) {
  return arr.reduce((acc, v) => acc + v, 0);
}

export function avg(arr) {
  if (!arr.length) return 0;
  return sum(arr) / arr.length;
}

export function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}
