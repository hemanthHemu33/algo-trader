export function assert(condition, message = "assertion failed") {
  if (!condition) {
    throw new Error(message);
  }
}
