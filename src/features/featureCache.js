// src/features/featureCache.js
// tiny in-memory cache for debug/inspection later
const _cache = new Map();

export function setFeatures(symbol, frame) {
  _cache.set(symbol, frame);
}

export function getFeatures(symbol) {
  return _cache.get(symbol) || null;
}

export function dumpFeatures() {
  return Object.fromEntries(_cache.entries());
}
