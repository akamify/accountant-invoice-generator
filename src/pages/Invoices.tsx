import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceData } from "@/types/invoice";
import { getUserInvoices } from "@/services/invoiceService";
import { Button } from "@/components/ui/button";
import InvoiceCard from "@/components/InvoiceCard";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Invoices = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
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

  const handleDeleteInvoice = (invoiceId: string) => {
    // Remove the deleted invoice from the state
    setInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== invoiceId));
    setFilteredInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== invoiceId));
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

          <Button
            onClick={() => navigate("/invoices/new")}
            size="lg"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Create Invoice
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onDelete={handleDeleteInvoice}
              />
            ))}
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