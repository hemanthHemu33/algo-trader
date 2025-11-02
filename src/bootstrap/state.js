// src/bootstrap/state.js
let RUNTIME = null;

export function setRuntimeState(s) {
  RUNTIME = s;
}

export function getRuntimeState() {
  return RUNTIME;
}
