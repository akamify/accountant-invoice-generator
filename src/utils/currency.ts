const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
};

export function getCurrencySymbol(currency?: string | null) {
  const code = (currency || "INR").toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrencyAmount(value: number, currency?: string | null) {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}
