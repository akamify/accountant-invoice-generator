import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3, CreditCard, FileText, LayoutDashboard, LogOut, Menu, Receipt, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r bg-white transition-all md:block ${collapsed ? "w-20" : "w-64"}`}>
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && <span className="font-semibold">Accountant Invoice</span>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((value) => !value)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={`${link.to}-${link.label}`}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive && link.label !== "Analytics"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className={collapsed ? "md:pl-20" : "md:pl-64"}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
          <div>
            <p className="text-sm font-medium">{user?.companyName || "Accountant Invoice"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
