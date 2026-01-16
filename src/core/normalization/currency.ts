export interface CurrencyDetection {
  code: string;
  symbol: string | null;
  confidence: number;
}

export const normalizeCurrency = (text: string): CurrencyDetection => {
  const lower = text.toLowerCase();

  // Supported detection table
  const currencyTable = [
    { code: "INR", symbols: ["₹", "rs", "inr", "rupee", "रु", "rs.", "rs/-"], weight: 0.95 },
    { code: "USD", symbols: ["$", "usd", "dollar", "us$"], weight: 0.9 },
    { code: "EUR", symbols: ["€", "eur", "euro"], weight: 0.9 },
    { code: "GBP", symbols: ["£", "gbp", "pound"], weight: 0.85 },
    { code: "AED", symbols: ["aed", "dirham", "د.إ"], weight: 0.85 },
    { code: "SAR", symbols: ["sar", "riyal", "ر.س"], weight: 0.85 },
  ];

  for (const entry of currencyTable) {
    for (const sym of entry.symbols) {
      // OCR-noise tolerant match
      if (lower.includes(sym.replace(/\./g, ""))) {
        return {
          code: entry.code,
          symbol: sym,
          confidence: entry.weight
        };
      }
    }
  }

  // Fallback (Indian medical bills default)
  return {
    code: "INR",
    symbol: null,
    confidence: 0.6
  };
};
