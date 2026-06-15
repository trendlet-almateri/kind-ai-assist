/**
 * Canonical phone normalization — shared by every code path that matches a
 * customer by phone number (inbound webhooks, outbound notifications).
 *
 * WHY this exists:
 * - Inbound webhooks store whatever WhatsApp/Twilio sends in `From`, which
 *   after stripping the "whatsapp:" prefix is already E.164 with a leading "+"
 *   (e.g. "+966548154831"). Trendlet sends notifications normalized the same way.
 * - But a human-typed number ("0548154831", "966 54 815 4831", "+966-548154831")
 *   must collapse to the SAME canonical string or we create duplicate threads.
 *
 * Canonical form: E.164 WITH a leading "+", digits only otherwise.
 * This matches what the Twilio/Meta inbound webhooks already store, so existing
 * conversations link up without a backfill.
 *
 * Most customers are Saudi, so a number with no country code is assumed Saudi:
 *   - "05XXXXXXXX"  → "+9665XXXXXXXX"  (drop the trunk 0, prepend 966)
 *   - "5XXXXXXXX"   → "+9665XXXXXXXX"
 * Numbers that already carry a country code (with "+", "00", or a bare "966…")
 * are kept as-is, so non-Saudi customers work too.
 */

const SAUDI_CC = "966";

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Strip the WhatsApp channel prefix if present, then keep digits only.
  // We remember whether the caller already supplied an explicit "+" or "00",
  // because that tells us the country code is already there.
  const trimmed = input.replace(/^whatsapp:/i, "").trim();
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // International prefix "00" → already has a country code.
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return `+${digits}`;
  }

  // Explicit "+" → already E.164, just canonicalize the digits.
  if (hadPlus) {
    return `+${digits}`;
  }

  // Bare number that already starts with the Saudi country code.
  if (digits.startsWith(SAUDI_CC)) {
    return `+${digits}`;
  }

  // No country code — assume Saudi. Drop a trunk 0 if present.
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `+${SAUDI_CC}${digits}`;
}
