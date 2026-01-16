import { RuleEngine } from "../../core/classifier/rule-engine";
import { LLMService } from "./llm.service";
import { AmountType, LabeledAmount } from "../../shared/types/bill.types";

const ruleEngine = new RuleEngine();
const llm = new LLMService();

export class ClassifierService {

  private computeRuleConfidence(results: LabeledAmount[]): number {
    let score = 0;

    const hasTotal = results.some(r => r.type === AmountType.TOTAL_BILL);
    const hasPaid = results.some(r => r.type === AmountType.PAID);
    const hasDue = results.some(r => r.type === AmountType.DUE);

    // Coverage contribution
    if (hasTotal) score += 0.4;
    if (hasPaid) score += 0.3;
    if (hasDue) score += 0.3;

    // Math consistency bonus
    const total = results.find(r => r.type === AmountType.TOTAL_BILL)?.value;
    const paid = results.find(r => r.type === AmountType.PAID)?.value;
    const due = results.find(r => r.type === AmountType.DUE)?.value;

    if (total && paid && due && (paid + due === total)) {
      score += 0.1;
    }

    return Math.min(score, 0.95);
  }

  async classify(text: string): Promise<{
    source: "rule" | "llm",
    amounts: LabeledAmount[],
    confidence: number
  }> {

    console.log("[Classifier] ===== Starting Classification =====");
    console.log("[Classifier] Input text:", text);

    // Step 1: Rule Engine
    const ruleResults: LabeledAmount[] = ruleEngine.process(text);
    console.log("[Classifier] Rule engine found:", ruleResults.length, "amounts");
    console.log("[Classifier] Rule results:", JSON.stringify(ruleResults, null, 2));
    
    const ruleConfidence = this.computeRuleConfidence(ruleResults);
    console.log("[Classifier] Rule confidence:", ruleConfidence);

    // Lower threshold to 0.65 to prefer rules
    if (ruleConfidence >= 0.65) {
      console.log("[Classifier] ✓ Using RULES (confidence >= 0.65)");
      return {
        source: "rule",
        amounts: ruleResults,
        confidence: ruleConfidence
      };
    }

    console.log("[Classifier] ✗ Rule confidence low, falling back to LLM");

    // Step 2: LLM fallback
    const llmResults = await llm.classify(text);
    console.log("[Classifier] LLM found:", llmResults.amounts?.length || 0, "amounts");

    // If LLM gives nothing OR rule found more - return rule output
    if (!llmResults.amounts || llmResults.amounts.length === 0) {
      console.log("[Classifier] LLM returned nothing, using rule results");
      return {
        source: "rule",
        amounts: ruleResults,
        confidence: ruleConfidence * 0.9
      };
    }

    // Prefer rules if they found more amounts
    if (ruleResults.length >= llmResults.amounts.length) {
      console.log("[Classifier] Rule found more/equal amounts, preferring rules");
      return {
        source: "rule",
        amounts: ruleResults,
        confidence: Math.max(ruleConfidence, 0.7)
      };
    }

    console.log("[Classifier] Using LLM results");
    return {
      source: "llm",
      amounts: llmResults.amounts,
      confidence: llmResults.confidence
    };
  }
}