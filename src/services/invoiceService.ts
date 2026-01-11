
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
    console.log('Creating invoice for user:', userId);
    console.log('Invoice data:', invoiceData);

    // Calculate financial values
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    console.log('Calculated subtotal:', subtotal);

    // Calculate IGST, SGST, and CGST amounts
    const igstAmount = (subtotal * invoiceData.igst) / 100;
    const cgstAmount = (subtotal * invoiceData.cgst) / 100;
    const sgstAmount = (subtotal * invoiceData.sgst) / 100;

    // Total tax amount
    const taxAmount = igstAmount + cgstAmount + sgstAmount;
    console.log('Calculated tax amounts:', { igstAmount, cgstAmount, sgstAmount, taxAmount });

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
    console.log('Calculated discount and total:', { discountRate, discountAmount, total });

    const newInvoice: Omit<InvoiceData, 'id'> = {
      userId,
      subtotal,
      igstAmount,
      cgstAmount,
      sgstAmount,
      discountRate,
      discountAmount,
      total,
      status: invoiceData.status || 'draft', // Use provided status or default to draft
      ...invoiceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Prepared invoice object:', newInvoice);

    // Create a new invoice in the database
    const newInvoiceRef = push(ref(database, 'invoices'));
    console.log('New invoice reference:', newInvoiceRef.key);

    await set(newInvoiceRef, newInvoice);
    console.log('Invoice saved successfully');

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

      // Calculate separate tax amounts
      const igst = invoiceData.igst !== undefined ? invoiceData.igst : snapshot.val().igst || 0;
      const cgst = invoiceData.cgst !== undefined ? invoiceData.cgst : snapshot.val().cgst || 0;
      const sgst = invoiceData.sgst !== undefined ? invoiceData.sgst : snapshot.val().sgst || 0;

      const igstAmount = (subtotal * igst) / 100;
      const cgstAmount = (subtotal * cgst) / 100;
      const sgstAmount = (subtotal * sgst) / 100;
      const totalTaxAmount = igstAmount + cgstAmount + sgstAmount;

      const discountRate = invoiceData.discountRate !== undefined ? invoiceData.discountRate : snapshot.val().discountRate || 0;
      const discountAmount = (subtotal * discountRate) / 100;
      const total = subtotal + totalTaxAmount - discountAmount;

      invoiceData = {
        ...invoiceData,
        subtotal,
        igst,
        cgst,
        sgst,
        igstAmount,
        cgstAmount,
        sgstAmount,
        discountRate,
        discountAmount,
        total,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Handle partial updates for tax rates
      const currentData = snapshot.val();
      const subtotal = invoiceData.subtotal !== undefined ? invoiceData.subtotal : currentData.subtotal;

      // Check if any tax rates are being updated
      const igst = invoiceData.igst !== undefined ? invoiceData.igst : currentData.igst || 0;
      const cgst = invoiceData.cgst !== undefined ? invoiceData.cgst : currentData.cgst || 0;
      const sgst = invoiceData.sgst !== undefined ? invoiceData.sgst : currentData.sgst || 0;

      // Only recalculate if tax rates changed
      if (
        invoiceData.igst !== undefined ||
        invoiceData.cgst !== undefined ||
        invoiceData.sgst !== undefined ||
        invoiceData.discountRate !== undefined
      ) {
        const igstAmount = (subtotal * igst) / 100;
        const cgstAmount = (subtotal * cgst) / 100;
        const sgstAmount = (subtotal * sgst) / 100;
        const totalTaxAmount = igstAmount + cgstAmount + sgstAmount;

        const discountRate = invoiceData.discountRate !== undefined ? invoiceData.discountRate : currentData.discountRate || 0;
        const discountAmount = (subtotal * discountRate) / 100;
        const total = subtotal + totalTaxAmount - discountAmount;

        invoiceData = {
          ...invoiceData,
          igst,
          cgst,
          sgst,
          igstAmount,
          cgstAmount,
          sgstAmount,
          discountRate,
          discountAmount,
          total,
        };
      }

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
