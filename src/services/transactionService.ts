import { InvoiceData, Transaction } from "@/types/invoice";

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
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const getTransactions = async (): Promise<Transaction[]> => {
  const data = await request<{ transactions: Transaction[] }>("/api/transactions");
  return data.transactions;
};

export const createTransaction = async (payload: Partial<Transaction>): Promise<Transaction> => {
  const data = await request<{ transaction: Transaction }>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.transaction;
};

export const updateTransaction = async (id: string, payload: Partial<Transaction>): Promise<Transaction> => {
  const data = await request<{ transaction: Transaction }>(`/api/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.transaction;
};

export const deleteTransaction = async (id: string): Promise<boolean> => {
  await request(`/api/transactions/${id}`, { method: "DELETE" });
  return true;
};

export const getTransactionsFromInvoices = (invoices: InvoiceData[]): Transaction[] => {
  return invoices
    .filter(invoice => invoice.status === "paid")
    .map(invoice => ({
      id: invoice.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.userId || "admin",
      clientName: invoice.clientName,
      amount: invoice.amountPaid || invoice.total,
      type: "income",
      source: "invoice",
      title: `Invoice #${invoice.invoiceNumber}`,
      date: invoice.updatedAt || invoice.createdAt,
      transactionDate: invoice.updatedAt || invoice.createdAt,
      status: invoice.status,
    } as Transaction))
    .sort((a, b) => new Date(b.date || b.transactionDate).getTime() - new Date(a.date || a.transactionDate).getTime());
};

export const filterTransactionsByInvoiceNumber = (transactions: Transaction[], searchTerm: string) => {
  if (!searchTerm) return transactions;
  return transactions.filter(transaction =>
    (transaction.invoiceNumber || transaction.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
};

export const sortTransactionsByAmount = (transactions: Transaction[], direction: "asc" | "desc") => {
  return [...transactions].sort((a, b) => direction === "asc" ? a.amount - b.amount : b.amount - a.amount);
};

export const sortTransactionsByDate = (transactions: Transaction[], direction: "asc" | "desc") => {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.date || a.transactionDate).getTime();
    const dateB = new Date(b.date || b.transactionDate).getTime();
    return direction === "asc" ? dateA - dateB : dateB - dateA;
  });
};

export const calculateDailyAmounts = (invoices: InvoiceData[]) => {
  const dailyMap: Record<string, { received: number; due: number }> = {};

  invoices.forEach(invoice => {
    const invoiceDate = new Date(invoice.createdAt || invoice.issueDate).toISOString().split("T")[0];
    if (!dailyMap[invoiceDate]) dailyMap[invoiceDate] = { received: 0, due: 0 };
    dailyMap[invoiceDate].received += Number(invoice.amountPaid || 0);
    dailyMap[invoiceDate].due += Number(invoice.amountDue ?? invoice.total ?? 0);
  });

  return Object.entries(dailyMap)
    .map(([date, amounts]) => ({
      day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      date,
      received: amounts.received,
      due: amounts.due,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
