import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InvoiceData } from "@/types/invoice";
import { toast } from "sonner";
import { Share2, Printer, Download } from "lucide-react";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Extend jsPDF type to include lastAutoTable
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface InvoicePreviewProps {
  invoice: InvoiceData;
}

export default function InvoicePreview({ invoice }: InvoicePreviewProps) {
  // Limit the number of line items shown in the preview / PDF
  const maxItemsToShow = 10;
  const displayedItems = invoice.items.slice(0, maxItemsToShow);

  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
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
      doc.text("INVOICE", margin, 45);
      doc.setFontSize(10);
      doc.setTextColor("#fff");
      doc.text(`Invoice`, margin, 70);
      doc.text(`Date`, margin, 90);
      doc.text(`Due Date`, margin, 110);
      doc.setFont("helvetica", "bold");
      doc.setTextColor("#fff");
      doc.text(`#${invoice.invoiceNumber}`, margin + 90, 70);
      doc.text(format(new Date(invoice.createdAt), "MMM dd, yyyy"), margin + 90, 90);
      doc.text(format(new Date(invoice.dueDate), "MMM dd, yyyy"), margin + 90, 110);

      // Company (left)
      const rightX = 40;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("From", margin, 150);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.companyName, rightX, 170);
      doc.setFont("helvetica", "normal");
      let companyY = 185;
      if (invoice.companyAddress) {
        doc.text(invoice.companyAddress, rightX, companyY, { maxWidth: pageWidth - rightX - margin });
        companyY += 15;
      }
      if (invoice.companyGstNumber) {
        doc.text(`GST: ${invoice.companyGstNumber}`, rightX, companyY);
        companyY += 15;
      }
      if (invoice.companyEmail) {
        doc.text(invoice.companyEmail, rightX, companyY);
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
      doc.text(invoice.clientName, clientXPosition, clientY);
      clientY += 15;
      if (invoice.clientAddress) {
        doc.text(invoice.clientAddress, clientXPosition, clientY, { maxWidth: pageWidth - clientXPosition - margin });
        clientY += 15;
      }
      if (invoice.clientGstNumber) {
        doc.text(`GST: ${invoice.clientGstNumber}`, clientXPosition, clientY);
        clientY += 15;
      }
      if (invoice.clientEmail) {
        doc.text(invoice.clientEmail, clientXPosition, clientY);
      }

      // Items table
      const tableStartY = clientY + 40;
      const tableColumns = ["DESCRIPTION", "QTY", "PRICE", "AMOUNT"];
      const tableBody = displayedItems.map((item) => [
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
        (doc as ExtendedJsPDF).lastAutoTable?.finalY ||
        tableStartY + 40;

      // Totals
      let totalsY = afterTableY + 30;
      const labelX = pageWidth - margin - 150;
      const valueX = pageWidth - margin;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      doc.text("Subtotal:", labelX, totalsY, { align: "right" });
      doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, valueX, totalsY, { align: "right" });
      totalsY += 18;

      if (invoice.igst > 0) {
        doc.text(`IGST (${invoice.igst}%):`, labelX, totalsY, { align: "right" });
        doc.text(`Rs. ${invoice.igstAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
        totalsY += 18;
      }
      if (invoice.cgst > 0) {
        doc.text(`CGST (${invoice.cgst}%):`, labelX, totalsY, { align: "right" });
        doc.text(`Rs. ${invoice.cgstAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
        totalsY += 18;
      }
      if (invoice.sgst > 0) {
        doc.text(`SGST (${invoice.sgst}%):`, labelX, totalsY, { align: "right" });
        doc.text(`Rs. ${invoice.sgstAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
        totalsY += 18;
      }

      if (invoice.discountRate > 0) {
        doc.text(`Discount (${invoice.discountRate}%):`, labelX, totalsY, { align: "right" });
        doc.text(`Rs. ${invoice.discountAmount.toFixed(2)}`, valueX, totalsY, { align: "right" });
        totalsY += 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL:", labelX, totalsY, { align: "right" });
      doc.text(`Rs. ${invoice.total.toFixed(2)}`, valueX, totalsY, { align: "right" });

      // Notes
      if (invoice.notes) {
        const notesY = totalsY + 40;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Notes", margin, notesY);
        doc.setFont("helvetica", "normal");
        doc.text(invoice.notes, margin, notesY + 16, {
          maxWidth: pageWidth - margin * 2,
        });
      }

      // Payment details if invoice is paid
      if (invoice.status === 'paid' && invoice.paymentMode) {
        const paymentY = invoice.notes ? totalsY + 80 : totalsY + 40;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Payment Details", margin, paymentY);
        doc.setFont("helvetica", "normal");

        let paymentInfoY = paymentY + 16;

        // Payment Mode
        doc.text("Payment Mode:", margin, paymentInfoY);
        const paymentModeText = invoice.paymentMode === 'bank_transfer' ? 'Bank Transfer' :
          invoice.paymentMode === 'upi' ? 'UPI' :
            invoice.paymentMode.charAt(0).toUpperCase() + invoice.paymentMode.slice(1);
        doc.text(paymentModeText, margin + 100, paymentInfoY);
        paymentInfoY += 15;

        // Transaction ID (except for cash payments)
        if (invoice.paymentMode !== 'cash' && invoice.transactionId) {
          doc.text("Transaction ID:", margin, paymentInfoY);
          doc.text(invoice.transactionId, margin + 100, paymentInfoY);
          paymentInfoY += 15;
        }

        // Bank Account or UPI ID
        if (invoice.paymentMode === 'bank_transfer' && invoice.bankAccount) {
          doc.text("Bank Account:", margin, paymentInfoY);
          doc.text(invoice.bankAccount, margin + 100, paymentInfoY);
        } else if (invoice.paymentMode === 'upi' && invoice.upiId) {
          doc.text("UPI ID:", margin, paymentInfoY);
          doc.text(invoice.upiId, margin + 100, paymentInfoY);
        }
      }

      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
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
        <div className="flex flex-col min-h-[1000px]">
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
                  <th className="text-left p-2 pl-0 font-semibold">Item</th>
                  <th className="text-right p-2 font-semibold">Qty</th>
                  <th className="text-right p-2 font-semibold">Unit Price</th>
                  <th className="text-right p-2 pr-0 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pl-0">{item.description}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="py-3 text-right pr-0">₹{(item.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom section pinned to the bottom of the card */}
          <div className="mt-auto space-y-8">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST ({invoice.igst || 0}%):</span>
                  <span>₹{(invoice.igstAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST ({invoice.cgst || 0}%):</span>
                  <span>₹{(invoice.cgstAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST ({invoice.sgst || 0}%):</span>
                  <span>₹{(invoice.sgstAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount ({invoice.discountRate || 0}%):</span>
                  <span>₹{(invoice.discountAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-medium text-lg">
                  <span>Total:</span>
                  <span>₹{(invoice.total || 0).toFixed(2)}</span>
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
              <div className="p-6 bg-muted rounded-lg border">
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

            <div className="text-center text-sm text-muted-foreground">
              <p>This is computer generated invoice.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
