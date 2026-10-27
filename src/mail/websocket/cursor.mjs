const maxSnowflakeCursor = 18_446_744_073_709_551_615n;
const decimalCursorPattern = /^(0|[1-9]\d{0,19})$/;

export function isValidCursor(value) {
  if (typeof value !== "string" || !decimalCursorPattern.test(value)) return false;
  return BigInt(value) <= maxSnowflakeCursor;
}
