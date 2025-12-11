// src/utils/timeWindow.js
/**
 * Check whether current time (Date) falls between startHH:MM and endHH:MM in local timezone.
 */
export function withinTimeWindow(date, start, end) {
  const [sh, sm] = start.split(":").map((v) => parseInt(v, 10));
  const [eh, em] = end.split(":").map((v) => parseInt(v, 10));
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return true; // fail open
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
