import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (requiresOtp) {
        await verifyLoginOtp(otp);
        navigate("/dashboard", { replace: true });
        return;
      }

      const result = await login(password);
      if (result.requiresOtp) {
        setRequiresOtp(true);
        return;
      }
      navigate("/dashboard", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          {!requiresOtp ? (
            <div className="grid gap-1">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                placeholder="Enter admin password"
                type="password"
                autoComplete="current-password"
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-1">
              <Label htmlFor="otp">Login OTP</Label>
              <Input
                id="otp"
                placeholder="Enter 6-digit OTP"
                inputMode="numeric"
                disabled={isLoading}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : requiresOtp ? "Verify OTP" : "Sign In"}
          </Button>
        </div>
      </form>
    </div>
  );
}
