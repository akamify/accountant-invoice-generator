export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type InvoiceStatus = "pending" | "paid" | "overdue";

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  updatedAt?: string;
  issueDate?: string;
  dueDate: string;
  userId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  billingAddress?: string;
  clientPanNumber?: string;
  clientGstNumber: string;
  clientAddress: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyPanNumber?: string;
  companyGstNumber: string;
  companyAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  igst: number;
  sgst: number;
  cgst: number;
  igstAmount?: number;
  sgstAmount?: number;
  cgstAmount?: number;
  discountRate: number;
  discount?: number;
  discountAmount: number;
  total: number;
  amountPaid?: number;
  amountDue?: number;
  notes: string;
  terms?: string;
  status: InvoiceStatus;
  currency?: string;
  publicDownloadEnabled?: boolean;
  emailSentAt?: string | null;
  deletedAt?: string | null;
  paymentMode?: "bank_transfer" | "upi" | "cash" | "card" | "cheque";
  paymentMethod?: string;
  transactionId?: string;
  bankAccount?: string;
  upiId?: string;
}

export interface InvoiceFormData {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  billingAddress?: string;
  clientPanNumber?: string;
  clientGstNumber: string;
  clientAddress: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone?: string;
  companyPanNumber?: string;
  companyGstNumber: string;
  invoiceNumber?: string;
  createdAt: string;
  issueDate?: string;
  dueDate: string;
  items: InvoiceItem[];
  igst: number;
  sgst: number;
  cgst: number;
  discountRate: number;
  amountPaid?: number;
  notes: string;
  terms?: string;
  status?: InvoiceStatus;
  currency?: string;
  paymentMode?: "bank_transfer" | "upi" | "cash" | "card" | "cheque";
  paymentMethod?: string;
  transactionId?: string;
  bankAccount?: string;
  upiId?: string;
}

export interface Transaction {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  clientId?: string;
  clientName?: string;
  amount: number;
  type: "income" | "expense" | "credit" | "debit";
  source?: "invoice" | "manual";
  title?: string;
  description?: string;
  paymentMethod?: string;
  transactionDate?: string;
  category?: string;
  date?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}
