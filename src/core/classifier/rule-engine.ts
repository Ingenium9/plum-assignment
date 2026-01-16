import { KEYWORDS, KeywordSpec } from "../../shared/constants/keywords";
import { AmountType, LabeledAmount } from "../../shared/types/bill.types";

export class RuleEngine {

  process(text: string): LabeledAmount[] {
    // Normalize and split into lines
    const lines = text
      .toLowerCase()
      .replace(/\|/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const results: LabeledAmount[] = [];
    const seenTypes = new Set<AmountType>();

    for (const line of lines) {
      for (const [type, specs] of Object.entries(KEYWORDS)) {
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

          // Find keyword position
          const kwMatch = matchedVariant || canonical;
          const kwIdx = line.indexOf(kwMatch);
          
          // Extract substring AFTER the keyword
          const afterKeyword = line.substring(kwIdx + kwMatch.length);
          
          // Find first number after keyword
          const numberMatch = afterKeyword.match(/\d+(?:[,\s]\d+)*(?:\.\d+)?/);
          
          if (!numberMatch) continue;

          const numStr = numberMatch[0];
          const cleaned = numStr.replace(/[,\s]/g, '');
          const numeric = parseFloat(cleaned);
          
          if (isNaN(numeric) || numeric === 0) continue;

          // Calculate score
          let score = spec.weight;
          if (matchedVariant) score *= 0.85;
          
          // Proximity bonus
          const distanceToNumber = afterKeyword.indexOf(numStr);
          if (distanceToNumber < 10) score += 0.05;

          if (!best || score > best.score) {
            best = {
              value: numeric,
              score,
              source: line.trim()
            };
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