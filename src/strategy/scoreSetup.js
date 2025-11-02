// src/strategy/scoreSetup.js
// Attach a quality score / confidence so downstream can rank

export function scoreSetup(setup) {
  if (!setup) return null;

  // For now just mirror confidence -> score
  return {
    ...setup,
    score: setup.confidence ?? 0.5,
  };
}
