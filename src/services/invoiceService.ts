
import { ref, get, set, remove, update, query, orderByChild, equalTo, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { InvoiceData, InvoiceFormData } from "@/types/invoice";

// Get all invoices for a user
export const getUserInvoices = async (userId: string): Promise<InvoiceData[]> => {
  try {
    const invoicesRef = query(
      ref(database, 'invoices'),
      orderByChild('userId'),
      equalTo(userId)
    );
    
    const snapshot = await get(invoicesRef);
    if (!snapshot.exists()) return [];
    
    const invoices: InvoiceData[] = [];
    snapshot.forEach((childSnapshot) => {
      invoices.push({
        id: childSnapshot.key as string,
        ...childSnapshot.val()
      } as InvoiceData);
    });
    
    return invoices;
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    throw error;
  }
};

// Get a specific invoice
export const getInvoiceById = async (invoiceId: string): Promise<InvoiceData | null> => {
  try {
    const snapshot = await get(ref(database, `invoices/${invoiceId}`));
    if (!snapshot.exists()) return null;
    
    return {
      id: invoiceId,
      ...snapshot.val()
    } as InvoiceData;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
};

// Create a new invoice
export const createInvoice = async (userId: string, invoiceData: InvoiceFormData): Promise<InvoiceData> => {
  try {
    // Calculate financial values
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * invoiceData.taxRate) / 100;
    
    // Apply discount based on total amount
    let discountRate = invoiceData.discountRate;
    if (subtotal > 1000 && discountRate < 5) {
      discountRate = 5;
    }
    if (subtotal > 5000 && discountRate < 10) {
      discountRate = 10;
    }
    
    const discountAmount = (subtotal * discountRate) / 100;
    const total = subtotal + taxAmount - discountAmount;

    const newInvoice: Omit<InvoiceData, 'id'> = {
      userId,
      subtotal,
      taxAmount,
      discountRate,
      discountAmount,
      total,
      status: 'pending',
      ...invoiceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create a new invoice in the database
    const newInvoiceRef = push(ref(database, 'invoices'));
    await set(newInvoiceRef, newInvoice);
    
    return {
      id: newInvoiceRef.key as string,
      ...newInvoice
    };
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

// Update an invoice
export const updateInvoice = async (invoiceId: string, invoiceData: Partial<InvoiceData>): Promise<InvoiceData | null> => {
  try {
    const invoiceRef = ref(database, `invoices/${invoiceId}`);
    const snapshot = await get(invoiceRef);
    
    if (!snapshot.exists()) return null;
    
    // If items are being updated, recalculate financials
    if (invoiceData.items) {
      const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = (subtotal * (invoiceData.taxRate || snapshot.val().taxRate)) / 100;
      const discountRate = invoiceData.discountRate || snapshot.val().discountRate;
      const discountAmount = (subtotal * discountRate) / 100;
      const total = subtotal + taxAmount - discountAmount;
      
      invoiceData = {
        ...invoiceData,
        subtotal,
        taxAmount,
        discountRate,
        discountAmount,
        total,
        updatedAt: new Date().toISOString()
      };
    } else {
      invoiceData.updatedAt = new Date().toISOString();
    }
    
    await update(invoiceRef, invoiceData);
    
    // Return the updated invoice
    const updatedSnapshot = await get(invoiceRef);
    return {
      id: invoiceId,
      ...updatedSnapshot.val()
    };
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

// Delete an invoice
export const deleteInvoice = async (invoiceId: string): Promise<boolean> => {
  try {
    const invoiceRef = ref(database, `invoices/${invoiceId}`);
    await remove(invoiceRef);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};
