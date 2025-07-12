
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
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DeveloperInfo from "./pages/DeveloperInfo";
import { ForgotPassword } from "./components/auth/ForgotPassword";
import { ResetPassword } from "./components/auth/ResetPassword";
import { VerifyEmail } from "./components/auth/VerifyEmail";

// Components
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const queryClient = new QueryClient();

// Redirect to dashboard if user is already authenticated
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const location = useLocation();
  interface LocationState {
    from?: {
      pathname?: string;
    };
  }
  const state = location.state as LocationState | null;
  const from = state?.from?.pathname || '/';

  // Don't redirect if we're still loading or already on the target page
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only redirect if user is authenticated and not already on the dashboard
  if (isAuthenticated && currentUser?.emailVerified && location.pathname !== '/dashboard') {
    return <Navigate to="/dashboard" state={{ from: from }} replace />;
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

// Main app content that needs router context
const AppContent = () => {
  // List of routes where we don't want to show Navigation and Footer
  const hideNavAndFooter = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
  const location = useLocation();
  const shouldHideNavAndFooter = hideNavAndFooter.some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen flex flex-col">
      {!shouldHideNavAndFooter && <Navigation />}
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
                  
                  {/* Legal pages */}
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/developer" element={<DeveloperInfo />} />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!shouldHideNavAndFooter && <Footer />}
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}>
              <ScrollToTop />
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
