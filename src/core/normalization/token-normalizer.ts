export interface DigitNormalization {
  original: string;
  cleaned: string;
  numeric: number | null;
  isPercent: boolean;
  hadOCRFix: boolean;
  isValid: boolean;
  confidence: number;
}

export const normalizeDigits = (token: string): DigitNormalization => {
  const original = token;

  let hadOCRFix = false;
  const isPercent = /%/.test(token);

  // Apply OCR digit substitutions
  let ocrFixed = token
    .replace(/[oO]/g, () => { hadOCRFix = true; return '0'; })
    .replace(/[lLiI]/g, () => { hadOCRFix = true; return '1'; })
    .replace(/[sS]/g, () => { hadOCRFix = true; return '5'; })
    .replace(/[bB]/g, () => { hadOCRFix = true; return '8'; });

  // Normalize currency formatting
  let cleaned = ocrFixed
    .replace(/[₹$£€]/g, '')    // remove currency symbols
    .replace(/,/g, '')          // remove commas (1,200 → 1200)
    .replace(/\/-$/g, '')       // remove "/-" suffix
    .replace(/%/g, '')          // temporarily strip percent for parsing
    .replace(/\s+/g, '')        // trim whitespace
    .trim();

  const numeric = cleaned.length > 0 && !isNaN(Number(cleaned))
    ? Number(cleaned)
    : null;

  const isValid = numeric !== null && numeric >= 0;

  // Compute confidence
  let confidence = 0.6; // base

  if (isValid) confidence += 0.2;
  if (hadOCRFix) confidence += 0.1;
  if (isPercent) confidence += 0.05;

  confidence = Math.min(confidence, 0.95);

  return {
    original,
    cleaned,
    numeric,
    isPercent,
    hadOCRFix,
    isValid,
    confidence
  };
};