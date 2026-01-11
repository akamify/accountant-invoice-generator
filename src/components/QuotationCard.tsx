import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { QuotationData } from "@/types/invoice";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Trash2 } from "lucide-react";
import { deleteQuotation } from "@/services/quotationService";
import { toast } from "sonner";

interface QuotationCardProps {
    quotation: QuotationData;
    onDelete?: (quotationId: string) => void;
}

export default function QuotationCard({ quotation, onDelete }: QuotationCardProps) {
    const navigate = useNavigate();

    // Format dates
    const createdDate = new Date(quotation.createdAt).toLocaleDateString();
    const dueDate = new Date(quotation.dueDate).toLocaleDateString();

    // Determine status color
    const getStatusColor = () => {
        switch (quotation.status) {
            case "accepted":
                return "bg-green-500/10 text-green-700 dark:text-green-500";
            case "rejected":
                return "bg-red-500/10 text-red-700 dark:text-red-500";
            case "sent":
                return "bg-blue-500/10 text-blue-700 dark:text-blue-500";
            case "converted":
                return "bg-purple-500/10 text-purple-700 dark:text-purple-500";
            default:
                return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event

        if (window.confirm("Are you sure you want to delete this quotation? This action cannot be undone.")) {
            try {
                await deleteQuotation(quotation.id);
                toast.success("Quotation deleted successfully");
                if (onDelete) {
                    onDelete(quotation.id);
                }
            } catch (error) {
                toast.error("Failed to delete quotation");
                console.error('Error deleting quotation:', error);
            }
        }
    };

    return (
        <Card
            className="hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate(`/quotations/${quotation.id}`)}
        >
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold">Quotation #{quotation.quotationNumber}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{quotation.clientName}</p>
                    </div>

                    <div className="text-right">
                        <span className="font-semibold mr-2">₹{quotation.total.toFixed(2)}</span>
                        <div className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${getStatusColor()}`}>
                            {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                    <div>
                        <p className="text-muted-foreground">Issue Date</p>
                        <p className="font-medium">{createdDate}</p>
                    </div>

                    <div className="text-right">
                        <p className="text-muted-foreground">Valid Until</p>
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
                        navigate(`/quotations/${quotation.id}`);
                    }}
                    className="flex items-center gap-2"
                >
                    View Quotation
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