import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { QuotationData } from "@/types/invoice";
import { getUserQuotations } from "@/services/quotationService";
import { Button } from "@/components/ui/button";
import QuotationCard from "@/components/QuotationCard";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Plus, AlertTriangle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Quotations = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const fetchQuotations = async () => {
      if (isAuthenticated && user?.uid) {
        setIsLoadingQuotations(true);
        setError(null);
        try {
          // Fetch user's quotations
          const userQuotations = await getUserQuotations(user.uid);
          setQuotations(userQuotations);
        } catch (error: unknown) {
          console.error('Error loading quotations:', error);
          setError(error instanceof Error ? error.message : 'Failed to load quotations. Please try again later.');
        } finally {
          setIsLoadingQuotations(false);
        }
      }
    };

    fetchQuotations();
  }, [isAuthenticated, user]);

  const handleDeleteQuotation = (quotationId: string) => {
    // Remove the deleted quotation from the state
    setQuotations(prevQuotations => prevQuotations.filter(quotation => quotation.id !== quotationId));
  };

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <ThreeDBackground />
      <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-2 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="rounded-full"
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Quotations</h1>
              <p className="text-muted-foreground">View all your quotations</p>
            </div>
          </div>

          <Button
            onClick={() => navigate("/quotations/new")}
            size="lg"
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            Create Quotation
          </Button>
        </div>

        {error ? (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-500">
                <AlertTriangle size={20} />
                <h3 className="text-lg font-semibold">Permission Required</h3>
              </div>
              <p className="mt-2 text-muted-foreground">
                {error.includes('Permission denied')
                  ? "You don't have permission to access quotations yet. This feature is being configured."
                  : error}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                You can still create quotations, but viewing them may be temporarily unavailable.
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate("/quotations/new")}>
                  Create New Quotation
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isLoadingQuotations ? (
          <div className="flex items-center justify-center h-64">
            <p>Loading quotations...</p>
          </div>
        ) : quotations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotations.map((quotation) => (
              <QuotationCard
                key={quotation.id}
                quotation={quotation}
                onDelete={handleDeleteQuotation}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <h3 className="text-xl font-semibold">No Quotations Yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              You haven't created any quotations yet. Get started by creating your first quotation.
            </p>
            <Button
              onClick={() => navigate("/quotations/new")}
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              Create Your First Quotation
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Quotations;