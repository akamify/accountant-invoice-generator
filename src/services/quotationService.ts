import { ref, get, set, remove, update, query, orderByChild, equalTo, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { QuotationData, QuotationFormData } from "@/types/invoice";

// Get all quotations for a user
export const getUserQuotations = async (userId: string): Promise<QuotationData[]> => {
    try {
        const quotationsRef = query(
            ref(database, 'quotations'),
            orderByChild('userId'),
            equalTo(userId)
        );

        const snapshot = await get(quotationsRef);
        if (!snapshot.exists()) return [];

        const quotations: QuotationData[] = [];
        snapshot.forEach((childSnapshot) => {
            quotations.push({
                id: childSnapshot.key as string,
                ...childSnapshot.val()
            } as QuotationData);
        });

        return quotations;
    } catch (error: unknown) {
        console.error('Error fetching user quotations:', error);
        // If it's a permission error, rethrow with a more user-friendly message
        if (error instanceof Error && error.message.includes('Permission denied')) {
            throw new Error('You do not have permission to access quotations. This feature is being configured.');
        }
        throw error;
    }
};

// Get a specific quotation
export const getQuotationById = async (quotationId: string): Promise<QuotationData | null> => {
    try {
        const snapshot = await get(ref(database, `quotations/${quotationId}`));
        if (!snapshot.exists()) return null;

        return {
            id: quotationId,
            ...snapshot.val()
        } as QuotationData;
    } catch (error) {
        console.error('Error fetching quotation:', error);
        throw error;
    }
};

// Create a new quotation
export const createQuotation = async (userId: string, quotationData: QuotationFormData): Promise<QuotationData> => {
    try {
        // Calculate financial values
        const subtotal = quotationData.items.reduce((sum, item) => sum + item.amount, 0);

        // Calculate IGST, SGST, and CGST amounts
        const igstAmount = (subtotal * quotationData.igst) / 100;
        const cgstAmount = (subtotal * quotationData.cgst) / 100;
        const sgstAmount = (subtotal * quotationData.sgst) / 100;

        // Total tax amount
        const taxAmount = igstAmount + cgstAmount + sgstAmount;

        // Apply discount based on total amount
        let discountRate = quotationData.discountRate;
        if (subtotal > 1000 && discountRate < 5) {
            discountRate = 5;
        }
        if (subtotal > 5000 && discountRate < 10) {
            discountRate = 10;
        }

        const discountAmount = (subtotal * discountRate) / 100;
        const total = subtotal + taxAmount - discountAmount;

        const newQuotation: Omit<QuotationData, 'id'> = {
            userId,
            subtotal,
            igstAmount,
            cgstAmount,
            sgstAmount,
            discountRate,
            discountAmount,
            total,
            status: quotationData.status || 'draft', // Use provided status or default to draft
            ...quotationData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Create a new quotation in the database
        const newQuotationRef = push(ref(database, 'quotations'));

        await set(newQuotationRef, newQuotation);

        return {
            id: newQuotationRef.key as string,
            ...newQuotation
        };
    } catch (error) {
        console.error('Error creating quotation:', error);
        throw error;
    }
};

// Update a quotation
export const updateQuotation = async (quotationId: string, quotationData: Partial<QuotationData>): Promise<QuotationData | null> => {
    try {
        const quotationRef = ref(database, `quotations/${quotationId}`);
        const snapshot = await get(quotationRef);

        if (!snapshot.exists()) return null;

        // If items are being updated, recalculate financials
        if (quotationData.items) {
            const subtotal = quotationData.items.reduce((sum, item) => sum + item.amount, 0);

            // Calculate separate tax amounts
            const igst = quotationData.igst !== undefined ? quotationData.igst : snapshot.val().igst || 0;
            const cgst = quotationData.cgst !== undefined ? quotationData.cgst : snapshot.val().cgst || 0;
            const sgst = quotationData.sgst !== undefined ? quotationData.sgst : snapshot.val().sgst || 0;

            const igstAmount = (subtotal * igst) / 100;
            const cgstAmount = (subtotal * cgst) / 100;
            const sgstAmount = (subtotal * sgst) / 100;
            const totalTaxAmount = igstAmount + cgstAmount + sgstAmount;

            const discountRate = quotationData.discountRate !== undefined ? quotationData.discountRate : snapshot.val().discountRate || 0;
            const discountAmount = (subtotal * discountRate) / 100;
            const total = subtotal + totalTaxAmount - discountAmount;

            quotationData = {
                ...quotationData,
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
            const subtotal = quotationData.subtotal !== undefined ? quotationData.subtotal : currentData.subtotal;

            // Check if any tax rates are being updated
            const igst = quotationData.igst !== undefined ? quotationData.igst : currentData.igst || 0;
            const cgst = quotationData.cgst !== undefined ? quotationData.cgst : currentData.cgst || 0;
            const sgst = quotationData.sgst !== undefined ? quotationData.sgst : currentData.sgst || 0;

            // Only recalculate if tax rates changed
            if (
                quotationData.igst !== undefined ||
                quotationData.cgst !== undefined ||
                quotationData.sgst !== undefined ||
                quotationData.discountRate !== undefined
            ) {
                const igstAmount = (subtotal * igst) / 100;
                const cgstAmount = (subtotal * cgst) / 100;
                const sgstAmount = (subtotal * sgst) / 100;
                const totalTaxAmount = igstAmount + cgstAmount + sgstAmount;

                const discountRate = quotationData.discountRate !== undefined ? quotationData.discountRate : currentData.discountRate || 0;
                const discountAmount = (subtotal * discountRate) / 100;
                const total = subtotal + totalTaxAmount - discountAmount;

                quotationData = {
                    ...quotationData,
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

            quotationData.updatedAt = new Date().toISOString();
        }

        await update(quotationRef, quotationData);

        // Return the updated quotation
        const updatedSnapshot = await get(quotationRef);
        return {
            id: quotationId,
            ...updatedSnapshot.val()
        };
    } catch (error) {
        console.error('Error updating quotation:', error);
        throw error;
    }
};

// Delete a quotation
export const deleteQuotation = async (quotationId: string): Promise<boolean> => {
    try {
        const quotationRef = ref(database, `quotations/${quotationId}`);
        await remove(quotationRef);
        return true;
    } catch (error) {
        console.error('Error deleting quotation:', error);
        throw error;
    }
};

// Convert quotation to invoice
export const convertQuotationToInvoice = async (quotationId: string): Promise<boolean> => {
    try {
        const quotationRef = ref(database, `quotations/${quotationId}`);
        const snapshot = await get(quotationRef);

        if (!snapshot.exists()) return false;

        const quotationData = snapshot.val();

        // Update quotation status to 'converted'
        await update(quotationRef, {
            status: 'converted',
            updatedAt: new Date().toISOString()
        });

        // Create a new invoice with the same data
        const invoiceData = {
            ...quotationData,
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            status: 'pending'
        };

        const newInvoiceRef = push(ref(database, 'invoices'));
        await set(newInvoiceRef, invoiceData);

        return true;
    } catch (error) {
        console.error('Error converting quotation to invoice:', error);
        throw error;
    }
};