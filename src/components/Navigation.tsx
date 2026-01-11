import { useAuth } from "@/contexts/AuthContext";
// import { ThemeSwitcher } from "./ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Plus, User, LayoutDashboard, FileText, CreditCard, Receipt, FileBarChart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navigation() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="sticky top-0 z-30 w-full backdrop-blur-lg bg-background/90 border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-full p-1 bg-gradient-to-tr from-primary to-accent">
              <div className="rounded-full bg-background p-1">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
            <span className="font-bold text-xl">Glow Invoice</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* <ThemeSwitcher /> */}

          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => navigate('/invoices/new')}
                >
                  <Plus size={16} />
                  New Invoice
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => navigate('/quotations/new')}
                >
                  <FileBarChart size={16} />
                  New Quotation
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user?.displayName || 'User'} />
                      <AvatarFallback>{getUserInitials(user?.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/payments')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Payments</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/transactions')}>
                    <Receipt className="mr-2 h-4 w-4" />
                    <span>Transactions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/quotations')}>
                    <FileBarChart className="mr-2 h-4 w-4" />
                    <span>Quotations</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Sign up
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}