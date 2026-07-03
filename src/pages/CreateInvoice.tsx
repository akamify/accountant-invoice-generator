import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeIndianRupee,
  FileText,
  Mail,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import InvoiceForm from "@/components/InvoiceForm";
import { Button } from "@/components/ui/button";

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 h-24 animate-pulse rounded-[4px] border border-slate-200 bg-white" />
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="h-[620px] animate-pulse rounded-[4px] border border-slate-200 bg-white" />
            <div className="h-80 animate-pulse rounded-[4px] border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
        <div className="mb-5 rounded-[4px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigate("/invoices")}
                className="mt-0.5 h-9 w-9 shrink-0 rounded-[4px] border-slate-200"
                aria-label="Back to invoices"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-blue-600 text-white">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div>
                    <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 md:text-2xl">
                      Create Invoice
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Add client details, invoice items, tax, discount, and payment terms.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-1">
          <section className="min-w-full rounded-[4px] border border-slate-200 bg-white p-4 shadow-sm">
            <InvoiceForm />
          </section>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;