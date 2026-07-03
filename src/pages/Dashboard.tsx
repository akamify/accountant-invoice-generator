import { useEffect, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CreditCard, FileText, Plus, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  amountDue: number;
  monthlyRevenue: { month: string; amount: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  invoiceStatusBreakdown: { status: string; count: number }[];
  recentTransactions: Array<{ id: string; title?: string; amount: number; type: string; transactionDate?: string; createdAt?: string }>;
  recentInvoices: Array<{ id: string; invoiceNumber: string; clientName: string; total: number; status: string }>;
  pendingAlerts: Array<{ id: string; invoiceNumber: string; clientName: string; amountDue: number; status: string; href: string }>;
  overdueAlerts: Array<{ id: string; invoiceNumber: string; clientName: string; amountDue: number; dueDate: string; href: string }>;
};

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#64748B"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/summary", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load analytics");
        setSummary(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const monthlyData = summary?.monthlyRevenue.map((item) => ({
    month: item.month,
    revenue: item.amount,
    expenses: summary.monthlyExpenses.find((expense) => expense.month === item.month)?.amount || 0,
  })) || [];

  if (loading) return <div className="flex h-64 items-center justify-center">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Track invoice revenue, dues, alerts, and cash flow.</p>
        </div>
        <Button onClick={() => navigate("/invoices/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Revenue" value={`₹${(summary?.totalRevenue || 0).toFixed(2)}`} icon={CreditCard} />
        <MetricCard title="Amount Due" value={`₹${(summary?.amountDue || 0).toFixed(2)}`} icon={FileText} />
        <MetricCard title="Net Profit" value={`₹${(summary?.netProfit || 0).toFixed(2)}`} icon={TrendingUp} />
        <MetricCard title="Total Invoices" value={String(summary?.totalInvoices || 0)} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AlertCard title="Pending Alerts" empty="No pending alerts.">
          {summary?.pendingAlerts?.map((alert) => (
            <button key={alert.id} onClick={() => navigate(alert.href)} className="flex w-full items-center justify-between rounded-[4px] border p-3 text-left hover:bg-slate-50">
              <div>
                <p className="font-medium">Invoice #{alert.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{alert.clientName} • {alert.status}</p>
              </div>
              <p className="font-semibold text-amber-700">₹{alert.amountDue.toFixed(2)}</p>
            </button>
          ))}
        </AlertCard>

        <AlertCard title="Overdue Alerts" empty="No overdue alerts.">
          {summary?.overdueAlerts?.map((alert) => (
            <button key={alert.id} onClick={() => navigate(alert.href)} className="flex w-full items-center justify-between rounded-[4px] border border-red-200 bg-red-50 p-3 text-left hover:bg-red-100">
              <div>
                <p className="font-medium">Invoice #{alert.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{alert.clientName} • Due {new Date(alert.dueDate).toLocaleDateString()}</p>
              </div>
              <p className="font-semibold text-red-700">₹{alert.amountDue.toFixed(2)}</p>
            </button>
          ))}
        </AlertCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Invoice Status</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary?.invoiceStatusBreakdown || []} dataKey="count" nameKey="status" outerRadius={90} label>
                  {(summary?.invoiceStatusBreakdown || []).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, "Amount"]} />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary?.recentTransactions?.length ? summary.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between rounded-[4px] border p-3">
                <div>
                  <p className="font-medium">{transaction.title || "Transaction"}</p>
                  <p className="text-sm text-muted-foreground">{new Date(transaction.transactionDate || transaction.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
                <p className={transaction.type === "expense" ? "font-semibold text-red-700" : "font-semibold text-green-700"}>
                  {transaction.type === "expense" ? "-" : "+"}₹{Number(transaction.amount || 0).toFixed(2)}
                </p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No recent transactions.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Invoices</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary?.recentInvoices?.length ? summary.recentInvoices.map((invoice) => (
              <button key={invoice.id} onClick={() => navigate(`/invoices/${invoice.id}`)} className="flex w-full items-center justify-between rounded-[4px] border p-3 text-left hover:bg-slate-50">
                <div>
                  <p className="font-medium">Invoice #{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{invoice.clientName} • {invoice.status}</p>
                </div>
                <p className="font-semibold">₹{Number(invoice.total || 0).toFixed(2)}</p>
              </button>
            )) : <p className="text-sm text-muted-foreground">No recent invoices.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

function AlertCard({ title, empty, children }: { title: string; empty: string; children?: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.length ? items : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}
