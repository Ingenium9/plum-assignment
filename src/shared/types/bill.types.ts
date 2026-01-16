export enum AmountType {
  TOTAL_BILL = "total_bill",
  PAID = "paid",
  DUE = "due",
  DISCOUNT = "discount",
  TAX = "tax",
  OTHER = "other"
}

export interface LabeledAmount {
  type: AmountType;
  value: number;
  source: string;
  confidence: number;
}
