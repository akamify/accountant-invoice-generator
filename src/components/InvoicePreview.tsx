
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InvoiceData } from "@/types/invoice";
import { toast } from "sonner";
import { Share2, Printer, Download } from "lucide-react";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Type declaration for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export default function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      
      // Create a new PDF document
      const doc = new jsPDF('p', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const primaryColor: [number, number, number] = [59, 130, 246]; // blue-500
      
      // Add header with colored bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 80, 'F');
      
      // Add company logo/name in header
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text( 'GLOW INVOICE', margin, 50);
      
      // Main content area
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, 100, pageWidth - margin, 100);
      
      // Invoice title and details
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text('INVOICE', margin, 130);
      
      // Create a two-column layout
      const column1X = margin;
      const column2X = pageWidth / 2 + margin / 2;
      
      // Invoice info (left column)
      const infoStartY = 160;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('INVOICE #', column1X, infoStartY);
      doc.text('DATE', column1X, infoStartY + 20);
      doc.text('DUE DATE', column1X, infoStartY + 40);
      
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.invoiceNumber, column1X + 80, infoStartY);
      doc.text(format(new Date(invoice.createdAt), 'MMM dd, yyyy'), column1X + 80, infoStartY + 20);
      doc.text(format(new Date(invoice.dueDate), 'MMM dd, yyyy'), column1X + 80, infoStartY + 40);
      
      // Bill to section (left column, below invoice info)
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', column1X, infoStartY + 80);
      doc.setFont('helvetica', 'normal');
      
      // Bill From section (right column)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('BILL FROM', column2X, 160);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(invoice.companyName || 'Your Company Name', column2X, 180);
      doc.text(invoice.companyAddress || '123 Business St, City', column2X, 195);
      
      // Adjust the vertical position for the next section
      const nextSectionY = Math.max(
        240 + 20, // Below Bill To section
        infoStartY + 60 // Below invoice info
      ) + 20; // Add some spacing
      doc.text(invoice.clientName, margin, 260);
      invoice.clientEmail && doc.text(invoice.clientEmail, margin, 280);
      invoice.clientAddress && doc.text(invoice.clientAddress, margin, 300, { maxWidth: 200 });
      
      // Prepare table data
      const tableColumn = [
        { header: 'DESCRIPTION', dataKey: 'description' },
        { header: 'QTY', dataKey: 'quantity' },
        { header: 'PRICE', dataKey: 'unitPrice' },
        { header: 'AMOUNT', dataKey: 'total' }
      ];
      
      const tableRows = invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: `$${item.unitPrice.toFixed(2)}`,
        total: `$${(item.quantity * item.unitPrice).toFixed(2)}`
      }));
      
      // Add items table
      autoTable(doc, {
        startY: 340,
        head: [tableColumn.map(col => col.header)],
        body: tableRows.map(row => [
          row.description,
          row.quantity.toString(),
          row.unitPrice,
          row.total
        ]),
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: 'bold',
          lineWidth: 0.1,
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // gray-50
        },
        styles: {
          cellPadding: 8,
          fontSize: 10,
          cellWidth: 'wrap',
          lineWidth: 0.1,
          lineColor: [229, 231, 235] // gray-200
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 60, halign: 'right' },
          2: { cellWidth: 80, halign: 'right' },
          3: { cellWidth: 80, halign: 'right' }
        }
      });
      
      // Calculate totals
      const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const tax = subtotal * (invoice.taxRate / 100);
      const discount = subtotal * (invoice.discountRate / 100);
      const total = subtotal + tax - discount;
      
      // Add totals section
      const finalY = (doc.lastAutoTable?.finalY || 0) + 20;
      const totalsX = pageWidth - margin - 200;
      
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', totalsX, finalY, { align: 'right' });
      doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, finalY, { align: 'right' });
      
      if (invoice.taxRate > 0) {
        doc.text(`Tax (${invoice.taxRate}%):`, totalsX, finalY + 20, { align: 'right' });
        doc.text(`$${tax.toFixed(2)}`, pageWidth - margin, finalY + 20, { align: 'right' });
      }
      
      if (invoice.discountRate > 0) {
        doc.text(`Discount (${invoice.discountRate}%):`, totalsX, finalY + 40, { align: 'right' });
        doc.text(`-$${discount.toFixed(2)}`, pageWidth - margin, finalY + 40, { align: 'right' });
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL:', totalsX, finalY + 70, { align: 'right' });
      doc.text(`$${total.toFixed(2)}`, pageWidth - margin, finalY + 70, { align: 'right' });
      
      // Add payment terms
      if (invoice.notes) {
        const notesY = finalY + 120;
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT TERMS', margin, notesY);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.notes, margin, notesY + 20, { maxWidth: pageWidth - margin * 2 });
      }
      
      // Add footer
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Thank you for your business! • ${invoice.companyName} • ${invoice.companyEmail}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 20,
        { align: 'center', baseline: 'bottom' }
      );
      
      // Save the PDF
      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
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
                  <td className="py-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 text-right pr-0">₹{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-8 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({invoice.taxRate}%):</span>
              <span>₹{invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount ({invoice.discountRate}%):</span>
              <span>₹{invoice.discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-medium text-lg">
              <span>Total:</span>
              <span>₹{invoice.total.toFixed(2)}</span>
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
