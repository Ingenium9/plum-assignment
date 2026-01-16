import { AmountType } from "../../shared/types/bill.types";

export interface KeywordSpec {
  k: string;
  weight: number;          // importance score for rule engine
  variants?: string[];     // OCR-friendly spellings
}

export const KEYWORDS: Record<AmountType, KeywordSpec[]> = {
  [AmountType.TOTAL_BILL]: [
    { k: "grand total", weight: 1.0 },
    { k: "bill amount", weight: 0.98 },
    { k: "net amount", weight: 0.95 },
    { k: "bill total", weight: 0.92 },
    { k: "total", weight: 0.9, variants: ["t0tal", "totai", "tota1", "t0ta1", "t0tai"] },
    { k: "amount to pay", weight: 0.88 },
    { k: "bill value", weight: 0.85 },
    { k: "amount payable", weight: 0.85 },
    { k: "amount", weight: 0.75 }  // Lower weight, catches generic "amount"
  ],

  [AmountType.PAID]: [
    { k: "payment done", weight: 0.98 },
    { k: "amount paid", weight: 0.95 },
    { k: "paid", weight: 0.92, variants: ["pald", "palid", "pa1d", "pa1ld"] },
    { k: "received", weight: 0.9 },
    { k: "payment", weight: 0.88 },
    { k: "collected", weight: 0.88, variants: ["coIIected", "co11ected"] },
    { k: "advance", weight: 0.85 },
    { k: "cash received", weight: 0.84 }
  ],

  [AmountType.DUE]: [
    { k: "balance due", weight: 0.95 },
    { k: "amount due", weight: 0.93 },
    { k: "pending", weight: 0.92 },
    { k: "outstanding", weight: 0.92 },
    { k: "payable", weight: 0.9 },
    { k: "due", weight: 0.88 },
    { k: "remaining", weight: 0.86 },
    { k: "balance", weight: 0.85, variants: ["balanse", "ba1ance", "bahance"] }
  ],

  [AmountType.DISCOUNT]: [
    { k: "discount", weight: 0.9, variants: ["disc", "discnt"] },
    { k: "less", weight: 0.82 },
    { k: "rebate", weight: 0.8 },
    { k: "concession", weight: 0.78 }
  ],

  [AmountType.TAX]: [
    { k: "gst", weight: 0.92 },
    { k: "cgst", weight: 0.9 },
    { k: "sgst", weight: 0.9 },
    { k: "igst", weight: 0.9 },
    { k: "tax", weight: 0.88 },
    { k: "vat", weight: 0.85 }
  ],

  [AmountType.OTHER]: []
};