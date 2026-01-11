import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceData, QuotationData } from "@/types/invoice";
import { getUserInvoices } from "@/services/invoiceService";
import { getUserQuotations } from "@/services/quotationService";
import { getTransactionsFromInvoices, calculateDailyAmounts } from "@/services/transactionService";
import { Button } from "@/components/ui/button";
import InvoiceCard from "@/components/InvoiceCard";
import QuotationCard from "@/components/QuotationCard";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Plus, FileText, CreditCard, TrendingUp, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");

  // Colors for charts
  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  // Recent transactions (last 5 paid invoices)
  const recentTransactions = getTransactionsFromInvoices(invoices).slice(0, 5);

  // Recent quotations (last 6 quotations)
  const recentQuotations = [...quotations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // Recent payments (last 6 paid invoices)
  const recentPayments = invoices
    .filter(inv => inv.status === 'paid')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 6);

  // Calculate daily amounts from invoices
  const dailyData = calculateDailyAmounts(invoices);

  // Calculate summary data
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;

  const totalReceived = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalDue = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalOverdue = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0);

  // Invoice status distribution data
  const statusData = [
    { name: 'Paid', value: paidInvoices },
    { name: 'Pending', value: pendingInvoices },
    { name: 'Overdue', value: overdueInvoices }
  ];

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
          const userInvoices = await getUserInvoices(user.uid);
          setInvoices(userInvoices);
        } catch (error) {
          console.error('Error fetching invoices:', error);
        } finally {
          setIsLoadingInvoices(false);
        }
      }
    };

    fetchInvoices();
  }, [isAuthenticated, user]);

  useEffect(() => {
    const fetchQuotations = async () => {
      if (isAuthenticated && user?.uid) {
        setIsLoadingQuotations(true);
        try {
          const userQuotations = await getUserQuotations(user.uid);
          setQuotations(userQuotations);
        } catch (error) {
          console.error('Error fetching quotations:', error);
        } finally {
          setIsLoadingQuotations(false);
        }
      }
    };

    fetchQuotations();
  }, [isAuthenticated, user]);

  const handleDeleteInvoice = async (id: string) => {
    // Implementation would go here
    console.log('Deleting invoice:', id);
  };

  const handleDeleteQuotation = async (id: string) => {
    // Implementation would go here
    console.log('Deleting quotation:', id);
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
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage your invoices and track payments</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Received</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalReceived.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From {paidInvoices} paid invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Due</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalDue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From {pendingInvoices} pending invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalOverdue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From {overdueInvoices} overdue invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInvoices}</div>
              <p className="text-xs text-muted-foreground">All time invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} invoices`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Amounts</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailyData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  <Legend />
                  <Bar dataKey="received" fill="#10B981" name="Received" />
                  <Bar dataKey="due" fill="#F59E0B" name="Due" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Invoices, Quotations, Payments, Transactions */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="quotations">Quotations</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-6">
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center h-64">
                <p>Loading invoices...</p>
              </div>
            ) : invoices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    onDelete={handleDeleteInvoice}
                  />
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
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => navigate("/invoices")}>
                View All Invoices
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="quotations" className="mt-6">
            {isLoadingQuotations ? (
              <div className="flex items-center justify-center h-64">
                <p>Loading quotations...</p>
              </div>
            ) : recentQuotations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentQuotations.map((quotation) => (
                  <QuotationCard
                    key={quotation.id}
                    quotation={quotation}
                    onDelete={handleDeleteQuotation}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <h3 className="text-xl font-semibold">No Quotations Yet</h3>
                <p className="text-muted-foreground mt-2 mb-6">
                  You haven't created any quotations yet. Get started by creating your first quotation.
                </p>
                <Button
                  onClick={() => navigate("/quotations/new")}
                  className="flex items-center gap-2"
                >
                  <Plus size={18} />
                  Create Your First Quotation
                </Button>
              </div>
            )}
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => navigate("/quotations")}>
                View All Quotations
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-10">
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 rounded border">
                    <div>
                      <p className="font-medium">Invoice #{transaction.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">{transaction.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <h3 className="text-xl font-semibold">No Transactions Yet</h3>
                <p className="text-muted-foreground mt-2">
                  You haven't received any payments yet.
                </p>
              </div>
            )}
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => navigate("/transactions")}>
                View All Transactions
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;