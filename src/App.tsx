
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateInvoice from "./pages/CreateInvoice";
import InvoiceDetails from "./pages/InvoiceDetails";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { ResetPassword } from "./components/auth/ResetPassword";
import { VerifyEmail } from "./components/auth/VerifyEmail";
import OtpVerification from "./components/auth/OtpVerification";

// Components
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useEffect } from 'react';
import Navigation from '@/components/Navigation';

const queryClient = new QueryClient();

// Redirect to dashboard if user is already authenticated
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <main className="flex-1">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  
                  {/* Auth routes - redirect to dashboard if already logged in */}
                    {/* Auth routes - redirect to dashboard if already logged in */}
                  <Route path="/login" element={
                    <RedirectIfAuthenticated>
                      <Login />
                    </RedirectIfAuthenticated>
                  } />
                  
                  <Route path="/signup" element={
                    <RedirectIfAuthenticated>
                      <Signup />
                    </RedirectIfAuthenticated>
                  } />
                  
                  {/* Auth pages - no need to be protected */}
                  <Route path="/forgot-password" element={
                    <RedirectIfAuthenticated>
                      <ForgotPassword />
                    </RedirectIfAuthenticated>
                  } />
                  
                  <Route path="/reset-password" element={
                    <RedirectIfAuthenticated>
                      <ResetPassword />
                    </RedirectIfAuthenticated>
                  } />
                  
                  <Route path="/verify-email" element={
                    <RedirectIfAuthenticated>
                      <VerifyEmail />
                    </RedirectIfAuthenticated>
                  } />
                  
                  <Route path="/verify-otp" element={
                    <RedirectIfAuthenticated>
                      <OtpVerification />
                    </RedirectIfAuthenticated>
                  } />
                  
                  {/* Protected routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/invoices/new" element={
                    <ProtectedRoute>
                      <CreateInvoice />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/invoices/:id" element={
                    <ProtectedRoute>
                      <InvoiceDetails />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
