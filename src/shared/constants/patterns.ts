// Matches numbers with:
// - Currency prefixes (₹, Rs., INR)
// - Comma/space separators (1,200 or 1 200)
// - Decimal points (1200.50)
// - OCR noise (O→0, l/L/I→1, S→5, B→8)
// - Trailing markers (/-, %)
// - Handles both standalone and inline formats
//
// Examples matched:
// ₹1,200
// Rs. 1200/-
// INR 1200.50
// 1200 (plain number)
// T0tal: 12OO (with OCR noise)
// 10% (percentages)
//

export const EXTRACT_NUMBER_REGEX = 
  /(?:₹|rs\.?|inr)?\s*(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)(?:\/-|%)?/gi;