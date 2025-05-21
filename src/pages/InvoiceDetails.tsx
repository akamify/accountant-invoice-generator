
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceData } from "@/types/invoice";
import { getInvoiceById } from "@/services/invoiceService";
import InvoicePreview from "@/components/InvoicePreview";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const InvoiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(true);

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
              onClick={() => navigate("/dashboard")}
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
            <div className={`text-xs px-3 py-1 rounded-full ${
              invoice.status === "paid"
                ? "bg-green-500/10 text-green-700 dark:text-green-500"
                : invoice.status === "overdue"
                ? "bg-red-500/10 text-red-700 dark:text-red-500"
                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500"
            }`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </div>
          </div>
        </div>
        
        <InvoicePreview invoice={invoice} />
      </main>
    </div>
  );
};

export default InvoiceDetails;
