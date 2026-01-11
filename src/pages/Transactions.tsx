import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ThreeDBackground from "@/components/ThreeDBackground";
import { ArrowLeft, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserInvoices } from "@/services/invoiceService";
import { getTransactionsFromInvoices, filterTransactionsByInvoiceNumber, sortTransactionsByAmount, sortTransactionsByDate } from "@/services/transactionService";
import { Transaction } from "@/types/invoice";

const Transactions = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("date-desc");
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate("/login");
        }
    }, [isAuthenticated, isLoading, navigate]);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (isAuthenticated && user?.uid) {
                try {
                    // Fetch user's invoices
                    const userInvoices = await getUserInvoices(user.uid);

                    // Convert invoices to transactions
                    const userTransactions = getTransactionsFromInvoices(userInvoices);

                    setTransactions(userTransactions);
                    setFilteredTransactions(userTransactions);
                } catch (error) {
                    console.error('Error loading transactions:', error);
                    setError("Failed to load transactions");
                }
            }
        };

        fetchTransactions();
    }, [isAuthenticated, user]);

    useEffect(() => {
        let result = [...transactions];

        // Apply search filter
        if (searchTerm) {
            result = filterTransactionsByInvoiceNumber(result, searchTerm);
        }

        // Apply sorting
        switch (sortOption) {
            case "amount-asc":
                result = sortTransactionsByAmount(result, "asc");
                break;
            case "amount-desc":
                result = sortTransactionsByAmount(result, "desc");
                break;
            case "date-asc":
                result = sortTransactionsByDate(result, "asc");
                break;
            case "date-desc":
                result = sortTransactionsByDate(result, "desc");
                break;
            default:
                break;
        }

        setFilteredTransactions(result);
    }, [transactions, searchTerm, sortOption]);

    if (isLoading || !isAuthenticated) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <ThreeDBackground />
            <main className="flex-1 container py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/dashboard")}
                        className="rounded-full"
                    >
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Transactions</h1>
                        <p className="text-muted-foreground">View all financial transactions</p>
                    </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search by invoice number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <Select value={sortOption} onValueChange={setSortOption}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date-desc">Newest First</SelectItem>
                                <SelectItem value="date-asc">Oldest First</SelectItem>
                                <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                                <SelectItem value="amount-asc">Amount: Low to High</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
                                    <p>{error}</p>
                                </div>
                                <Button onClick={() => window.location.reload()}>
                                    Retry
                                </Button>
                            </div>
                        ) : filteredTransactions.length > 0 ? (
                            <div className="space-y-4">
                                {filteredTransactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between border-b pb-4">
                                        <div>
                                            <p className="font-medium">Invoice #{transaction.invoiceNumber}</p>
                                            <p className="text-sm text-muted-foreground">{transaction.clientName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(transaction.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <p className="text-muted-foreground">No transactions found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default Transactions;