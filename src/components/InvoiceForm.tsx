
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
    clientAddress: "",
    companyName: user?.displayName || "",
    companyAddress: "",
    companyEmail: user?.email || "",
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString().slice(0, 10),
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
    taxRate: 10,
    discountRate: 0,
    notes: "Thanks for your business!",
  });

  // Calculate subtotal
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate tax amount
  const taxAmount = (subtotal * invoiceData.taxRate) / 100;
  
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
  const total = subtotal + taxAmount - discountAmount;

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

  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceData({
      ...invoiceData,
      taxRate: Number(e.target.value) || 0,
    });
  };

  const handleDiscountRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceData({
      ...invoiceData,
      discountRate: Number(e.target.value) || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error("You must be logged in to create an invoice");
      return;
    }

    try {
      const invoice = createInvoice(user.uid, {
        ...invoiceData,
        discountRate,
      });
      
      toast.success("Invoice created successfully!");
      // Redirect to dashboard after a short delay to show the success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      toast.error("Failed to create invoice");
      console.error(error);
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
                    <th className="text-left p-2 pl-3">Description</th>
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
                          placeholder="Item description"
                          className="border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none"
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
                          className="text-center border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center">
                          <span className="mr-1 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => 
                              handleItemChange(index, "unitPrice", Number(e.target.value))
                            }
                            min="0"
                            step="0.01"
                            className="text-center border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none"
                            required
                          />
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        ${item.amount.toFixed(2)}
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
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Tax Rate:</span>
                <Input
                  type="number"
                  value={invoiceData.taxRate}
                  onChange={handleTaxRateChange}
                  min="0"
                  max="100"
                  className="w-16 h-8 text-right"
                />
                <span className="text-sm">%</span>
              </div>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Discount:</span>
                <Input
                  type="number"
                  value={discountRate}
                  onChange={handleDiscountRateChange}
                  min="0"
                  max="100"
                  className="w-16 h-8 text-right"
                  disabled={subtotal > 5000}
                />
                <span className="text-sm">%</span>
              </div>
              <span>${discountAmount.toFixed(2)}</span>
            </div>
            
            {subtotal > 1000 && discountRate === 5 && (
              <div className="text-xs text-accent-foreground">
                Automatic 5% discount applied for orders over $1,000
              </div>
            )}
            
            {subtotal > 5000 && discountRate === 10 && (
              <div className="text-xs text-accent-foreground">
                Automatic 10% discount applied for orders over $5,000
              </div>
            )}
            
            <div className="pt-2 border-t flex justify-between font-medium">
              <span>Total:</span>
              <span className="text-lg">${total.toFixed(2)}</span>
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
