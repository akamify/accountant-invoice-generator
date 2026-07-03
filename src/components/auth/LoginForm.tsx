import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          {!requiresOtp ? (
            <div className="grid gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Admin Password
                </Label>

                <div className="relative">
                  <Input
                    id="password"
                    placeholder="Enter admin password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 rounded-[4px] pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="otp" className="text-sm font-medium">
                Login OTP
              </Label>

              <Input
                id="otp"
                placeholder="Enter 6-digit OTP"
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isLoading}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="h-10 rounded-[4px]"
              />
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="h-10 rounded-[4px]">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : requiresOtp ? (
              "Verify OTP"
            ) : (
              "Sign In"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}