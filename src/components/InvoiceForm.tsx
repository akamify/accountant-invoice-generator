import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceFormData, InvoiceItem } from "@/types/invoice";
import { createInvoice } from "@/services/invoiceService";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoiceData, setInvoiceData] = useState<InvoiceFormData>({
    clientName: "",
    clientEmail: "",
    clientPanNumber: "",
    clientGstNumber: "",
    clientAddress: "",
    companyName: user?.company || "",
    companyAddress: user?.address || "",
    companyEmail: user?.email || "",
    companyPanNumber: user?.companyPanNumber || "",
    companyGstNumber: user?.companyGstNumber || "",
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString().slice(0, 10),
    // Only set dueDate if status is not 'paid'
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    items: [
      {
        id: `item-${Date.now()}-0`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ],
    igst: 0,
    sgst: 0,
    cgst: 0,
    discountRate: 0,
    notes: "Thanks for your business!",
    paymentMode: "bank_transfer",
    transactionId: "",
    bankAccount: "",
    upiId: "",
  });

  // Calculate subtotal
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);

  const igstAmount = (subtotal * invoiceData.igst) / 100;
  const cgstAmount = (subtotal * invoiceData.cgst) / 100;
  const sgstAmount = (subtotal * invoiceData.sgst) / 100;

  // Calculate total tax amount
  const totalTaxAmount = igstAmount + cgstAmount + sgstAmount;

  // Calculate discount amount (with automatic discount based on total)
  let discountRate = invoiceData.discountRate;
  // If subtotal is over 1000, give at least 5% discount
  if (subtotal > 1000 && discountRate < 5) {
    discountRate = 5;
  }
  // If subtotal is over 5000, give at least 10% discount
  if (subtotal > 5000 && discountRate < 10) {
    discountRate = 10;
  }

  const discountAmount = (subtotal * discountRate) / 100;

  // Calculate total
  const total = subtotal + totalTaxAmount - discountAmount;

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInvoiceData({
      ...invoiceData,
      [name]: value,
    });
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInvoiceData({
      ...invoiceData,
      [name]: value,
    });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const items = [...invoiceData.items];
    items[index] = {
      ...items[index],
      [field]: value,
    };

    // Recalculate item amount whenever quantity or unit price changes
    if (field === "quantity" || field === "unitPrice") {
      items[index].quantity = items[index].quantity || 0;
      items[index].unitPrice = items[index].unitPrice || 0;
      items[index].amount = items[index].quantity * items[index].unitPrice;
    }

    setInvoiceData({
      ...invoiceData,
      items,
    });
  };

  const handleAddItem = () => {
    setInvoiceData({
      ...invoiceData,
      items: [
        ...invoiceData.items,
        {
          id: `item-${Date.now()}-${invoiceData.items.length}`,
          description: "",
          quantity: 1,
          unitPrice: 0,
          amount: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceData.items.length === 1) {
      toast.error("Invoice must have at least one item");
      return;
    }
    const items = [...invoiceData.items];
    items.splice(index, 1);
    setInvoiceData({
      ...invoiceData,
      items,
    });
  };

  const handleTaxRateChange = (
    field: "igst" | "cgst" | "sgst",
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setInvoiceData({
      ...invoiceData,
      [field]: numValue,
    });
  };

  const handleStatusChange = (value: string) => {
    const newStatus = value as 'pending' | 'paid' | 'overdue' | 'draft' | 'confirmed';

    // If changing to 'paid', remove dueDate
    // If changing from 'paid' to another status, set a default dueDate
    const updates: Partial<InvoiceFormData> = {
      status: newStatus
    };

    if (newStatus === 'paid') {
      // When setting to paid, we don't need dueDate
      // But we'll keep the existing value in state, just hide it in UI
    } else if (invoiceData.status === 'paid') {
      // When changing from paid to another status, set a default dueDate
      updates.dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }

    setInvoiceData({
      ...invoiceData,
      ...updates
    });
  };

  const handleDiscountRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setInvoiceData({
      ...invoiceData,
      discountRate: value,
    });
  };

  const handlePaymentModeChange = (value: string) => {
    setInvoiceData({
      ...invoiceData,
      paymentMode: value as 'bank_transfer' | 'upi' | 'cash' | 'card' | 'cheque',
      // Reset payment-specific fields when mode changes
      transactionId: '',
      bankAccount: '',
      upiId: ''
    });
  };

  const handlePaymentFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInvoiceData({
      ...invoiceData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission started');
    console.log('Current user:', user);

    if (!user?.uid) {
      toast.error("You must be logged in to create an invoice");
      return;
    }

    // Validate payment details if status is paid
    if (invoiceData.status === 'paid') {
      // Validate PAN numbers if provided
      if (invoiceData.clientPanNumber && !/^([A-Z]){5}([0-9]){4}([A-Z]){1}$/.test(invoiceData.clientPanNumber)) {
        toast.error("Invalid Client PAN format. Expected format: AAAPA1234A");
        return;
      }

      if (invoiceData.companyPanNumber && !/^([A-Z]){5}([0-9]){4}([A-Z]){1}$/.test(invoiceData.companyPanNumber)) {
        toast.error("Invalid Company PAN format. Expected format: AAAPA1234A");
        return;
      }

      // Validate GST numbers if provided
      if (invoiceData.clientGstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(invoiceData.clientGstNumber)) {
        toast.error("Invalid Client GST format. Expected format: 27ABCDE1234F2Z5");
        return;
      }

      if (invoiceData.companyGstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(invoiceData.companyGstNumber)) {
        toast.error("Invalid Company GST format. Expected format: 27ABCDE1234F2Z5");
        return;
      }

      // Validate payment mode specific fields
      if (invoiceData.paymentMode === 'upi') {
        if (!invoiceData.upiId?.trim()) {
          toast.error("UPI ID is required for UPI payments");
          return;
        }

        // Validate UPI ID format (username@bankhandle or mobilenumber@upi)
        if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$|^\d{10}@upi$/.test(invoiceData.upiId)) {
          toast.error("Invalid UPI ID format. Expected format: username@bankhandle or mobilenumber@upi");
          return;
        }

        // Validate UPI transaction ID format
        if (invoiceData.transactionId && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(invoiceData.transactionId)) {
          toast.error("Invalid UPI Transaction ID format. Expected format: 27ABCDE1234F2Z5");
          return;
        }
      } else if (invoiceData.paymentMode === 'bank_transfer') {
        if (!invoiceData.bankAccount?.trim()) {
          toast.error("Bank account is required for bank transfer");
          return;
        }

        // Validate bank account number format
        if (!/^\d{11}$/.test(invoiceData.bankAccount)) {
          toast.error("Invalid Bank Account format. Expected format: 12345678901");
          return;
        }

        // Validate bank transaction ID format
        if (invoiceData.transactionId && !/^UTR[A-Z0-9]{13}$/.test(invoiceData.transactionId)) {
          toast.error("Invalid Bank Transaction ID format. Expected format: UTRRR12345678901");
          return;
        }
      } else if (invoiceData.paymentMode === 'card') {
        // Validate card transaction ID format
        if (invoiceData.transactionId && !/^T\d{21}$/.test(invoiceData.transactionId)) {
          toast.error("Invalid Card Transaction ID format. Expected format: T2503121123537872707045");
          return;
        }
      } else if (invoiceData.paymentMode === 'cheque') {
        // For cheque payments, validate cheque number instead of transaction ID
        if (!invoiceData.transactionId?.trim()) {
          toast.error("Cheque number is required for cheque payments");
          return;
        }

        // Validate cheque number format (6-digit unique identifier)
        if (!/^\d{6}$/.test(invoiceData.transactionId)) {
          toast.error("Invalid Cheque Number format. Expected format: 6-digit unique identifier");
          return;
        }
      } else if (invoiceData.paymentMode === 'cash') {
        // For cash payments, no transaction ID is required
        // But if provided, validate based on context
        if (invoiceData.transactionId) {
          toast.error("Transaction ID is not required for cash payments");
          return;
        }
      } else if (invoiceData.paymentMode !== 'cash' && !invoiceData.transactionId?.trim()) {
        toast.error("Transaction ID is required for non-cash payments");
        return;
      }
    }

    try {
      console.log('Preparing to create invoice with data:', {
        userId: user.uid,
        invoiceData: {
          ...invoiceData,
          discountRate,
        }
      });

      const invoice = await createInvoice(user.uid, {
        ...invoiceData,
        discountRate,
        ...(invoiceData.status && { status: invoiceData.status }) // Only include status if it's set
      });

      console.log('Invoice created successfully:', invoice);

      toast.success("Invoice created successfully!");
      // Redirect to dashboard after a short delay to show the success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error("Failed to create invoice");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Client Information */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Client Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="clientName" className="text-sm font-medium">Client Name</label>
                <Input
                  id="clientName"
                  name="clientName"
                  value={invoiceData.clientName}
                  onChange={handleClientChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="clientPanNumber" className="text-sm font-medium">Client PAN (Optional)</label>
                <Input
                  id="clientPanNumber"
                  name="clientPanNumber"
                  value={invoiceData.clientPanNumber}
                  onChange={handleClientChange}
                />
              </div>

              <div>
                <label htmlFor="clientGstNumber" className="text-sm font-medium">Client GST (Optional)</label>
                <Input
                  id="clientGstNumber"
                  name="clientGstNumber"
                  value={invoiceData.clientGstNumber}
                  onChange={handleClientChange}
                />
              </div>

              <div>
                <label htmlFor="clientEmail" className="text-sm font-medium">Client Email</label>
                <Input
                  id="clientEmail"
                  name="clientEmail"
                  type="email"
                  value={invoiceData.clientEmail}
                  onChange={handleClientChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="clientAddress" className="text-sm font-medium">Client Address</label>
                <Textarea
                  id="clientAddress"
                  name="clientAddress"
                  value={invoiceData.clientAddress}
                  onChange={handleClientChange}
                  rows={3}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Your Company Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={invoiceData.companyName}
                  onChange={handleCompanyChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="companyPanNumber" className="text-sm font-medium">Company PAN (Optional)</label>
                <Input
                  id="companyPanNumber"
                  name="companyPanNumber"
                  type="text"
                  value={invoiceData.companyPanNumber}
                  onChange={handleCompanyChange}
                />
              </div>

              <div>
                <label htmlFor="companyGstNumber" className="text-sm font-medium">Company GST (Optional)</label>
                <Input
                  id="companyGstNumber"
                  name="companyGstNumber"
                  type="text"
                  value={invoiceData.companyGstNumber}
                  onChange={handleCompanyChange}
                />
              </div>

              <div>
                <label htmlFor="companyEmail" className="text-sm font-medium">Company Email</label>
                <Input
                  id="companyEmail"
                  name="companyEmail"
                  type="email"
                  value={invoiceData.companyEmail}
                  onChange={handleCompanyChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="companyAddress" className="text-sm font-medium">Company Address</label>
                <Textarea
                  id="companyAddress"
                  name="companyAddress"
                  value={invoiceData.companyAddress}
                  onChange={handleCompanyChange}
                  rows={3}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div>
              <label htmlFor="invoiceNumber" className="text-sm font-medium">Invoice Number</label>
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={handleClientChange}
                required
              />
            </div>

            <div>
              <label htmlFor="createdAt" className="text-sm font-medium">Issue Date</label>
              <Input
                id="createdAt"
                name="createdAt"
                type="date"
                value={invoiceData.createdAt}
                onChange={handleClientChange}
                required
              />
            </div>

            {invoiceData.status !== 'paid' && (
              <div>
                <label htmlFor="dueDate" className="text-sm font-medium">Due Date</label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={handleClientChange}
                  required
                />
              </div>
            )}
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Items</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="flex items-center gap-1"
              >
                <Plus size={16} />
                Add Item
              </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 pl-3">Item</th>
                    <th className="text-center p-2 w-24">Qty</th>
                    <th className="text-center p-2 w-32">Unit Price</th>
                    <th className="text-center p-2 w-32">Amount</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2 pl-3">
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          placeholder="Item Name"
                          className="border bg-transparent focus-visible:ring-0 p-3"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", Number(e.target.value))
                          }
                          min="1"
                          className="text-center border bg-transparent focus-visible:ring-0 p-3"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <span className="mr-1 text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(index, "unitPrice", Number(e.target.value))
                            }
                            min="0"
                            step="0.01"
                            className="text-center border bg-transparent focus-visible:ring-0 p-3"
                            required
                          />
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        ₹{item.amount.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-8 space-y-4 ml-auto max-w-xs">
            <div className="flex justify-between">
              <span className="text-sm">Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">IGST:</span>
                <Input
                  type="number"
                  value={invoiceData.igst || ""}
                  onChange={(e) => handleTaxRateChange("igst", e.target.value)}
                  min="0"
                  max="100"
                  className="w-16 h-8 text-right"
                  placeholder="0"
                />
                <span className="text-sm">%</span>
              </div>
              <span>₹{igstAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">CGST:</span>
                <Input
                  type="number"
                  value={invoiceData.cgst || ""}
                  onChange={(e) => handleTaxRateChange("cgst", e.target.value)}
                  min="0"
                  max="100"
                  className="w-16 h-8 text-right"
                  placeholder="0"
                />
                <span className="text-sm">%</span>
              </div>
              <span>₹{cgstAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">SGST:</span>
                <Input
                  type="number"
                  value={invoiceData.sgst || ""}
                  onChange={(e) => handleTaxRateChange("sgst", e.target.value)}
                  min="0"
                  max="100"
                  className="w-16 h-8 text-right"
                  placeholder="0"
                />
                <span className="text-sm">%</span>
              </div>
              <span>₹{sgstAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Discount:</span>
                <Input
                  type="number"
                  value={discountRate || ""}
                  onChange={handleDiscountRateChange}
                  min="0"
                  max="100"
                  className="w-16 h-8 text-right"
                  placeholder="0"
                />
                <span className="text-sm">%</span>
              </div>
              <span>₹{discountAmount.toFixed(2)}</span>
            </div>

            {subtotal > 1000 && discountRate === 5 && (
              <div className="text-xs text-accent-foreground">
                Automatic 5% discount applied for orders over ₹1,000
              </div>
            )}

            {subtotal > 5000 && discountRate === 10 && (
              <div className="text-xs text-accent-foreground">
                Automatic 10% discount applied for orders over ₹5,000
              </div>
            )}

            <div className="pt-2 border-t flex justify-between font-medium">
              <span>Total:</span>
              <span className="text-lg">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-8">
            <label htmlFor="notes" className="text-sm font-medium">Notes</label>
            <Textarea
              id="notes"
              name="notes"
              value={invoiceData.notes}
              onChange={handleClientChange}
              rows={2}
              placeholder="Any additional notes for the client"
            />
          </div>

          {/* Status */}
          <div className="mt-4">
            <label htmlFor="status" className="text-sm font-medium">Payment Status</label>
            <Select
              value={invoiceData.status || 'draft'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Details (only shown when status is paid) */}
          {invoiceData.status === 'paid' && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-4">Payment Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Mode</label>
                  <Select value={invoiceData.paymentMode || 'bank_transfer'} onValueChange={handlePaymentModeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {invoiceData.paymentMode !== 'cash' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Transaction ID *</label>
                    <Input
                      name="transactionId"
                      value={invoiceData.transactionId || ''}
                      onChange={handlePaymentFieldChange}
                      placeholder="Enter transaction ID"
                    />
                  </div>
                )}

                {invoiceData.paymentMode === 'bank_transfer' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Bank Account *</label>
                    <Input
                      name="bankAccount"
                      value={invoiceData.bankAccount || ''}
                      onChange={handlePaymentFieldChange}
                      placeholder="Enter bank account number"
                    />
                  </div>
                )}

                {invoiceData.paymentMode === 'upi' && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">UPI ID *</label>
                    <Input
                      name="upiId"
                      value={invoiceData.upiId || ''}
                      onChange={handlePaymentFieldChange}
                      placeholder="Enter UPI ID"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
          Cancel
        </Button>
        <Button type="submit">Create Invoice</Button>
      </div>
    </form>
  );
}