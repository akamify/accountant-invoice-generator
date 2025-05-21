
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceData } from "@/types/invoice";
import { getUserInvoices } from "@/services/invoiceService";
import { Button } from "@/components/ui/button";
import InvoiceCard from "@/components/InvoiceCard";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Plus } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      setIsLoadingInvoices(true);
      try {
        // Fetch user's invoices
        const userInvoices = getUserInvoices(user.uid);
        setInvoices(userInvoices);
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setIsLoadingInvoices(false);
      }
    }
  }, [isAuthenticated, user]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <ThreeDBackground />
      <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your invoices and track payments</p>
          </div>
          
          <Button 
            onClick={() => navigate("/invoices/new")} 
            size="lg"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Create Invoice
          </Button>
        </div>
        
        {isLoadingInvoices ? (
          <div className="flex items-center justify-center h-64">
            <p>Loading invoices...</p>
          </div>
        ) : invoices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <h3 className="text-xl font-semibold">No Invoices Yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              You haven't created any invoices yet. Get started by creating your first invoice.
            </p>
            <Button 
              onClick={() => navigate("/invoices/new")}
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              Create Your First Invoice
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
