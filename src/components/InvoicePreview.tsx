
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InvoiceData } from "@/types/invoice";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { Share2, Printer, Download } from "lucide-react";
import { jsPDF } from "jspdf";

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export default function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const element = document.getElementById('invoice-preview');
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: window.devicePixelRatio, // Higher quality
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY
      } as any); // Type assertion to bypass TypeScript error for scale property
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
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
      <div className="flex items-center justify-end gap-4 print:hidden">
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
          </div>
          
          <div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="capitalize">{invoice.status}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 pl-0 font-semibold">Description</th>
                <th className="text-right p-2 font-semibold">Qty</th>
                <th className="text-right p-2 font-semibold">Unit Price</th>
                <th className="text-right p-2 pr-0 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3 pl-0">{item.description}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 text-right pr-0">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-8 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({invoice.taxRate}%):</span>
              <span>${invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount ({invoice.discountRate}%):</span>
              <span>${invoice.discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-medium text-lg">
              <span>Total:</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {invoice.notes && (
          <div className="mt-12">
            <h3 className="font-medium text-muted-foreground mb-2">Notes</h3>
            <p className="whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
        
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Thank you for your business!</p>
        </div>
      </Card>
    </div>
  );
}
