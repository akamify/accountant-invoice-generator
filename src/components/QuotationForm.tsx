import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { QuotationFormData, QuotationItem } from "@/types/invoice";
import { createQuotation } from "@/services/quotationService";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface QuotationFormProps {
    initialData?: QuotationFormData;
}

const QuotationForm = ({ initialData }: QuotationFormProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [quotationData, setQuotationData] = useState<QuotationFormData>(
        initialData || {
            clientName: "",
            clientEmail: "",
            clientGstNumber: "",
            clientAddress: "",
            companyName: user?.displayName || "",
            companyAddress: user?.address || "",
            companyEmail: user?.email || "",
            companyGstNumber: user?.companyGstNumber || "",
            quotationNumber: `QT-${Date.now().toString().slice(-6)}`,
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
            igst: 0,
            sgst: 0,
            cgst: 0,
            discountRate: 0,
            notes: "Thanks for your business!",
        }
    );

    // Calculate subtotal
    const subtotal = quotationData.items.reduce((sum, item) => sum + item.amount, 0);

    const igstAmount = (subtotal * quotationData.igst) / 100;
    const cgstAmount = (subtotal * quotationData.cgst) / 100;
    const sgstAmount = (subtotal * quotationData.sgst) / 100;

    // Calculate total tax amount
    const totalTaxAmount = igstAmount + cgstAmount + sgstAmount;

    // Calculate discount amount (with automatic discount based on total)
    let discountRate = quotationData.discountRate;
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
        setQuotationData({
            ...quotationData,
            [name]: value,
        });
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setQuotationData({
            ...quotationData,
            [name]: value,
        });
    };

    const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
        const items = [...quotationData.items];
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

        setQuotationData({
            ...quotationData,
            items,
        });
    };

    const handleAddItem = () => {
        setQuotationData({
            ...quotationData,
            items: [
                ...quotationData.items,
                {
                    id: `item-${Date.now()}-${quotationData.items.length}`,
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    amount: 0,
                },
            ],
        });
    };

    const handleRemoveItem = (index: number) => {
        if (quotationData.items.length === 1) {
            toast.error("Quotation must have at least one item");
            return;
        }
        const items = [...quotationData.items];
        items.splice(index, 1);
        setQuotationData({
            ...quotationData,
            items,
        });
    };

    const handleTaxRateChange = (
        field: "igst" | "cgst" | "sgst",
        value: string
    ) => {
        const numValue = parseFloat(value) || 0;
        setQuotationData({
            ...quotationData,
            [field]: numValue,
        });
    };


    const handleDiscountRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value) || 0;
        setQuotationData({
            ...quotationData,
            discountRate: value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.uid) {
            toast.error("You must be logged in to create a quotation");
            return;
        }

        try {
            const quotation = await createQuotation(user.uid, {
                ...quotationData,
                discountRate,
            });

            toast.success("Quotation created successfully!");
            // Redirect to quotations page after a short delay to show the success message
            setTimeout(() => {
                navigate('/quotations');
            }, 1000);
        } catch (error) {
            toast.error("Failed to create quotation");
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
                                    value={quotationData.clientName}
                                    onChange={handleClientChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="clientGstNumber" className="text-sm font-medium">Client GST (Optional)</label>
                                <Input
                                    id="clientGstNumber"
                                    name="clientGstNumber"
                                    value={quotationData.clientGstNumber}
                                    onChange={handleClientChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="clientEmail" className="text-sm font-medium">Client Email</label>
                                <Input
                                    id="clientEmail"
                                    name="clientEmail"
                                    type="email"
                                    value={quotationData.clientEmail}
                                    onChange={handleClientChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="clientAddress" className="text-sm font-medium">Client Address</label>
                                <Textarea
                                    id="clientAddress"
                                    name="clientAddress"
                                    value={quotationData.clientAddress}
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
                        <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    value={quotationData.companyName}
                                    onChange={handleCompanyChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="companyGstNumber" className="text-sm font-medium">Company GST (Optional)</label>
                                <Input
                                    id="companyGstNumber"
                                    name="companyGstNumber"
                                    value={quotationData.companyGstNumber}
                                    onChange={handleCompanyChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="companyEmail" className="text-sm font-medium">Company Email</label>
                                <Input
                                    id="companyEmail"
                                    name="companyEmail"
                                    type="email"
                                    value={quotationData.companyEmail}
                                    onChange={handleCompanyChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="companyAddress" className="text-sm font-medium">Company Address</label>
                                <Textarea
                                    id="companyAddress"
                                    name="companyAddress"
                                    value={quotationData.companyAddress}
                                    onChange={handleCompanyChange}
                                    rows={3}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quotation Details */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Quotation Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label htmlFor="quotationNumber" className="text-sm font-medium">Quotation Number</label>
                            <Input
                                id="quotationNumber"
                                name="quotationNumber"
                                value={quotationData.quotationNumber}
                                onChange={handleClientChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="createdAt" className="text-sm font-medium">Quotation Date</label>
                            <Input
                                id="createdAt"
                                name="createdAt"
                                type="date"
                                value={quotationData.createdAt}
                                onChange={handleClientChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="dueDate" className="text-sm font-medium">Valid Until</label>
                            <Input
                                id="dueDate"
                                name="dueDate"
                                type="date"
                                value={quotationData.dueDate}
                                onChange={handleClientChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium">Items</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="flex items-center gap-2">
                                <Plus size={16} />
                                Add Item
                            </Button>
                        </div>

                        {quotationData.items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-5">
                                    <label className="text-sm font-medium">Item Name</label>
                                    <Input
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Quantity</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Unit Price</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium">Amount</label>
                                    <Input
                                        type="text"
                                        value={item.amount.toFixed(2)}
                                        readOnly
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItem(index)}
                                    >
                                        <Trash2 size={16} className="text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Tax and Discount */}
            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4">Tax Rates</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="igst" className="text-sm font-medium">IGST (%)</label>
                                <Input
                                    id="igst"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={quotationData.igst}
                                    onChange={(e) => handleTaxRateChange("igst", e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="cgst" className="text-sm font-medium">CGST (%)</label>
                                <Input
                                    id="cgst"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={quotationData.cgst}
                                    onChange={(e) => handleTaxRateChange("cgst", e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="sgst" className="text-sm font-medium">SGST (%)</label>
                                <Input
                                    id="sgst"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={quotationData.sgst}
                                    onChange={(e) => handleTaxRateChange("sgst", e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4">Discount</h3>
                        <div>
                            <label htmlFor="discountRate" className="text-sm font-medium">Discount Rate (%)</label>
                            <Input
                                id="discountRate"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={quotationData.discountRate}
                                onChange={handleDiscountRateChange}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                {discountRate > quotationData.discountRate && discountRate !== quotationData.discountRate
                                    ? `Auto-discount applied: ${discountRate}%`
                                    : "Enter discount percentage"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notes */}
            <Card>
                <CardContent className="pt-6">
                    <div>
                        <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                        <Textarea
                            id="notes"
                            name="notes"
                            value={quotationData.notes}
                            onChange={handleClientChange}
                            rows={2}
                            placeholder="Any additional notes for the client"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Totals */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div></div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            {quotationData.igst > 0 && (
                                <div className="flex justify-between">
                                    <span>IGST ({quotationData.igst}%):</span>
                                    <span>₹{igstAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {quotationData.cgst > 0 && (
                                <div className="flex justify-between">
                                    <span>CGST ({quotationData.cgst}%):</span>
                                    <span>₹{cgstAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {quotationData.sgst > 0 && (
                                <div className="flex justify-between">
                                    <span>SGST ({quotationData.sgst}%):</span>
                                    <span>₹{sgstAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>Discount ({discountRate}%):</span>
                                <span>-₹{discountAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                                <span>Total:</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/quotations")}>
                    Cancel
                </Button>
                <Button type="submit">Create Quotation</Button>
            </div>
        </form>
    );
};

export default QuotationForm;