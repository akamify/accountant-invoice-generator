export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  clientPanNumber?: string;
  clientGstNumber: string;
  clientAddress: string;
  companyName: string;
  companyEmail: string;
  companyPanNumber?: string;
  companyGstNumber: string;
  companyAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  igst: number;
  sgst: number;
  cgst: number;
  igstAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  notes: string;
  status: 'draft' | 'pending' | 'confirmed' | 'paid' | 'overdue';
  paymentMode?: 'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque';
  transactionId?: string;
  bankAccount?: string;
  upiId?: string;
  updatedAt?: string;
}

export interface InvoiceFormData {
  clientName: string;
  clientEmail: string;
  clientPanNumber?: string;
  clientGstNumber: string;
  clientAddress: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPanNumber?: string;
  companyGstNumber: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  items: InvoiceItem[];
  igst: number;
  sgst: number;
  cgst: number;
  discountRate: number;
  notes: string;
  status?: 'draft' | 'pending' | 'confirmed' | 'paid' | 'overdue';
  paymentMode?: 'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque';
  transactionId?: string;
  bankAccount?: string;
  upiId?: string;
}

export interface Transaction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  status: 'paid' | 'pending' | 'overdue';
}

// Quotation types
export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface QuotationData {
  id: string;
  quotationNumber: string;
  createdAt: string;
  dueDate: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  clientPanNumber?: string;
  clientGstNumber: string;
  clientAddress: string;
  companyName: string;
  companyEmail: string;
  companyPanNumber?: string;
  companyGstNumber: string;
  companyAddress: string;
  items: QuotationItem[];
  subtotal: number;
  igst: number;
  sgst: number;
  cgst: number;
  igstAmount: number;
  sgstAmount: number;
  cgstAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  updatedAt?: string;
}

export interface QuotationFormData {
  clientName: string;
  clientEmail: string;
  clientPanNumber?: string;
  clientGstNumber: string;
  clientAddress: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPanNumber?: string;
  companyGstNumber: string;
  quotationNumber: string;
  createdAt: string;
  dueDate: string;
  items: QuotationItem[];
  igst: number;
  sgst: number;
  cgst: number;
  discountRate: number;
  notes: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
}