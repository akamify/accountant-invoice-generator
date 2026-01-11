import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserInvoices } from "@/services/invoiceService";
import { InvoiceData } from "@/types/invoice";
import { Button } from "@/components/ui/button";
import ThreeDBackground from "@/components/ThreeDBackground";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Payments = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (isAuthenticated && user?.uid) {
        setIsLoadingInvoices(true);
        setError(null);
        try {
          // Fetch user's invoices
          const userInvoices = await getUserInvoices(user.uid);
          setInvoices(userInvoices);
        } catch (error: unknown) {
          console.error('Error loading invoices:', error);
          setError(error instanceof Error ? error.message : 'Failed to load payments. Please try again later.');
        } finally {
          setIsLoadingInvoices(false);
        }
      }
    };

    fetchInvoices();
  }, [isAuthenticated, user]);

  // Filter paid invoices
  const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <ThreeDBackground />
      <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-full"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Track all payments received</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Error Loading Payments</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {error}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            ) : isLoadingInvoices ? (
              <div className="flex items-center justify-center h-64">
                <p>Loading payments...</p>
              </div>
            ) : paidInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date Paid</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">#{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{new Date(invoice.updatedAt || invoice.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>₹{invoice.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Paid
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <h3 className="text-xl font-semibold">No Payments Yet</h3>
                <p className="text-muted-foreground mt-2">
                  You haven't received any payments yet.
                </p>
                <Button
                  onClick={() => navigate("/invoices/new")}
                  className="mt-4 flex items-center gap-2"
                >
                  Create Invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Payments;