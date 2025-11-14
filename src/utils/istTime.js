// src/utils/istTime.js
// We assume server clock == IST for now.
// If you deploy on a non-IST server, switch to a tz library.

export function nowIST() {
  return new Date();
}

export function getISTDateKey() {
  const d = nowIST();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
// Return "HH:MM" in IST
export function getISTClock() {
  const d = nowIST();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// true if current time is AFTER hh:mm IST
export function isAfterTimeHHMM(targetHHMM) {
  const [hh, mm] = targetHHMM.split(":").map(Number);
  const now = nowIST();
  const nowHH = now.getHours();
  const nowMM = now.getMinutes();

  if (nowHH > hh) return true;
  if (nowHH < hh) return false;
  return nowMM >= mm;
}

// true if current time is BEFORE hh:mm IST
export function isBeforeTimeHHMM(targetHHMM) {
  const [hh, mm] = targetHHMM.split(":").map(Number);
  const now = nowIST();
  const nowHH = now.getHours();
  const nowMM = now.getMinutes();

  if (nowHH < hh) return true;
  if (nowHH > hh) return false;
  return nowMM < mm;
}
