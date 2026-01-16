import { AmountType, LabeledAmount } from "../../shared/types/bill.types";

export class GuardrailService {

  validate(amounts: LabeledAmount[]) {
    if (!amounts || amounts.length === 0) {
      return { isValid: false, status: "no_amounts_found", reason: "document too noisy" };
    }

    const total = this.val(amounts, AmountType.TOTAL_BILL);
    const paid = this.val(amounts, AmountType.PAID);
    const due = this.val(amounts, AmountType.DUE);

    // Must have at least total_bill
    if (total === null) {
      return { isValid: false, status: "missing_total", reason: "total amount missing" };
    }

    // Check for negative values
    if (total !== null && total < 0) {
      return { isValid: false, status: "invalid_total", reason: "total cannot be negative" };
    }

    if (paid !== null && paid < 0) {
      return { isValid: false, status: "invalid_paid", reason: "paid cannot be negative" };
    }

    if (due !== null && due < 0) {
      return { isValid: false, status: "invalid_due", reason: "due cannot be negative" };
    }

    // Check if paid exceeds total
    if (paid !== null && total !== null && paid > total) {
      return { isValid: false, status: "invalid_paid", reason: "paid amount exceeds total" };
    }

    // Math consistency check (ONLY if all three exist)
    // This is a WARNING, not a hard failure - we still return valid: true
    if (paid !== null && due !== null && total !== null) {
      const diff = Math.abs((paid + due) - total);
      if (diff > 1) { // Allow 1 rupee tolerance for rounding
        console.warn("[Guardrail] ⚠️ Math inconsistency detected:", {
          total,
          paid,
          due,
          difference: diff
        });
      }
    }

    return { isValid: true };
  }

  private val(arr: LabeledAmount[], t: AmountType): number | null {
    const x = arr.find(a => a.type === t);
    return x ? x.value : null;
  }
}