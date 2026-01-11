import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { InvoiceData } from "@/types/invoice";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Trash2 } from "lucide-react";
import { deleteInvoice } from "@/services/invoiceService";
import { toast } from "sonner";

interface InvoiceCardProps {
  invoice: InvoiceData;
  onDelete?: (invoiceId: string) => void;
}

export default function InvoiceCard({ invoice, onDelete }: InvoiceCardProps) {
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event

    if (window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      try {
        await deleteInvoice(invoice.id);
        toast.success("Invoice deleted successfully");
        if (onDelete) {
          onDelete(invoice.id);
        }
      } catch (error) {
        toast.error("Failed to delete invoice");
        console.error('Error deleting invoice:', error);
      }
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
            <span className="font-semibold mr-2">₹{invoice.total.toFixed(2)}</span>
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

      <CardFooter className="border-t p-4 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/invoices/${invoice.id}`);
          }}
          className="flex items-center gap-2"
        >
          View Invoice
          <ArrowRight size={16} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}