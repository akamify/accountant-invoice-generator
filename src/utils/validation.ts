const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,18}[0-9]$/;

function clean(value?: string | null) {
  return String(value || "").trim();
}

export function normalizePan(value?: string | null) {
  return clean(value).toUpperCase();
}

export function normalizeGst(value?: string | null) {
  return clean(value).toUpperCase();
}

export function isValidEmail(value?: string | null) {
  return EMAIL_PATTERN.test(clean(value));
}

export function isValidOptionalPhone(value?: string | null) {
  const next = clean(value);
  if (!next) return true;
  const digits = next.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && PHONE_PATTERN.test(next);
}

export function isValidOptionalPan(value?: string | null) {
  const next = normalizePan(value);
  return !next || PAN_PATTERN.test(next);
}

export function isValidOptionalGst(value?: string | null) {
  const next = normalizeGst(value);
  return !next || GST_PATTERN.test(next);
}

export function isValidAddress(value?: string | null) {
  return clean(value).length >= 5;
}

export function validateCompanyProfile(data: {
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyPanNumber?: string;
  companyGstNumber?: string;
}) {
  if (clean(data.companyName).length < 2) return "Company name must be at least 2 characters";
  if (!isValidEmail(data.companyEmail)) return "Enter a valid company email address";
  if (!isValidOptionalPhone(data.companyPhone)) return "Enter a valid company phone number";
  if (!isValidAddress(data.companyAddress)) return "Company address must be at least 5 characters";
  if (!isValidOptionalPan(data.companyPanNumber)) return "Invalid company PAN format. Example: AAAPA1234A";
  if (!isValidOptionalGst(data.companyGstNumber)) return "Invalid company GST format. Example: 27ABCDE1234F2Z5";
  return "";
}

export function validateInvoiceContact(data: {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  billingAddress?: string;
  clientPanNumber?: string;
  clientGstNumber?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyPanNumber?: string;
  companyGstNumber?: string;
}) {
  if (clean(data.clientName).length < 2) return "Client name must be at least 2 characters";
  if (!isValidEmail(data.clientEmail)) return "Enter a valid client email address";
  if (!isValidOptionalPhone(data.clientPhone)) return "Enter a valid client phone number";
  if (!isValidAddress(data.clientAddress || data.billingAddress)) return "Client address must be at least 5 characters";
  if (!isValidOptionalPan(data.clientPanNumber)) return "Invalid client PAN format. Example: AAAPA1234A";
  if (!isValidOptionalGst(data.clientGstNumber)) return "Invalid client GST format. Example: 27ABCDE1234F2Z5";

  const companyError = validateCompanyProfile(data);
  if (companyError) return companyError;
  return "";
}
