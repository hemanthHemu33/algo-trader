// src/strategy/scoreSetup.js
export function scoreSetup(setup) {
  if (!setup) return 0;
  return Math.round((setup.confidence || 0) * 100);
}
