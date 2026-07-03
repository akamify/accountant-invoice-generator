import { LoginForm } from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_460px]">
        <section className="relative hidden overflow-hidden bg-[#101828] px-10 py-8 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 opacity-[0.06]">
            <div className="h-full w-full bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:48px_48px]" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="text-base font-semibold tracking-tight">
                Accountant Invoice
              </div>
            </div>

            <div className="rounded-[4px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
              Secure Login
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-xl">
            <div className="mb-5 inline-flex rounded-[4px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
              Invoice · Transactions · Analytics
            </div>

            <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-[-0.03em]">
              Manage accounts from one focused dashboard.
            </h1>

            <div className="mt-8 grid max-w-md gap-3">
              <div className="rounded-[4px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-medium text-white">Invoices</div>
                <div className="mt-1 text-sm text-slate-400">
                  Create, track, email, and download invoices.
                </div>
              </div>

              <div className="rounded-[4px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-medium text-white">
                  Transactions
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Record income, expenses, and payment activity.
                </div>
              </div>

              <div className="rounded-[4px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-medium text-white">Analytics</div>
                <div className="mt-1 text-sm text-slate-400">
                  View financial insights and reports.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[380px]">
            <div className="mb-8 lg:hidden">
              <div className="text-lg font-semibold tracking-tight">
                Accountant Invoice
              </div>
            </div>

            <div className="rounded-[4px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}