const ICS_URL_MAX = 2000;

/** Normalize pasted calendar links (webcal → https). Client-safe. */
export function normalizeIcalUrl(
  raw: string | undefined | null,
): string | undefined {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return undefined;
  const swapped = trimmed.replace(/^webcal:/i, "https:");
  try {
    const u = new URL(swapped);
    if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
    return u.toString().slice(0, ICS_URL_MAX);
  } catch {
    return undefined;
  }
}
