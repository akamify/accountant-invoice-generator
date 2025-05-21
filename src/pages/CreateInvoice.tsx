import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import InvoiceForm from "@/components/InvoiceForm";
import ThreeDBackground from "@/components/ThreeDBackground";

const CreateInvoice = () => {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Invoice</h1>
          <p className="text-muted-foreground">Fill out the form below to create a new invoice</p>
        </div>
        <InvoiceForm />
      </div>
    </div>
  );
};

export default CreateInvoice;
