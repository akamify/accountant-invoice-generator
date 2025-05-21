
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
  clientAddress: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  notes: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  updatedAt?: string;
}

export interface InvoiceFormData {
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  invoiceNumber: string;
  createdAt: string;
  dueDate: string;
  items: InvoiceItem[];
  taxRate: number;
  discountRate: number;
  notes: string;
}
