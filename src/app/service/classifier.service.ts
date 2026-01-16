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

    // Step 1: Rule Engine
    const ruleResults: LabeledAmount[] = ruleEngine.process(text);
    const ruleConfidence = this.computeRuleConfidence(ruleResults);

    if (ruleConfidence >= 0.75) {
      return {
        source: "rule",
        amounts: ruleResults,
        confidence: ruleConfidence
      };
    }

    console.log("[Classifier] Rule weak → falling back to local LLM");

    // Step 2: LLM fallback (local Llama3)
    const llmResults = await llm.classify(text);

    // If LLM gives nothing - return weak rule output instead of empty
    if (!llmResults.amounts || llmResults.amounts.length === 0) {
      return {
        source: "rule",
        amounts: ruleResults,
        confidence: ruleConfidence * 0.9 // penalize fallback but not 0
      };
    }

    return {
      source: "llm",
      amounts: llmResults.amounts,
      confidence: llmResults.confidence
    };
  }
}
