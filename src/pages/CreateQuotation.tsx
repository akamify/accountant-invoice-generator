import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import QuotationForm from "@/components/QuotationForm";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CreateQuotation = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/login");
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading || !isAuthenticated) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <ThreeDBackground />
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-2 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/quotations")}
                        className="rounded-full"
                    >
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Create Quotation</h1>
                        <p className="text-muted-foreground">Fill out the form below to create a new quotation</p>
                    </div>
                </div>
                <QuotationForm />
            </div>
        </div>
    );
};

export default CreateQuotation;