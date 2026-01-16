import { normalizeDigits, DigitNormalization } from "./token-normalizer";

export interface NormalizedToken {
  original: string;
  cleaned: string;
  numeric: number;
  isPercent: boolean;
  hadOCRFix: boolean;
  confidence: number;
}

export class NumberNormalizer {
  normalize(text: string) {
    // Extract pure numbers only (no currency prefixes)
    // This prevents "Rs 1200" from being treated as one token
    const numberRegex = /\d+(?:[,\s]\d+)*(?:\.\d{1,2})?/g;
    const matches = text.match(numberRegex) || [];

    const normalizedTokens: NormalizedToken[] = matches.map((raw) => {
      const norm: DigitNormalization = normalizeDigits(raw);

      // Compute confidence
      let confidence = 0.6; // base
      if (norm.numeric !== null && norm.numeric > 0) confidence += 0.2;
      if (norm.hadOCRFix) confidence += 0.1;
      if (norm.isPercent) confidence += 0.1;

      confidence = Math.min(confidence, 0.95);

      return {
        original: norm.original,
        cleaned: norm.cleaned,
        numeric: norm.numeric ?? 0,
        isPercent: norm.isPercent,
        hadOCRFix: norm.hadOCRFix,
        confidence
      };
    });

    // overall normalization reliability
    const normalizationConfidence =
      normalizedTokens.length > 0
        ? normalizedTokens.reduce((a, t) => a + t.confidence, 0) / normalizedTokens.length
        : 0.0;

    return {
      normalizedTokens,
      normalizationConfidence
    };
  }
}