import { AmountType, LabeledAmount } from "../../shared/types/bill.types";
import { EXTRACT_NUMBER_REGEX } from "../../shared/constants/patterns";

// Enhanced rule-based fallback for when LLM is unavailable
class EnhancedRuleFallback {
  private patterns = {
    total_bill: [
      /(?:total|bill|amount|payable|invoice|grand)[:\s]*(?:amount)?[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:bill|invoice|grand)\s*(?:total|amount)[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /net\s*amount[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ],
    paid: [
      /(?:paid|payment|received|collected)[:\s]*(?:amount|done)?[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /amount\s*(?:paid|received)[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(?:cash|advance)[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ],
    due: [
      /(?:balance|amount|pending|remaining|outstanding)[:\s]*(?:due|payable)?[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /due[:\s]*(?:amount)?[:\s]*(?:inr|rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ],
  };

  extract(text: string): LabeledAmount[] {
    const amounts: LabeledAmount[] = [];
    const normalizedText = text.toLowerCase();
    const foundTypes = new Set<AmountType>();

    for (const [type, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = normalizedText.match(pattern);
        if (match && match[1] && !foundTypes.has(type as AmountType)) {
          amounts.push({
            type: type as AmountType,
            value: parseFloat(match[1].replace(/,/g, "")),
            source: match[0],
            confidence: 0.8,
          });
          foundTypes.add(type as AmountType);
          break;
        }
      }
    }

    return amounts;
  }
}

export class LLMService {
  private model: string;
  private fallback: EnhancedRuleFallback;
  private llmUnavailable: boolean = false;

  constructor() {
    this.model = "llama3:8b";
    this.fallback = new EnhancedRuleFallback();
  }

  private buildPrompt(text: string): string {
    return `Extract ALL financial amounts from this text and return as JSON.

TEXT: ${text}

Find every amount and classify each one:
- Words like "bill", "total", "amount" → type: "total_bill"
- Words like "paid", "payment", "received" → type: "paid"  
- Words like "due", "pending", "balance", "remaining" → type: "due"
- Words like "discount" → type: "discount"
- Words like "tax", "gst" → type: "tax"

Return this EXACT JSON format (complete all arrays, no truncation):

{
  "amounts": [
    {"type": "total_bill", "value": 1200, "source": "Bill Amount"},
    {"type": "paid", "value": 500, "source": "Payment Done"},
    {"type": "due", "value": 700, "source": "Pending"}
  ]
}

CRITICAL: Return the complete JSON with ALL amounts found. Do not truncate.

JSON:`;
  }

  private extractJSONBlock(raw: string): string | null {
    const match = raw.match(/\{[\s\S]*?\}/);
    return match ? match[0] : null;
  }

  async classify(text: string) {
    // If LLM already failed once, use fallback immediately
    if (this.llmUnavailable) {
      console.log("[LLM] Using rule-based fallback (LLM unavailable)");
      return this.useFallback(text);
    }

    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: this.buildPrompt(text),
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 1024
          }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        throw new Error(`Ollama API returned ${res.status}`);
      }

      const data = await res.json();
      const raw = data?.response?.trim();

      if (!raw) {
        console.log("[LLM] Empty response from Ollama");
        return this.useFallback(text);
      }

      // Extract JSON even if incomplete
      const jsonStr = this.extractJSONBlock(raw.replace(/```json|```/g, "").trim());

      if (!jsonStr) {
        console.log("[LLM] No valid JSON in response");
        return this.useFallback(text);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (err) {
        // Try to fix incomplete JSON
        console.log("[LLM] Attempting to repair incomplete JSON");
        const repaired = this.repairJSON(jsonStr);
        if (repaired) {
          try {
            parsed = JSON.parse(repaired);
          } catch {
            console.error("[LLM] JSON repair failed:", jsonStr);
            return this.useFallback(text);
          }
        } else {
          console.error("[LLM] JSON parse failed:", jsonStr);
          return this.useFallback(text);
        }
      }

      const amounts: LabeledAmount[] = (parsed.amounts || []).map((a: any) => ({
        type: a.type as AmountType,
        value: parseFloat(String(a.value)),
        source: a.source,
        confidence: 0.9
      }));

      const confidence =
        amounts.length >= 2 ? 0.9 :
        amounts.length === 1 ? 0.6 : 0.3;

      console.log(`[LLM] Successfully extracted ${amounts.length} amounts via Ollama`);

      return { amounts, confidence };

    } catch (err: any) {
      // Connection refused, timeout, or Ollama not running
      console.warn("[LLM] Ollama unavailable:", err.message);
      console.log("[LLM] Switching to rule-based fallback permanently");
      this.llmUnavailable = true;
      return this.useFallback(text);
    }
  }

  private repairJSON(jsonStr: string): string | null {
    // If JSON is incomplete, try to close it
    try {
      // Count opening vs closing braces/brackets
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      const openBrackets = (jsonStr.match(/\[/g) || []).length;
      const closeBrackets = (jsonStr.match(/\]/g) || []).length;

      let repaired = jsonStr;

      // Close unclosed arrays
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
      }

      // Close unclosed objects
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
      }

      return repaired;
    } catch {
      return null;
    }
  }

  private useFallback(text: string) {
    const amounts = this.fallback.extract(text);
    const confidence = amounts.length >= 2 ? 0.75 : amounts.length === 1 ? 0.5 : 0.2;
    
    console.log(`[LLM Fallback] Extracted ${amounts.length} amounts via rules`);
    
    return { amounts, confidence };
  }
}