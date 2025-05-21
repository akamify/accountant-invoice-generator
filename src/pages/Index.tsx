
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ThreeDBackground from "@/components/ThreeDBackground";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const FallbackComponent = () => (
    <div className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 opacity-60" />
  );

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary FallbackComponent={FallbackComponent}>
        <Suspense fallback={<FallbackComponent />}>
          <ThreeDBackground />
        </Suspense>
      </ErrorBoundary>

      <div className="flex-1 container max-w-6xl py-12 flex flex-col">
        <main className="flex-1 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Create professional invoices with ease
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-md mx-auto md:mx-0">
              Generate, share and track invoices in seconds. Perfect for freelancers and small businesses.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              {isAuthenticated ? (
                <>
                  <Button size="lg" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/invoices/new")}>
                    Create New Invoice
                  </Button>
                </>
              ) : (
                <Button size="lg" onClick={() => navigate("/login")}>
                  Get Started
                </Button>
              )}
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto md:mx-0">
              {["Automatic Tax", "PDF Export", "Fast Creation", "Customizable"].map((feature, i) => (
                <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                  <div className="rounded-full w-10 h-10 flex items-center justify-center bg-primary/10 text-primary">
                    {i + 1}
                  </div>
                  <span className="mt-2 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`w-full md:w-1/2 flex-shrink-0 mt-12 md:mt-0 ${!isAuthenticated ? 'animate-float' : ''}`}>
            <div className="relative">
              <div className="absolute -z-10 w-full h-full bg-gradient-to-r from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 rounded-2xl blur-3xl -inset-4" />
              <img 
                src="./download.png" 
                alt="Glow Invoice Illustration" 
                className="w-full h-auto max-w-lg mx-auto drop-shadow-2xl transition-all duration-300 hover:scale-105" 
              />
            </div>
            {!isAuthenticated && (
              <div className="text-center mt-8 p-6 bg-card rounded-xl shadow-sm">
                <p className="mb-4 text-muted-foreground">Join thousands of professionals who trust Glow Invoice for their billing needs</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={() => navigate('/signup')} size="lg" className="w-full sm:w-auto">
                    Start Free Trial
                  </Button>
                  <Button onClick={() => navigate('/login')} variant="outline" size="lg" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
