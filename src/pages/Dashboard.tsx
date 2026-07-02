import { useEffect, useState } from "react";
import type { ElementType } from "react";
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
          <p className="text-muted-foreground">Track invoice revenue, dues, and cash flow.</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
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
          <CardHeader>
            <CardTitle>Monthly Cash Flow</CardTitle>
          </CardHeader>
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
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
