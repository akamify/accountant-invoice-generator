import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InvoicePreview from "@/components/InvoicePreview";
import { InvoiceData } from "@/types/invoice";

export default function PublicInvoiceDownload() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/invoices/${token}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Invoice not found");
        setInvoice({
          ...data.invoice,
          currency: data.invoice?.currency || data.company?.currency || "INR",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50">Loading invoice...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-[4px] border bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Invoice unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "This invoice link is invalid."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <InvoicePreview invoice={invoice} />
    </div>
  );
}
