import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { QuotationData } from "@/types/invoice";
import { getQuotationById, updateQuotation, convertQuotationToInvoice } from "@/services/quotationService";
import ThreeDBackground from "@/components/ThreeDBackground";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

const QuotationDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, user } = useAuth();
    const [quotation, setQuotation] = useState<QuotationData | null>(null);
    const [isLoadingQuotation, setIsLoadingQuotation] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/login");
        }
    }, [isAuthenticated, isLoading, navigate]);

    useEffect(() => {
        const fetchQuotation = async () => {
            if (isAuthenticated && id) {
                setIsLoadingQuotation(true);
                try {
                    const quotationData = await getQuotationById(id);

                    if (quotationData && user?.uid && quotationData.userId === user.uid) {
                        setQuotation(quotationData);
                    } else {
                        // Either quotation doesn't exist or doesn't belong to current user
                        console.error('Quotation not found or access denied');
                        navigate("/quotations");
                    }
                } catch (error) {
                    console.error('Error loading quotation:', error);
                    navigate("/quotations");
                } finally {
                    setIsLoadingQuotation(false);
                }
            }
        };

        fetchQuotation();
    }, [id, isAuthenticated, navigate, user]);

    const handleStatusUpdate = async (newStatus: 'sent' | 'accepted' | 'rejected') => {
        if (!quotation || !id) return;

        try {
            const updatedQuotation = await updateQuotation(id, { status: newStatus });
            if (updatedQuotation) {
                setQuotation(updatedQuotation);
                toast.success(`Quotation status updated to ${newStatus}`);
            }
        } catch (error) {
            toast.error("Failed to update quotation status");
            console.error('Error updating quotation status:', error);
        }
    };

    const handleConvertToInvoice = async () => {
        if (!quotation || !id) return;

        try {
            const success = await convertQuotationToInvoice(id);
            if (success) {
                toast.success("Quotation converted to invoice successfully!");
                // Refresh the quotation to show updated status
                const updatedQuotation = await getQuotationById(id);
                if (updatedQuotation) {
                    setQuotation(updatedQuotation);
                }
            }
        } catch (error) {
            toast.error("Failed to convert quotation to invoice");
            console.error('Error converting quotation to invoice:', error);
        }
    };

    const handleDownloadPDF = async () => {
        if (!quotation) return;

        try {
            setIsDownloading(true);

            const doc = new jsPDF("p", "pt", "a4");
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            const primaryColor: [number, number, number] = [59, 130, 246];

            // Header
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, pageWidth, 120, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(22);
            doc.text("QUOTATION", margin, 45);
            doc.setFontSize(10);
            doc.setTextColor("#fff");
            doc.text(`Quotation`, margin, 70);
            doc.text(`Date`, margin, 90);
            doc.text(`Valid Until`, margin, 110);
            doc.setFont("helvetica", "bold");
            doc.setTextColor("#fff");
            doc.text(`#${quotation.quotationNumber}`, margin + 90, 70);
            doc.text(format(new Date(quotation.createdAt), "MMM dd, yyyy"), margin + 90, 90);
            doc.text(format(new Date(quotation.dueDate), "MMM dd, yyyy"), margin + 90, 110);


            // // Title & meta
            // doc.setTextColor(0, 0, 0);
            // doc.setFontSize(22);
            // doc.text("QUOTATION", margin, 110);

            // doc.setFontSize(10);
            // doc.setTextColor(100, 100, 100);
            // doc.text(`Quotation #`, margin, 130);
            // doc.text(`Date`, margin, 145);
            // doc.text(`Valid Until`, margin, 160);

            // doc.setFont("helvetica", "bold");
            // doc.setTextColor(0, 0, 0);
            // doc.text(quotation.quotationNumber, margin + 90, 130);
            // doc.text(format(new Date(quotation.createdAt), "MMM dd, yyyy"), margin + 90, 145);
            // doc.text(format(new Date(quotation.dueDate), "MMM dd, yyyy"), margin + 90, 160);

            // Company (left)
            const rightX = 40;
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text("From", margin, 150);
            doc.setFont("helvetica", "normal");
            doc.text(quotation.companyName, rightX, 170);
            doc.setFont("helvetica", "normal");
            let companyY = 185;
            if (quotation.companyAddress) {
                doc.text(quotation.companyAddress, rightX, companyY, { maxWidth: pageWidth - rightX - margin });
                companyY += 15;
            }
            if (quotation.companyGstNumber) {
                doc.text(`GST: ${quotation.companyGstNumber}`, rightX, companyY);
                companyY += 15;
            }
            if (quotation.companyEmail) {
                doc.text(quotation.companyEmail, rightX, companyY);
            }

            // Client section - positioned on the right side
            const clientXPosition = pageWidth / 2 + 20; // Position on the right half of the page
            let clientY = 150; // Align with the company section
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text("Bill To", clientXPosition, 150);
            clientY += 20;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(quotation.clientName, clientXPosition, clientY);
            clientY += 15;
            if (quotation.clientAddress) {
                doc.text(quotation.clientAddress, clientXPosition, clientY, { maxWidth: pageWidth - clientXPosition - margin });
                clientY += 15;
            }
            if (quotation.clientGstNumber) {
                doc.text(`GST: ${quotation.clientGstNumber}`, clientXPosition, clientY);
                clientY += 15;
            }
            if (quotation.clientEmail) {
                doc.text(quotation.clientEmail, clientXPosition, clientY);
            }

            // Items table
            const tableStartY = clientY + 40;
            const tableColumns = ["DESCRIPTION", "QTY", "PRICE", "AMOUNT"];
            const tableBody = quotation.items.map((item) => [
                item.description,
                item.quantity.toString(),
                `Rs. ${item.unitPrice.toFixed(2)}`,
                `Rs. ${item.amount.toFixed(2)}`,
            ]);

            autoTable(doc, {
                startY: tableStartY,
                head: [tableColumns],
                body: tableBody,
                margin: { left: margin, right: margin },
                headStyles: {
                    fillColor: primaryColor,
                    textColor: 255,
                    fontStyle: "bold",
                    fontSize: 10,
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 6,
                    cellWidth: 'wrap',
                    lineWidth: 0.1,
                    lineColor: [229, 231, 235] // gray-200
                },
                columnStyles: {
                    1: { halign: "right", cellWidth: 40 },
                    2: { halign: "right", cellWidth: 80 },
                    3: { halign: "right", cellWidth: 80 },
                },
            } as autoTable.UserOptions);

            const afterTableY =
                (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ||
                tableStartY + 40;

            // Totals
            let totalsY = afterTableY + 30;
            const labelX = pageWidth - margin - 150;
            const valueX = pageWidth - margin;

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");

            doc.text("Subtotal:", labelX, totalsY, { align: "right" });
            doc.text(`Rs. ${quotation.subtotal.toFixed(2)}`, valueX, totalsY, { align: "right" });
            totalsY += 18;

            if (quotation.igst > 0) {
                doc.text(`IGST (${quotation.igst}%):`, labelX, totalsY, { align: "right" });
                doc.text(`Rs. ${quotation.igstAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
                totalsY += 18;
            }
            if (quotation.cgst > 0) {
                doc.text(`CGST (${quotation.cgst}%):`, labelX, totalsY, { align: "right" });
                doc.text(`Rs. ${quotation.cgstAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
                totalsY += 18;
            }
            if (quotation.sgst > 0) {
                doc.text(`SGST (${quotation.sgst}%):`, labelX, totalsY, { align: "right" });
                doc.text(`Rs. ${quotation.sgstAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
                totalsY += 18;
            }

            if (quotation.discountRate > 0) {
                doc.text(`Discount (${quotation.discountRate}%):`, labelX, totalsY, { align: "right" });
                doc.text(`Rs. ${quotation.discountAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
                totalsY += 18;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("TOTAL:", labelX, totalsY, { align: "right" });
            doc.text(`Rs. ${quotation.total.toFixed(2)}`, valueX, totalsY, { align: "right" });

            // Notes
            if (quotation.notes) {
                const notesY = totalsY + 40;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.text("Notes", margin, notesY);
                doc.setFont("helvetica", "normal");
                doc.text(quotation.notes, margin, notesY + 16, {
                    maxWidth: pageWidth - margin * 2,
                });
            }

            doc.save(`quotation-${quotation.quotationNumber}.pdf`);
            toast.success("Quotation downloaded successfully!");
        } catch (error) {
            console.error("Error generating quotation PDF:", error);
            toast.error("Failed to download quotation");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!quotation) return;

        if (!navigator.share) {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
            return;
        }

        try {
            setIsSharing(true);
            await navigator.share({
                title: `Quotation #${quotation.quotationNumber}`,
                text: `Quotation #${quotation.quotationNumber} from ${quotation.companyName}`,
                url: window.location.href,
            });
        } catch (error) {
            const err = error as { name?: string };
            if (err?.name !== "AbortError") {
                console.error("Error sharing quotation:", error);
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied to clipboard!");
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading || !isAuthenticated) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (isLoadingQuotation) {
        return <div className="min-h-screen flex items-center justify-center">Loading quotation...</div>;
    }

    if (!quotation) {
        return <div className="min-h-screen flex items-center justify-center">Quotation not found</div>;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <ThreeDBackground />
            <main className="flex-1 container py-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/quotations")}
                            className="rounded-full"
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Quotation #{quotation.quotationNumber}</h1>
                            <p className="text-muted-foreground">Created on {new Date(quotation.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className={`text-xs px-3 py-1 rounded-full ${quotation.status === "accepted"
                            ? "bg-green-500/10 text-green-700 dark:text-green-500"
                            : quotation.status === "rejected"
                                ? "bg-red-500/10 text-red-700 dark:text-red-500"
                                : quotation.status === "sent"
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-500"
                                    : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                            }`}>
                            {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </div>

                        {quotation.status === "draft" && (
                            <Button
                                onClick={() => handleStatusUpdate("sent")}
                                variant="default"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Send size={16} />
                                Send
                            </Button>
                        )}

                        {quotation.status === "sent" && (
                            <>
                                <Button
                                    onClick={() => handleStatusUpdate("accepted")}
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                                >
                                    <CheckCircle size={16} />
                                    Accept
                                </Button>
                                <Button
                                    onClick={() => handleStatusUpdate("rejected")}
                                    variant="destructive"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <XCircle size={16} />
                                    Reject
                                </Button>
                            </>
                        )}

                        {quotation.status === "accepted" && (
                            <Button
                                onClick={handleConvertToInvoice}
                                variant="default"
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                            >
                                <FileText size={16} />
                                Convert to Invoice
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="flex items-center gap-2"
                        >
                            {isDownloading ? "Downloading..." : "Download PDF"}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleShare}
                            disabled={isSharing}
                            className="flex items-center gap-2"
                        >
                            {isSharing ? "Sharing..." : "Share"}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handlePrint}
                            className="flex items-center gap-2"
                        >
                            Print
                        </Button>
                    </div>
                </div>


                {/* Quotation Preview */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 md:p-8">

                    {/* Quotation Info */}
                    <div className="text-left mb-8">
                        <h3 className="text-3xl font-bold text-primary">QUOTATION</h3>
                        <p className="text-gray-600 dark:text-gray-300">#{quotation.quotationNumber}</p>
                        <p className="text-gray-600 dark:text-gray-300">Date: {new Date(quotation.createdAt).toLocaleDateString()}</p>
                        <p className="text-gray-600 dark:text-gray-300">Valid Until: {new Date(quotation.dueDate).toLocaleDateString()}</p>
                    </div>
                    {/* Header with From and Bill To sections */}
                    <div className="flex flex-col md:flex-row justify-between mb-8 gap-8">
                        {/* From Section - Left Side */}
                        <div className="md:w-1/2">
                            <h4 className="text-lg font-semibold mb-2">From:</h4>
                            <h2 className="text-2xl font-bold">{quotation.companyName}</h2>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{quotation.companyAddress}</p>
                            {quotation.companyGstNumber && (
                                <p className="text-gray-600 dark:text-gray-300">GST: {quotation.companyGstNumber}</p>
                            )}
                            <p className="text-gray-600 dark:text-gray-300">{quotation.companyEmail}</p>
                        </div>

                        {/* Bill To Section - Right Side */}
                        <div className="md:w-1/2">
                            <h4 className="text-lg font-semibold mb-2">Bill To:</h4>
                            <p className="font-medium">{quotation.clientName}</p>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{quotation.clientAddress}</p>
                            {quotation.clientGstNumber && (
                                <p className="text-gray-600 dark:text-gray-300">GST: {quotation.clientGstNumber}</p>
                            )}
                            <p className="text-gray-600 dark:text-gray-300">{quotation.clientEmail}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-8 overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Description</th>
                                    <th className="text-right py-2">Quantity</th>
                                    <th className="text-right py-2">Unit Price</th>
                                    <th className="text-right py-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="py-3">{item.description}</td>
                                        <td className="text-right py-3">{item.quantity}</td>
                                        <td className="text-right py-3">₹{item.unitPrice.toFixed(2)}</td>
                                        <td className="text-right py-3">₹{item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="ml-auto w-full md:w-1/2 mb-8">
                        <div className="flex justify-between py-1">
                            <span>Subtotal:</span>
                            <span>₹{quotation.subtotal.toFixed(2)}</span>
                        </div>
                        {quotation.igst > 0 && (
                            <div className="flex justify-between py-1">
                                <span>IGST ({quotation.igst}%):</span>
                                <span>₹{quotation.igstAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {quotation.cgst > 0 && (
                            <div className="flex justify-between py-1">
                                <span>CGST ({quotation.cgst}%):</span>
                                <span>₹{quotation.cgstAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {quotation.sgst > 0 && (
                            <div className="flex justify-between py-1">
                                <span>SGST ({quotation.sgst}%):</span>
                                <span>₹{quotation.sgstAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-1">
                            <span>Discount ({quotation.discountRate}%):</span>
                            <span>-₹{quotation.discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                            <span>Total:</span>
                            <span>₹{quotation.total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Notes */}
                    {quotation.notes && (
                        <div className="mb-8">
                            <h4 className="text-lg font-semibold mb-2">Notes:</h4>
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{quotation.notes}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default QuotationDetails;