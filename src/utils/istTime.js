// India is UTC+05:30, no DST.
// We'll do simple conversions off system time assuming server is also IST.
// If you deploy on non-IST infra later, switch to luxon/dayjs-tz.

export function nowIST() {
  // Right now we'll assume server clock == IST. Keep it simple.
  return new Date();
}

// Format YYYY-MM-DD in IST, used as _id in daily_universe
export function getISTDateKey() {
  const d = nowIST();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Compare current HH:MM (IST) with cutoff time string "15:00"
export function isAfterTimeHHMM(targetHHMM) {
  const now = nowIST();
  const [hh, mm] = targetHHMM.split(":").map(Number);
  const nowHH = now.getHours();
  const nowMM = now.getMinutes();

  if (nowHH > hh) return true;
  if (nowHH < hh) return false;
  return nowMM >= mm;
}

export function isBeforeTimeHHMM(targetHHMM) {
  const now = nowIST();
  const [hh, mm] = targetHHMM.split(":").map(Number);
  const nowHH = now.getHours();
  const nowMM = now.getMinutes();

  if (nowHH < hh) return true;
  if (nowHH > hh) return false;
  return nowMM < mm;
}
