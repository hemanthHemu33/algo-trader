// src/utils/istTime.js
// NOTE: we assume server is running in IST (UTC+05:30).
// If you deploy on non-IST infra later, replace these helpers
// with a proper timezone library like dayjs-tz or luxon.

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function nowIST() {
  // simple for now: just new Date() and assume machine clock == IST
  return new Date();
}

// "2025-11-02"
export function getISTDateKey() {
  const d = nowIST();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

// "HH:MM" in IST
export function getISTClock() {
  const d = nowIST();
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${hh}:${mm}`;
}

// internal
function parseHHMM(str) {
  const [hh, mm] = str.split(":").map((x) => parseInt(x, 10));
  return { hh, mm };
}

// true if current IST time >= target (e.g. "15:20")
export function isAfterIST(targetHHMM) {
  const now = nowIST();
  const { hh, mm } = parseHHMM(targetHHMM);
  if (now.getHours() > hh) return true;
  if (now.getHours() < hh) return false;
  return now.getMinutes() >= mm;
}

// true if current IST time <= target
export function isBeforeIST(targetHHMM) {
  const now = nowIST();
  const { hh, mm } = parseHHMM(targetHHMM);
  if (now.getHours() < hh) return true;
  if (now.getHours() > hh) return false;
  return now.getMinutes() <= mm;
}
