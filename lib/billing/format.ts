export function normalizePhoneNumber(value: string) {
  return value.trim().replace(/[^0-9+]/g, "");
}

export function maskPhoneNumber(value: string) {
  const clean = normalizePhoneNumber(value);

  if (clean.length <= 6) {
    return clean.replace(/.(?=.{2})/g, "*");
  }

  return `${clean.slice(0, 4)}${"*".repeat(
    Math.max(clean.length - 7, 3)
  )}${clean.slice(-3)}`;
}
