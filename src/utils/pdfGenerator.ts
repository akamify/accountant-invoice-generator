
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceData } from '@/types/invoice';

export const generatePDF = async (
  invoiceElementId: string,
  invoiceData: InvoiceData
): Promise<string> => {
  try {
    // Get the invoice element
    const element = document.getElementById(invoiceElementId);
    if (!element) throw new Error('Invoice element not found');

    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Convert canvas to image
    const imgData = canvas.toDataURL('image/png');

    // Initialize PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Calculate dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Add metadata
    pdf.setProperties({
      title: `Invoice #${invoiceData.invoiceNumber}`,
      subject: `Invoice for ${invoiceData.clientName}`,
      author: invoiceData.companyName,
      creator: 'Ramesh Tyres',
    });

    // Generate PDF as blob URL
    const pdfBlob = pdf.output('blob');
    return URL.createObjectURL(pdfBlob);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const downloadPDF = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
