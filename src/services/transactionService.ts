import { InvoiceData, Transaction } from "@/types/invoice";

// Convert invoices to transactions
export const getTransactionsFromInvoices = (invoices: InvoiceData[]): Transaction[] => {
    return invoices
        .filter(invoice => invoice.status === 'paid') // Only paid invoices are transactions
        .map(invoice => ({
            id: invoice.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientId: invoice.userId,
            clientName: invoice.clientName,
            amount: invoice.total,
            type: 'credit' as const,
            date: invoice.updatedAt || invoice.createdAt,
            status: invoice.status as 'paid' | 'pending' | 'overdue'
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
};

// Filter transactions by invoice number
export const filterTransactionsByInvoiceNumber = (transactions: Transaction[], searchTerm: string) => {
    if (!searchTerm) return transactions;
    return transactions.filter(transaction =>
        transaction.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
};

// Sort transactions by amount
export const sortTransactionsByAmount = (transactions: Transaction[], direction: 'asc' | 'desc') => {
    return [...transactions].sort((a, b) => {
        return direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    });
};

// Sort transactions by date
export const sortTransactionsByDate = (transactions: Transaction[], direction: 'asc' | 'desc') => {
    return [...transactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
};

// Calculate daily amounts from invoices
export const calculateDailyAmounts = (invoices: InvoiceData[]) => {
    // Create a map to store daily amounts
    const dailyMap: Record<string, { received: number; due: number }> = {};

    // Process each invoice
    invoices.forEach(invoice => {
        // Get the date (YYYY-MM-DD format)
        const invoiceDate = new Date(invoice.createdAt).toISOString().split('T')[0];

        // Initialize the date entry if it doesn't exist
        if (!dailyMap[invoiceDate]) {
            dailyMap[invoiceDate] = { received: 0, due: 0 };
        }

        // Add to received amount if paid
        if (invoice.status === 'paid') {
            dailyMap[invoiceDate].received += invoice.total;
        }
        // Add to due amount if pending or overdue
        else if (invoice.status === 'pending' || invoice.status === 'overdue') {
            dailyMap[invoiceDate].due += invoice.total;
        }
    });

    // Convert to array format for charts
    const dailyData = Object.entries(dailyMap).map(([date, amounts]) => ({
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: date,
        received: amounts.received,
        due: amounts.due
    }));

    // Sort by date ascending
    return dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};