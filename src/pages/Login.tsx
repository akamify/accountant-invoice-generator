import { LoginForm } from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
          <div className="text-lg font-semibold">Accountant Invoice</div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Single-admin invoice operations</h1>
            <p className="text-slate-300">
              Manage invoices, payments, transactions, and reporting from one secure dashboard.
            </p>
          </div>
          <p className="text-sm text-slate-400">Secure session expires after 24 hours.</p>
        </div>
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">Admin Login</h2>
              <p className="text-sm text-muted-foreground">Enter the admin password to continue</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
