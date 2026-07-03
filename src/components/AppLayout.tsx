import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/NotificationCenter";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

type PageMeta = {
  title: string;
  subtitle: string;
};

const links: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Settings", icon: Settings },
];

function getPageMeta(pathname: string): PageMeta {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";

  if (cleanPath === "/dashboard") {
    return {
      title: "Dashboard",
      subtitle: "Overview of invoices, revenue, dues, and recent activity.",
    };
  }

  if (cleanPath === "/invoices/new") {
    return {
      title: "Create Invoice",
      subtitle: "Prepare a new client invoice and send it by email.",
    };
  }

  if (cleanPath === "/invoices/deleted") {
    return {
      title: "Recently Deleted",
      subtitle: "Review deleted invoices and permanently remove records.",
    };
  }

  if (cleanPath.startsWith("/invoices/")) {
    return {
      title: "Invoice Details",
      subtitle: "View invoice status, payments, email history, and download options.",
    };
  }

  if (cleanPath === "/invoices") {
    return {
      title: "Invoices",
      subtitle: "Create, track, email, and manage client invoices.",
    };
  }

  if (cleanPath.startsWith("/transactions/")) {
    return {
      title: "Transaction Details",
      subtitle: "Review and update income or expense transaction records.",
    };
  }

  if (cleanPath === "/transactions") {
    return {
      title: "Transactions",
      subtitle: "Track income, expenses, payment methods, and categories.",
    };
  }

  if (cleanPath === "/payments") {
    return {
      title: "Payments",
      subtitle: "Monitor received payments, pending dues, and invoice balances.",
    };
  }

  if (cleanPath === "/analytics") {
    return {
      title: "Analytics",
      subtitle: "Analyze revenue, expenses, profit, and invoice performance.",
    };
  }

  if (cleanPath === "/notifications") {
    return {
      title: "Notifications",
      subtitle: "Review invoice alerts, email activity, and account updates.",
    };
  }

  if (cleanPath === "/profile") {
    return {
      title: "Settings",
      subtitle: "Manage company profile, admin email, password, and login security.",
    };
  }

  return {
    title: "Accountant Invoice",
    subtitle: "Manage invoices, transactions, payments, and account settings.",
  };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageMeta = useMemo(
    () => getPageMeta(location.pathname),
    [location.pathname]
  );

  const companyName = user?.companyName || "Accountant Invoice";
  const userEmail = user?.email || "Admin";

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  const SidebarContent = ({
    isCollapsed,
    isMobile = false,
  }: {
    isCollapsed: boolean;
    isMobile?: boolean;
  }) => (
    <div className="flex h-full flex-col bg-white">
      <div
        className={`flex h-16 items-center border-b border-slate-200 px-3 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!isCollapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="Accountant Invoice"
              className="h-10 w-10 shrink-0 rounded-[4px] object-contain"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-slate-950">
                Accountant Invoice
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                Admin dashboard
              </div>
            </div>
          </div>
        ) : (
          <img
            src="/logo.png"
            alt="Accountant Invoice"
            className="h-10 w-10 rounded-[4px] object-contain"
          />
        )}

        {isMobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="h-9 w-9 rounded-[4px]"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : !isCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-9 w-9 rounded-[4px]"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={`${link.to}-${link.label}`}
              to={link.to}
              end={link.end}
              title={isCollapsed ? link.label : undefined}
              onClick={() => {
                if (isMobile) setMobileOpen(false);
              }}
              className={({ isActive }) =>
                [
                  "group flex h-10 items-center rounded-[4px] text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="flex h-10 w-full items-center gap-3 rounded-[4px] px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      )}

      {isCollapsed && !isMobile && (
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            title="Logout"
            aria-label="Logout"
            className="flex h-10 w-full items-center justify-center rounded-[4px] text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] duration-200 md:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-[280px] border-r border-slate-200 bg-white shadow-xl">
            <SidebarContent isCollapsed={false} isMobile />
          </aside>
        </div>
      )}

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          collapsed ? "md:pl-[72px]" : "md:pl-64"
        }`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="h-9 w-9 shrink-0 rounded-[4px] md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>

            {collapsed && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(false)}
                className="hidden h-9 w-9 shrink-0 rounded-[4px] md:inline-flex"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-950 sm:text-base">
                {pageMeta.title}
              </h1>
              <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">
                {pageMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <NotificationCenter />

            <div className="hidden items-center gap-2 sm:flex">
              {/* <img
                src="/logo.png"
                alt={companyName}
                className="h-9 w-9 bg-white object-contain"
              /> */}
              <div className="hidden min-w-0 lg:block">
                <p className="max-w-[180px] truncate text-sm font-medium text-slate-900">
                  {companyName}
                </p>
                <p className="max-w-[180px] truncate text-xs text-slate-500">
                  {userEmail}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLogoutOpen(true)}
              className="h-9 gap-2 rounded-[4px] border-slate-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>

      {logoutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-sm rounded-[4px] border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-red-50 text-red-700">
                <LogOut className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950">
                  Logout confirmation
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Are you sure you want to logout from this dashboard?
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLogoutOpen(false)}
                disabled={loggingOut}
                className="h-9 rounded-[4px]"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="h-9 rounded-[4px] bg-red-600 text-white hover:bg-red-700"
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
