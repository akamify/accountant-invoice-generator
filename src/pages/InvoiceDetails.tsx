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
  const { isAuthenticated, isLoading, user, settings } = useAuth();
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

          if (invoiceData) {
            setInvoice(invoiceData);
          } else {
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

  const handleStatusUpdate = async (newStatus: 'paid') => {
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
        if (upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$|^\d{10}@upi$/.test(upiId)) {
          toast.error("Invalid UPI ID format. Expected format: username@bankhandle or mobilenumber@upi");
          return;
        }
      } else if (paymentMode === 'bank_transfer') {
        if (bankAccount && !/^\d{11}$/.test(bankAccount)) {
          toast.error("Invalid Bank Account format. Expected format: 12345678901");
          return;
        }
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
        if (transactionId && !/^\d{6}$/.test(transactionId)) {
          toast.error("Invalid Cheque Number format. Expected format: 6-digit unique identifier");
          return;
        }
      }
    }

    try {
      const updateData: Partial<InvoiceData> = { status: newStatus };

      // Include payment details if marking as paid
      if (newStatus === 'paid') {
        updateData.amountPaid = invoice.total;
        updateData.amountDue = 0;
        updateData.paymentMode = paymentMode;
        updateData.paymentMethod = paymentMode;
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

    if (window.confirm("Move this invoice to Recently Deleted?")) {
      try {
        await deleteInvoice(id);
        toast.success("Invoice moved to Recently Deleted");
        navigate("/invoices");
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
              className="rounded-[4px]"
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Invoice #{invoice.invoiceNumber}</h1>
              <p className="text-muted-foreground">Created on {new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`text-xs px-3 py-1 rounded-[4px] ${invoice.status === "paid"
              ? "bg-green-500/10 text-green-700 dark:text-green-500"
              : invoice.status === "overdue"
                ? "bg-red-500/10 text-red-700 dark:text-red-500"
                : "text-xs px-3 py-1 rounded-[4px] bg-yellow-500/10 text-yellow-700 dark:text-yellow-500"
              }`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </div>

            {invoice.status !== "paid" && (
              <Button
                onClick={() => handleStatusUpdate("paid")}
                variant="default"
                size="sm"
              >
                Mark Paid
              </Button>
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
          <div className="mb-8 p-6 bg-card rounded-[4px] border shadow-sm">
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
                  <label className="text-sm font-medium mb-1 block">Transaction ID</label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID"
                  />
                </div>
              )}

              {paymentMode === 'bank_transfer' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Bank Account</label>
                  <Input
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Enter bank account number"
                  />
                </div>
              )}

              {paymentMode === 'upi' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">UPI ID</label>
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

        <InvoicePreview invoice={{ ...invoice, currency: invoice.currency || settings?.currency || "INR" }} />
      </main>
    </div>
  );
};

export default InvoiceDetails;
