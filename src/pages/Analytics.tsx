import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrencySymbol } from "@/utils/currency";

type AnalyticsSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  amountDue: number;
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  monthlyRevenue: { month: string; amount: number }[];
  monthlyExpenses: { month: string; amount: number }[];
  invoiceStatusBreakdown: { status: string; count: number }[];
};

type TooltipPayload = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
};

const STATUS_COLORS = ["#2563eb", "#14b8a6", "#f97316", "#ef4444", "#8b5cf6", "#64748b"];

function formatCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function CustomTooltip({
  active,
  label,
  payload,
  currency,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
  currency?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[4px] border border-slate-200 bg-white px-3 py-2 shadow-lg">
      {label && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>}
      <div className="space-y-1">
        {payload.map((item) => {
          const isMoney = item.dataKey !== "count" && item.name !== "Invoices";
          const value = typeof item.value === "number" && isMoney ? formatCurrency(item.value, currency) : item.value;

          return (
            <div key={`${item.name}-${item.dataKey}`} className="flex items-center justify-between gap-6 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2 w-2 rounded-[4px]" style={{ backgroundColor: item.color || "#2563eb" }} />
                {item.name || item.dataKey}
              </span>
              <span className="font-semibold text-slate-950">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { settings } = useAuth();
  const currency = settings?.currency || "INR";
  const axisCurrency = getCurrencySymbol(currency);
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

  const monthlyData = useMemo(() => {
    const months = new Set<string>();
    summary?.monthlyRevenue.forEach((item) => months.add(item.month));
    summary?.monthlyExpenses.forEach((item) => months.add(item.month));

    return Array.from(months).map((month) => {
      const revenue = summary?.monthlyRevenue.find((item) => item.month === month)?.amount || 0;
      const expenses = summary?.monthlyExpenses.find((item) => item.month === month)?.amount || 0;

      return {
        month,
        revenue,
        expenses,
        profit: revenue - expenses,
      };
    });
  }, [summary]);

  const statusData = useMemo(
    () =>
      (summary?.invoiceStatusBreakdown || []).map((item, index) => ({
        ...item,
        statusLabel: formatStatus(item.status),
        fill: STATUS_COLORS[index % STATUS_COLORS.length],
      })),
    [summary]
  );

  const paidRate = summary?.totalInvoices ? Math.round((summary.paidInvoices / summary.totalInvoices) * 100) : 0;
  const overdueRate = summary?.totalInvoices ? Math.round((summary.overdueInvoices / summary.totalInvoices) * 100) : 0;
  const profitRate = summary?.totalRevenue ? Math.max(0, Math.round((summary.netProfit / summary.totalRevenue) * 100)) : 0;

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Revenue, expenses, invoice health, due amount, and monthly performance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Revenue" value={formatCurrency(summary?.totalRevenue || 0, currency)} icon={ArrowUpRight} tone="emerald" />
        <Metric title="Expenses" value={formatCurrency(summary?.totalExpenses || 0, currency)} icon={ArrowDownRight} tone="rose" />
        <Metric title="Net Profit" value={formatCurrency(summary?.netProfit || 0, currency)} icon={Wallet} tone="blue" />
        <Metric title="Amount Due" value={formatCurrency(summary?.amountDue || 0, currency)} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <ChartCard title="Monthly Cashflow Line Graph" className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${axisCurrency}${Number(value) / 1000}k`} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Invoice Status Circle Chart" className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="statusLabel"
                innerRadius={72}
                outerRadius={118}
                paddingAngle={3}
                label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Revenue vs Expenses Bars" className="h-80 xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${axisCurrency}${Number(value) / 1000}k`} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Performance Rings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <RadialMetric label="Paid invoices" value={paidRate} color="#14b8a6" />
            <RadialMetric label="Profit rate" value={profitRate} color="#2563eb" />
            <RadialMetric label="Overdue risk" value={overdueRate} color="#ef4444" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Invoice Counts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <CountRow label="Total Invoices" value={summary?.totalInvoices || 0} />
            <CountRow label="Paid Invoices" value={summary?.paidInvoices || 0} />
            <CountRow label="Unpaid Invoices" value={summary?.unpaidInvoices || 0} />
            <CountRow label="Overdue Invoices" value={summary?.overdueInvoices || 0} danger />
          </CardContent>
        </Card>

        <ChartCard title="Profit Area Trend" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${axisCurrency}${Number(value) / 1000}k`} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#2563eb" strokeWidth={3} fill="url(#profitFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: typeof Activity;
  tone: "blue" | "emerald" | "rose" | "amber";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <Card className="border-slate-200 transition-colors hover:border-blue-200 hover:bg-blue-50/30">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-[4px] ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, className, children }: { title: string; className: string; children: ReactNode }) {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className={className}>{children}</CardContent>
    </Card>
  );
}

function RadialMetric({ label, value, color }: { label: string; value: number; color: string }) {
  const data = [{ name: label, value, fill: color }];

  return (
    <div className="flex items-center justify-between rounded-[4px] border border-slate-200 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">Current rate</p>
      </div>
      <div className="relative h-20 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" background={{ fill: "#e5e7eb" }} cornerRadius={8} />
            <Tooltip content={<CustomTooltip currency={currency} />} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-950">
          {value}%
        </div>
      </div>
    </div>
  );
}

function CountRow({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-[4px] border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <FileText className={danger ? "h-4 w-4 text-red-600" : "h-4 w-4 text-blue-700"} />
        {label}
      </span>
      <span className={danger ? "text-lg font-bold text-red-700" : "text-lg font-bold text-slate-950"}>{value}</span>
    </div>
  );
}
