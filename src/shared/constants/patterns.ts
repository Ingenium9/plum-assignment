//
// patterns.ts - Number extraction regex
//
// Matches numbers with:
// - Currency prefixes (₹, Rs., INR) with optional space after
// - Comma/space separators (1,200 or 1 200)
// - Decimal points (1200.50)
// - Trailing markers (/-, %)
//
// Examples matched:
// Rs 1200
// Rs. 1200/-
// INR 1200.50
// 1200 (plain number)
// ₹1,200
// 10%
//

export const EXTRACT_NUMBER_REGEX = 
  /(?:₹|rs\.?\s*|inr\s*)?\s*(\d+(?:[,\s]\d+)*(?:\.\d{1,2})?)\s*(?:\/-|%)?/gi;