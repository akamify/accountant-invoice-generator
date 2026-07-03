import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InvoiceData } from "@/types/invoice";
import { toast } from "sonner";
import { Share2, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { formatCurrencyAmount } from "@/utils/currency";

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export default function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const currency = invoice.currency || "INR";
  const formatDate = (value?: string) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };
  // Limit the number of line items shown in the preview / PDF
  const maxItemsToShow = 10;
  const displayedItems = invoice.items.slice(0, maxItemsToShow);
  const truncateItemName = (value?: string) => {
    const text = String(value || "").trim();
    return text.length > 58 ? `${text.slice(0, 58)}...` : text;
  };

  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);

      const invoiceElement = document.getElementById("invoice-preview");
      if (!invoiceElement) {
        throw new Error("Invoice preview not found");
      }

      const canvas = await html2canvas(invoiceElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: invoiceElement.scrollWidth,
        windowHeight: invoiceElement.scrollHeight,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 8;
      const imageWidth = pdfWidth - pageMargin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const pageContentHeight = pdfHeight - pageMargin * 2;
      const imageData = canvas.toDataURL("image/png", 1);
      const fitsSinglePage = imageHeight <= pageContentHeight * 1.2;
      const fitRatio = fitsSinglePage ? Math.min(1, pageContentHeight / imageHeight) : 1;
      const renderWidth = imageWidth * fitRatio;
      const renderHeight = imageHeight * fitRatio;
      const renderX = pageMargin + (imageWidth - renderWidth) / 2;

      let remainingHeight = renderHeight;
      let positionY = pageMargin;

      pdf.setProperties({
        title: `Invoice #${invoice.invoiceNumber}`,
        subject: `Invoice for ${invoice.clientName}`,
        author: invoice.companyName || "Ramesh Tyres",
        creator: "Ramesh Tyres",
      });

      pdf.addImage(imageData, "PNG", renderX, positionY, renderWidth, renderHeight);
      remainingHeight -= pageContentHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        positionY = pageMargin - (renderHeight - remainingHeight);
        pdf.addImage(imageData, "PNG", renderX, positionY, renderWidth, renderHeight);
        remainingHeight -= pageContentHeight;
      }

      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      toast.error("Failed to download invoice");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!navigator.share) {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
      return;
    }

    try {
      setIsSharing(true);
      await navigator.share({
        title: `Invoice #${invoice.invoiceNumber}`,
        text: `Invoice #${invoice.invoiceNumber} from ${invoice.companyName}`,
        url: window.location.href,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-4 pr-20 print:hidden">
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center gap-2"
        >
          <Download size={16} />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </Button>

        <Button
          variant="outline"
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center gap-2"
        >
          <Share2 size={16} />
          {isSharing ? 'Sharing...' : 'Share'}
        </Button>

        <Button
          variant="outline"
          onClick={handlePrint}
          className="flex items-center gap-2"
        >
          <Printer size={16} />
          Print
        </Button>
      </div>

      <Card className="p-8 max-w-4xl mx-auto bg-white dark:bg-card" id="invoice-preview">
        <div className="flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-primary">INVOICE</h1>
              <p className="text-muted-foreground mt-1">#{invoice.invoiceNumber}</p>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-bold">{invoice.companyName}</h2>
              <p className="whitespace-pre-line text-sm text-muted-foreground mt-1">
                {invoice.companyAddress}
                <br />
                {invoice.companyEmail}
              </p>
              {invoice.companyPanNumber && (
                <p className="text-sm mt-1">
                  <span className="font-medium">PAN:</span> {invoice.companyPanNumber}
                </p>
              )}
              {invoice.companyGstNumber && (
                <p className="text-sm mt-1">
                  <span className="font-medium">GST:</span> {invoice.companyGstNumber}
                </p>
              )}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-medium text-muted-foreground mb-2">Bill To</h3>
              <h4 className="font-semibold">{invoice.clientName}</h4>
              <p className="whitespace-pre-line text-sm mt-1">
                {invoice.clientAddress}
                <br />
                {invoice.clientEmail}
              </p>
              {invoice.clientPanNumber && (
                <p className="text-sm mt-1">
                  <span className="font-medium">PAN:</span> {invoice.clientPanNumber}
                </p>
              )}
              {invoice.clientGstNumber && (
                <p className="text-sm mt-1">
                  <span className="font-medium">GST:</span> {invoice.clientGstNumber}
                </p>
              )}
            </div>

            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Date:</span>
                  <span>{formatDate(invoice.createdAt || invoice.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize">{invoice.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[52%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 pl-0 font-semibold">Item</th>
                  <th className="text-right p-2 font-semibold">Qty</th>
                  <th className="text-right p-2 font-semibold">Unit Price</th>
                  <th className="text-right p-2 pr-0 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="max-w-0 py-3 pl-0 pr-4">
                      <span className="block truncate" title={item.description}>
                        {truncateItemName(item.description)}
                      </span>
                    </td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">{formatCurrencyAmount(item.unitPrice, currency)}</td>
                    <td className="py-3 text-right pr-0">{formatCurrencyAmount(item.amount || 0, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 space-y-8">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrencyAmount(invoice.subtotal || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST ({invoice.igst || 0}%):</span>
                  <span>{formatCurrencyAmount(invoice.igstAmount || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST ({invoice.cgst || 0}%):</span>
                  <span>{formatCurrencyAmount(invoice.cgstAmount || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST ({invoice.sgst || 0}%):</span>
                  <span>{formatCurrencyAmount(invoice.sgstAmount || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount ({invoice.discountRate || 0}%):</span>
                  <span>{formatCurrencyAmount(invoice.discountAmount || 0, currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-medium text-lg">
                  <span>Total:</span>
                  <span>{formatCurrencyAmount(invoice.total || 0, currency)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div>
                <h3 className="font-medium text-muted-foreground mb-2">Notes</h3>
                <p className="whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* Payment Details */}
            {invoice.status === 'paid' && invoice.paymentMode && (
              <div className="p-6 bg-muted rounded-[4px] border">
                <h3 className="font-medium text-lg mb-4">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Mode</p>
                    <p className="font-medium capitalize">
                      {invoice.paymentMode === 'bank_transfer' ? 'Bank Transfer' :
                        invoice.paymentMode === 'upi' ? 'UPI' :
                          invoice.paymentMode.charAt(0).toUpperCase() + invoice.paymentMode.slice(1)}
                    </p>
                  </div>

                  {invoice.paymentMode !== 'cash' && (
                    <div>
                      <p className="text-sm text-muted-foreground">Transaction ID</p>
                      <p className="font-medium">{invoice.transactionId}</p>
                    </div>
                  )}

                  {invoice.paymentMode === 'bank_transfer' && invoice.bankAccount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bank Account</p>
                      <p className="font-medium">{invoice.bankAccount}</p>
                    </div>
                  )}

                  {invoice.paymentMode === 'upi' && invoice.upiId && (
                    <div>
                      <p className="text-sm text-muted-foreground">UPI ID</p>
                      <p className="font-medium">{invoice.upiId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
