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
  const code = (currency || "INR").toUpperCase();
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: code === "INR" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${getCurrencySymbol(code)}${Math.round(amount).toLocaleString("en-IN")}`;
  }
}
