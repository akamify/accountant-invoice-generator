import { useEffect, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function Profile() {
  const { user, settings, updateUser, changePassword, resetPassword, reloadUser } = useAuth();
  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    currency: "INR",
    invoicePrefix: "INV",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || "",
        companyEmail: settings.companyEmail || "",
        companyPhone: settings.companyPhone || "",
        companyAddress: settings.companyAddress || "",
        currency: settings.currency || "INR",
        invoicePrefix: settings.invoicePrefix || "INV",
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleSecurityToggle = async (checked: boolean) => {
    await apiRequest("/api/settings/security", {
      method: "PATCH",
      body: JSON.stringify({ loginOtpEnabled: checked }),
    });
    await reloadUser();
    toast.success("Security settings updated");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    await changePassword(currentPassword, newPassword);
    setCurrentPassword("");
    setNewPassword("");
  };

  const requestEmailChange = async () => {
    await apiRequest("/api/settings/request-email-change", {
      method: "POST",
      body: JSON.stringify({ newEmail }),
    });
    toast.success("OTP sent to new email");
  };

  const verifyEmailChange = async () => {
    await apiRequest("/api/settings/verify-email-change", {
      method: "POST",
      body: JSON.stringify({ newEmail, otp: emailOtp }),
    });
    setNewEmail("");
    setEmailOtp("");
    await reloadUser();
    toast.success("Admin email changed");
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage company profile and admin security.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            <Field label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} />
            <Field label="Company Email" name="companyEmail" type="email" value={formData.companyEmail} onChange={handleChange} />
            <Field label="Company Phone" name="companyPhone" value={formData.companyPhone} onChange={handleChange} />
            <Field label="Invoice Prefix" name="invoicePrefix" value={formData.invoicePrefix} onChange={handleChange} />
            <Field label="Currency" name="currency" value={formData.currency} onChange={handleChange} />
            <Field label="Company Address" name="companyAddress" value={formData.companyAddress} onChange={handleChange} className="md:col-span-2" />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">Login OTP Verification</p>
              <p className="text-sm text-muted-foreground">Send an OTP to admin email after password verification.</p>
            </div>
            <Switch checked={Boolean(settings?.loginOtpEnabled)} onCheckedChange={handleSecurityToggle} />
          </div>

          <form onSubmit={handlePasswordChange} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <Input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
            <Button type="submit">Change Password</Button>
          </form>

          <Button variant="outline" onClick={resetPassword}>Send Password Reset Link</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Admin Email</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Current admin email: {user.email}</p>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Input type="email" placeholder="New admin email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Button type="button" variant="outline" onClick={requestEmailChange} disabled={!newEmail}>Send OTP</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Input placeholder="OTP from new email" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} />
            <Button type="button" onClick={verifyEmailChange} disabled={!newEmail || !emailOtp}>Verify Email Change</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className={`space-y-2 ${className || ""}`}>
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} {...props} />
    </div>
  );
}
