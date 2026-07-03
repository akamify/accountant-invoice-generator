import { InvoiceData, InvoiceFormData } from "@/types/invoice";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export const getUserInvoices = async (_userId?: string): Promise<InvoiceData[]> => {
  const data = await request<{ invoices: InvoiceData[] }>("/api/invoices");
  return data.invoices;
};

export const getDeletedInvoices = async (): Promise<InvoiceData[]> => {
  const data = await request<{ invoices: InvoiceData[] }>("/api/invoices/deleted");
  return data.invoices;
};

export const getInvoiceById = async (invoiceId: string): Promise<InvoiceData | null> => {
  const data = await request<{ invoice: InvoiceData }>(`/api/invoices/${invoiceId}`);
  return data.invoice;
};

export const createInvoice = async (_userId: string, invoiceData: InvoiceFormData): Promise<InvoiceData> => {
  const data = await request<{ invoice: InvoiceData }>("/api/invoices", {
    method: "POST",
    body: JSON.stringify(invoiceData),
  });
  return data.invoice;
};

export const updateInvoice = async (invoiceId: string, invoiceData: Partial<InvoiceData>): Promise<InvoiceData | null> => {
  const data = await request<{ invoice: InvoiceData }>(`/api/invoices/${invoiceId}`, {
    method: "PATCH",
    body: JSON.stringify(invoiceData),
  });
  return data.invoice;
};

export const deleteInvoice = async (invoiceId: string): Promise<boolean> => {
  await request(`/api/invoices/${invoiceId}`, { method: "DELETE" });
  return true;
};

export const permanentlyDeleteInvoice = async (invoiceId: string): Promise<boolean> => {
  await request(`/api/invoices/${invoiceId}/permanent`, { method: "DELETE" });
  return true;
};
