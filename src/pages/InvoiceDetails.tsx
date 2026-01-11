import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceData } from "@/types/invoice";
import { getInvoiceById, updateInvoice, deleteInvoice } from "@/services/invoiceService";
import InvoicePreview from "@/components/InvoicePreview";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

const InvoiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque'>('bank_transfer');
  const [transactionId, setTransactionId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (isAuthenticated && id) {
        setIsLoadingInvoice(true);
        try {
          const invoiceData = await getInvoiceById(id);

          if (invoiceData && user?.uid && invoiceData.userId === user.uid) {
            setInvoice(invoiceData);
          } else {
            // Either invoice doesn't exist or doesn't belong to current user
            console.error('Invoice not found or access denied');
            navigate("/dashboard");
          }
        } catch (error) {
          console.error('Error loading invoice:', error);
          navigate("/dashboard");
        } finally {
          setIsLoadingInvoice(false);
        }
      }
    };

    fetchInvoice();
  }, [id, isAuthenticated, navigate, user]);

  const handleStatusUpdate = async (newStatus: 'draft' | 'pending' | 'confirmed' | 'paid' | 'overdue') => {
    if (!invoice || !id) return;

    // If marking as paid, include payment details
    if (newStatus === 'paid') {
      if (!showPaymentForm) {
        // Show payment form first
        setShowPaymentForm(true);
        return;
      }

      // Validate PAN numbers if provided
      if (invoice.clientPanNumber && !/^([A-Z]){5}([0-9]){4}([A-Z]){1}$/.test(invoice.clientPanNumber)) {
        toast.error("Invalid Client PAN format. Expected format: AAAPA1234A");
        return;
      }

      if (invoice.companyPanNumber && !/^([A-Z]){5}([0-9]){4}([A-Z]){1}$/.test(invoice.companyPanNumber)) {
        toast.error("Invalid Company PAN format. Expected format: AAAPA1234A");
        return;
      }

      // Validate GST numbers if provided
      if (invoice.clientGstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(invoice.clientGstNumber)) {
        toast.error("Invalid Client GST format. Expected format: 27ABCDE1234F2Z5");
        return;
      }

      if (invoice.companyGstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(invoice.companyGstNumber)) {
        toast.error("Invalid Company GST format. Expected format: 27ABCDE1234F2Z5");
        return;
      }

      // Validate payment mode specific fields
      if (paymentMode === 'upi') {
        if (!upiId.trim()) {
          toast.error("UPI ID is required for UPI payment");
          return;
        }

        // Validate UPI ID format (username@bankhandle or mobilenumber@upi)
        if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$|^\d{10}@upi$/.test(upiId)) {
          toast.error("Invalid UPI ID format. Expected format: username@bankhandle or mobilenumber@upi");
          return;
        }

        // Validate UPI transaction ID format
        if (transactionId && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(transactionId)) {
          toast.error("Invalid UPI Transaction ID format. Expected format: 27ABCDE1234F2Z5");
          return;
        }
      } else if (paymentMode === 'bank_transfer') {
        if (!bankAccount.trim()) {
          toast.error("Bank account is required for bank transfer");
          return;
        }

        // Validate bank account number format
        if (!/^\d{11}$/.test(bankAccount)) {
          toast.error("Invalid Bank Account format. Expected format: 12345678901");
          return;
        }

        // Validate bank transaction ID format
        if (transactionId && !/^UTR[A-Z0-9]{13}$/.test(transactionId)) {
          toast.error("Invalid Bank Transaction ID format. Expected format: UTRRR12345678901");
          return;
        }
      } else if (paymentMode === 'card') {
        // Validate card transaction ID format
        if (transactionId && !/^T\d{21}$/.test(transactionId)) {
          toast.error("Invalid Card Transaction ID format. Expected format: T2503121123537872707045");
          return;
        }
      } else if (paymentMode === 'cheque') {
        // For cheque payments, validate cheque number instead of transaction ID
        if (!transactionId.trim()) {
          toast.error("Cheque number is required for cheque payments");
          return;
        }

        // Validate cheque number format (6-digit unique identifier)
        if (!/^\d{6}$/.test(transactionId)) {
          toast.error("Invalid Cheque Number format. Expected format: 6-digit unique identifier");
          return;
        }
      } else if (paymentMode === 'cash') {
        // For cash payments, no transaction ID is required
        // But if provided, show error
        if (transactionId.trim()) {
          toast.error("Transaction ID is not required for cash payments");
          return;
        }
      } else if (paymentMode !== 'cash' && !transactionId.trim()) {
        toast.error("Transaction ID is required for non-cash payments");
        return;
      }
    }

    try {
      const updateData: Partial<InvoiceData> = { status: newStatus };

      // Include payment details if marking as paid
      if (newStatus === 'paid') {
        updateData.paymentMode = paymentMode;
        updateData.transactionId = transactionId;

        if (paymentMode === 'bank_transfer') {
          updateData.bankAccount = bankAccount;
        } else if (paymentMode === 'upi') {
          updateData.upiId = upiId;
        }
      }

      const updatedInvoice = await updateInvoice(id, updateData);
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success(`Invoice status updated to ${newStatus}`);

        // Reset payment form state
        if (newStatus === 'paid') {
          setShowPaymentForm(false);
          setTransactionId('');
          setBankAccount('');
          setUpiId('');
        }
      }
    } catch (error) {
      toast.error("Failed to update invoice status");
      console.error('Error updating invoice status:', error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    if (window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      try {
        await deleteInvoice(id);
        toast.success("Invoice deleted successfully");
        navigate("/dashboard");
      } catch (error) {
        toast.error("Failed to delete invoice");
        console.error('Error deleting invoice:', error);
      }
    }
  };

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isLoadingInvoice) {
    return <div className="min-h-screen flex items-center justify-center">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="min-h-screen flex items-center justify-center">Invoice not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ThreeDBackground />
      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/invoices")}
              className="rounded-full"
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Invoice #{invoice.invoiceNumber}</h1>
              <p className="text-muted-foreground">Created on {new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`text-xs px-3 py-1 rounded-full ${invoice.status === "paid"
              ? "bg-green-500/10 text-green-700 dark:text-green-500"
              : invoice.status === "overdue"
                ? "bg-red-500/10 text-red-700 dark:text-red-500"
                : "text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-500"
              }`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </div>

            {invoice.status === "pending" && (
              <>
                <Button
                  onClick={() => handleStatusUpdate("paid")}
                  variant="default"
                  size="sm"
                >
                  Paid
                </Button>
              </>
            )}


            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <div className="mb-8 p-6 bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Payment Mode</label>
                <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as 'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMode !== 'cash' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Transaction ID *</label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID"
                  />
                </div>
              )}

              {paymentMode === 'bank_transfer' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Bank Account *</label>
                  <Input
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Enter bank account number"
                  />
                </div>
              )}

              {paymentMode === 'upi' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">UPI ID *</label>
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="Enter UPI ID"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleStatusUpdate("paid")}>
                Confirm Payment
              </Button>
            </div>
          </div>
        )}

        <InvoicePreview invoice={invoice} />
      </main>
    </div>
  );
};

export default InvoiceDetails;