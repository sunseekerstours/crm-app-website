/**
 * Helper to format phone numbers cleanly, especially handling
 * scientific notation strings imported from Excel (e.g. "3.93464E+11").
 */
export function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (!trimmed) return '';

  // Handle scientific notation e.g. "3.93464E+11" or "4.4735E+11"
  if (/[eE]\+?\d+/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) {
      try {
        const intStr = BigInt(Math.round(num)).toString();
        return `+${intStr}`;
      } catch {
        // Fallback
      }
    }
  }

  return trimmed;
}
