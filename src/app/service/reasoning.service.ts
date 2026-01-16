import { AmountType, LabeledAmount } from "../../shared/types/bill.types";

export class ReasoningService {

  infer(input: LabeledAmount[]) {
    let total = this.find(input, AmountType.TOTAL_BILL);
    let paid = this.find(input, AmountType.PAID);
    let due = this.find(input, AmountType.DUE);
    let discount = this.find(input, AmountType.DISCOUNT);
    let tax = this.find(input, AmountType.TAX);

    let confidence = 0.7;

    //Discount percentage handling
    // If discount exists but value is 0 or invalid, check if it's a percentage
    const discountItem = input.find(a => a.type === AmountType.DISCOUNT);
    if (discountItem && (discount === null || discount === 0)) {
      const percentMatch = discountItem.source.match(/(\d+(?:\.\d+)?)\s*%/);
      if (percentMatch && total !== null) {
        const percent = parseFloat(percentMatch[1]);
        discount = (percent / 100) * total;
        confidence += 0.05;
        console.log(`[Reasoning] Inferred discount from ${percent}%: ${discount}`);
      }
    }

    // Use cents/paise for math to avoid floating point errors
    const toCents = (v: number | null) => v !== null ? Math.round(v * 100) : null;

    let tp = toCents(total);
    let pp = toCents(paid);
    let dp = toCents(due);
    let discp = toCents(discount);

    // inference logic
    // Scenario 1: total and paid known, infer due
    if (tp !== null && pp !== null && dp === null) {
      // If discount exists: due = total - paid - discount
      if (discp !== null) {
        dp = tp - pp - discp;
      } else {
        dp = tp - pp;
      }
      due = dp / 100;
      confidence += 0.1;
      console.log(`[Reasoning] Inferred due: ${due}`);
    }
    
    // Scenario 2: total and due known, infer paid
    else if (tp !== null && dp !== null && pp === null) {
      if (discp !== null) {
        pp = tp - dp - discp;
      } else {
        pp = tp - dp;
      }
      paid = pp / 100;
      confidence += 0.1;
      console.log(`[Reasoning] Inferred paid: ${paid}`);
    }
    
    // Scenario 3: paid and due known, infer total
    else if (pp !== null && dp !== null && tp === null) {
      if (discp !== null) {
        tp = pp + dp + discp;
      } else {
        tp = pp + dp;
      }
      total = tp / 100;
      confidence += 0.1;
      console.log(`[Reasoning] Inferred total: ${total}`);
    }

    // build output
    const output: LabeledAmount[] = [];
    
    if (total !== null) {
      output.push({
        type: AmountType.TOTAL_BILL,
        value: total,
        source: this.src(input, AmountType.TOTAL_BILL),
        confidence
      });
    }
    
    if (paid !== null) {
      output.push({
        type: AmountType.PAID,
        value: paid,
        source: this.src(input, AmountType.PAID),
        confidence
      });
    }
    
    if (due !== null) {
      output.push({
        type: AmountType.DUE,
        value: due,
        source: this.src(input, AmountType.DUE),
        confidence
      });
    }
    
    if (discount !== null && discount > 0) {
      output.push({
        type: AmountType.DISCOUNT,
        value: discount,
        source: discountItem?.source || "inferred",
        confidence
      });
    }
    
    if (tax !== null && tax > 0) {
      output.push({
        type: AmountType.TAX,
        value: tax,
        source: this.src(input, AmountType.TAX),
        confidence
      });
    }

    return { amounts: output, reasoningConfidence: confidence };
  }

  private find(arr: LabeledAmount[], t: AmountType): number | null {
    const item = arr.find(a => a.type === t);
    return item ? item.value : null;
  }

  private src(arr: LabeledAmount[], t: AmountType): string {
    const item = arr.find(a => a.type === t);
    return item ? item.source : "inferred";
  }
}