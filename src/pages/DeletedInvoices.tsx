import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceData } from "@/types/invoice";
import { getDeletedInvoices, permanentlyDeleteInvoice } from "@/services/invoiceService";
import { formatCurrencyAmount } from "@/utils/currency";
import { toast } from "sonner";

export default function DeletedInvoices() {
  const navigate = useNavigate();
  const { settings } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeletedInvoices = async () => {
    setLoading(true);
    try {
      setInvoices(await getDeletedInvoices());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedInvoices().catch(() => undefined);
  }, []);

  const handlePermanentDelete = async (invoice: InvoiceData) => {
    const ok = window.confirm(
      `Permanently delete invoice #${invoice.invoiceNumber}? This cannot be undone.`
    );
    if (!ok) return;

    await permanentlyDeleteInvoice(invoice.id);
    setInvoices((current) => current.filter((item) => item.id !== invoice.id));
    toast.success("Invoice permanently deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Recently Deleted</h1>
          <p className="text-muted-foreground">Soft-deleted invoices stay here until permanently deleted.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/invoices")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deleted Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading deleted invoices...</div>
          ) : invoices.length ? (
            invoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-col justify-between gap-3 rounded-[4px] border p-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold">Invoice #{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.clientName} • Deleted {invoice.deletedAt ? new Date(invoice.deletedAt).toLocaleString() : "recently"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">
                    {formatCurrencyAmount(invoice.total || 0, invoice.currency || settings?.currency)}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handlePermanentDelete(invoice)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Forever
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-muted-foreground">No deleted invoices.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
