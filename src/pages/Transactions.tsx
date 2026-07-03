import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTransaction, deleteTransaction, getTransactions } from "@/services/transactionService";
import { Transaction } from "@/types/invoice";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrencyAmount } from "@/utils/currency";

export default function Transactions() {
  const { settings } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      setTransactions(await getTransactions());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTransaction({
      type,
      title,
      amount: Number(amount),
      transactionDate: new Date().toISOString(),
      category: "Manual",
      paymentMethod: "manual",
    });
    setTitle("");
    setAmount("");
    toast.success("Transaction created");
    await loadTransactions();
  };

  const handleDelete = async (transaction: Transaction) => {
    try {
      await deleteTransaction(transaction.id);
      toast.success("Transaction deleted");
      await loadTransactions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
    }
  };

  const filtered = transactions.filter((transaction) =>
    (transaction.title || transaction.invoiceNumber || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">Manual income/expense entries and invoice-linked payments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Manual Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[160px_1fr_160px_auto]">
            <Select value={type} onValueChange={(value) => setType(value as "income" | "expense")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Amount" required />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading transactions...</div>
          ) : filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium">{transaction.title || `Invoice #${transaction.invoiceNumber}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.source || "manual"} â€¢ {new Date(transaction.transactionDate || transaction.date || transaction.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <p className={`font-medium ${transaction.type === "income" || transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {transaction.type === "income" || transaction.type === "credit" ? "+" : "-"}{formatCurrencyAmount(Number(transaction.amount || 0), settings?.currency)}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(transaction)} disabled={transaction.source === "invoice"}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">No transactions found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
