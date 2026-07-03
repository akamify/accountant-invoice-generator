import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceData } from "@/types/invoice";
import { deleteInvoice, getUserInvoices } from "@/services/invoiceService";
import { Button } from "@/components/ui/button";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Eye, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyAmount } from "@/utils/currency";
import { toast } from "sonner";

const Invoices = () => {
  const navigate = useNavigate();
  const { user, settings, isAuthenticated, isLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceData[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("date-desc");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (isAuthenticated && user?.uid) {
        setIsLoadingInvoices(true);
        try {
          // Fetch user's invoices
          const userInvoices = await getUserInvoices(user.uid);
          setInvoices(userInvoices);
        } catch (error) {
          console.error('Error loading invoices:', error);
        } finally {
          setIsLoadingInvoices(false);
        }
      }
    };

    fetchInvoices();
  }, [isAuthenticated, user]);

  useEffect(() => {
    let result = [...invoices];

    // Apply search filter (by invoice number or client name)
    if (searchTerm) {
      result = result.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(invoice => invoice.status === statusFilter);
    }

    // Apply sorting
    switch (sortOption) {
      case "amount-asc":
        result.sort((a, b) => a.total - b.total);
        break;
      case "amount-desc":
        result.sort((a, b) => b.total - a.total);
        break;
      case "date-asc":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "date-desc":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }

    setFilteredInvoices(result);
  }, [invoices, searchTerm, statusFilter, sortOption]);

  const formatDate = (value?: string) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  const getStatusClass = (status: InvoiceData["status"]) => {
    if (status === "paid") return "bg-green-50 text-green-700 border-green-200";
    if (status === "overdue") return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm("Move this invoice to Recently Deleted?")) return;

    try {
      await deleteInvoice(invoiceId);
      setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== invoiceId));
      setFilteredInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== invoiceId));
      toast.success("Invoice moved to Recently Deleted");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <ThreeDBackground />
      <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Manage your invoices and track payments</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/invoices/deleted")}
              size="lg"
              className="flex items-center gap-2"
            >
              <Trash2 size={18} />
              Recently Deleted
            </Button>
            <Button
              onClick={() => navigate("/invoices/new")}
              size="lg"
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by invoice number or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-40">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                <SelectItem value="amount-asc">Amount: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoadingInvoices ? (
          <div className="flex items-center justify-center h-64">
            <p>Loading invoices...</p>
          </div>
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-hidden rounded-[4px] border bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Issue Date</th>
                    <th className="px-4 py-3 font-semibold">Due Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map((invoice) => {
                    const displayCurrency = invoice.currency || settings?.currency || "INR";

                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-950">
                          #{invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{invoice.clientName || "N/A"}</div>
                          {invoice.clientEmail && (
                            <div className="text-xs text-muted-foreground">{invoice.clientEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(invoice.createdAt || invoice.issueDate)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-950">
                          {formatCurrencyAmount(invoice.total, displayCurrency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-[4px] border px-2 py-1 text-xs font-semibold capitalize ${getStatusClass(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                              className="h-8 gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <h3 className="text-xl font-semibold">No Invoices Found</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              {searchTerm || statusFilter !== "all"
                ? "No invoices match your search criteria. Try adjusting your filters."
                : "You haven't created any invoices yet. Get started by creating your first invoice."}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button
                onClick={() => navigate("/invoices/new")}
                className="flex items-center gap-2"
              >
                <Plus size={18} />
                Create Your First Invoice
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Invoices;
