
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { InvoiceData } from "@/types/invoice";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface InvoiceCardProps {
  invoice: InvoiceData;
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
  const navigate = useNavigate();
  
  // Format dates
  const createdDate = new Date(invoice.createdAt).toLocaleDateString();
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();
  
  // Determine status color
  const getStatusColor = () => {
    switch (invoice.status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-500";
      case "overdue":
        return "bg-red-500/10 text-red-700 dark:text-red-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };
  
  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer" 
      onClick={() => navigate(`/invoices/${invoice.id}`)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">Invoice #{invoice.invoiceNumber}</h3>
            <p className="text-sm text-muted-foreground mt-1">{invoice.clientName}</p>
          </div>
          
          <div className="text-right">
            <span className="font-semibold">₹{invoice.total.toFixed(2)}</span>
            <div className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${getStatusColor()}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-muted-foreground">Issue Date</p>
            <p className="font-medium">{createdDate}</p>
          </div>
          
          <div className="text-right">
            <p className="text-muted-foreground">Due Date</p>
            <p className="font-medium">{dueDate}</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-4 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/invoices/${invoice.id}`)}
          className="flex items-center gap-2"
        >
          View Invoice
          <ArrowRight size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
