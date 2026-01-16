import { KEYWORDS, KeywordSpec } from "../../shared/constants/keywords";
import { AmountType, LabeledAmount } from "../../shared/types/bill.types";
import { EXTRACT_NUMBER_REGEX } from "../../shared/constants/patterns";

export class RuleEngine {

  process(text: string): LabeledAmount[] {
    // Step 1: lowercase, not normalizing ocr
    const lines = text
      .toLowerCase()
      .replace(/\|/g, '\n')           // Convert pipes to newlines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const results: LabeledAmount[] = [];
    const seenTypes = new Set<AmountType>(); // Prevent duplicates

    for (const line of lines) {
      for (const [type, specs] of Object.entries(KEYWORDS)) {
        // Skip if we already found this type
        if (seenTypes.has(type as AmountType)) continue;

        let best: {
          value: number,
          score: number,
          source: string
        } | null = null;

        for (const spec of specs as KeywordSpec[]) {
          const canonical = spec.k.toLowerCase();
          const variants = spec.variants?.map(v => v.toLowerCase()) || [];

          const isCanonical = line.includes(canonical);
          const matchedVariant = variants.find(v => line.includes(v));

          if (!isCanonical && !matchedVariant) continue;

          // Extract all numbers from this line (simple digit regex)
          const numberMatches = line.match(/\d+(?:[,\s]\d+)*(?:\.\d+)?/g);
          
          if (!numberMatches || numberMatches.length === 0) continue;

          // Find the number closest to the keyword
          const kwIdx = line.indexOf(matchedVariant || canonical);
          
          for (const numStr of numberMatches) {
            // Clean the number (remove commas and spaces)
            const cleaned = numStr.replace(/[,\s]/g, '');
            const numeric = parseFloat(cleaned);
            
            if (isNaN(numeric) || numeric === 0) continue;

            // Calculate score
            let score = spec.weight;

            // Variant penalty
            if (matchedVariant) score *= 0.85;

            // Proximity bonus (number near keyword gets higher score)
            const numIdx = line.indexOf(numStr);
            const dist = Math.abs(numIdx - kwIdx);
            if (dist < 20) score += 0.05;

            if (!best || score > best.score) {
              best = {
                value: numeric,
                score,
                source: line.trim()
              };
            }
          }
        }

        if (best) {
          results.push({
            type: type as AmountType,
            value: best.value,
            source: best.source,
            confidence: Math.min(best.score, 0.95)
          });
          seenTypes.add(type as AmountType);
        }
      }
    }

    return results;
  }
}