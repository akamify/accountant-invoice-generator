import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type AdminUser = {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  loginOtpEnabled: boolean;
  company?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  address?: string;
  phone?: string;
  companyPanNumber?: string;
  companyGstNumber?: string;
};

export type AppSettings = {
  _id?: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyAddress?: string;
  companyPanNumber?: string;
  companyGstNumber?: string;
  logoUrl?: string;
  currency: string;
  invoicePrefix: string;
  loginOtpEnabled: boolean;
};

type LoginResult = {
  requiresOtp?: boolean;
};

type AuthContextType = {
  user: AdminUser | null;
  currentUser: AdminUser | null;
  settings: AppSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  login: (password: string) => Promise<LoginResult>;
  verifyLoginOtp: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: () => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUser: (data: Partial<AppSettings>) => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  const response = await fetch(path, {
    credentials: "include",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  }).finally(() => window.clearTimeout(timeout));
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function mapAdmin(admin: any, settings?: AppSettings | null): AdminUser {
  return {
    id: admin.id,
    uid: admin.id,
    email: admin.email,
    displayName: settings?.companyName || "Admin",
    emailVerified: true,
    loginOtpEnabled: Boolean(admin.loginOtpEnabled),
    company: settings?.companyName || "",
    companyName: settings?.companyName || "",
    companyEmail: settings?.companyEmail || admin.email,
    companyPhone: settings?.companyPhone || "",
    companyAddress: settings?.companyAddress || "",
    address: settings?.companyAddress || "",
    phone: settings?.companyPhone || "",
    companyPanNumber: settings?.companyPanNumber || "",
    companyGstNumber: settings?.companyGstNumber || "",
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((admin: any, nextSettings: AppSettings | null) => {
    setSettings(nextSettings);
    setUser(admin ? mapAdmin(admin, nextSettings) : null);
  }, []);

  const reloadUser = useCallback(async () => {
    const data = await apiRequest<{ admin: any; settings: AppSettings }>("/api/auth/me");
    applySession(data.admin, data.settings);
  }, [applySession]);

  useEffect(() => {
    let mounted = true;
    apiRequest<{ admin: any; settings: AppSettings }>("/api/auth/me")
      .then((data) => {
        if (mounted) applySession(data.admin, data.settings);
      })
      .catch(() => {
        if (mounted) applySession(null, null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [applySession]);

  const login = async (password: string): Promise<LoginResult> => {
    const data = await apiRequest<{ success: boolean; requiresOtp?: boolean; admin?: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (data.requiresOtp) {
      toast.success("OTP sent to admin email");
      return { requiresOtp: true };
    }
    await reloadUser();
    toast.success("Successfully logged in");
    return {};
  };

  const verifyLoginOtp = async (otp: string) => {
    await apiRequest("/api/auth/verify-login-otp", {
      method: "POST",
      body: JSON.stringify({ otp }),
    });
    await reloadUser();
    toast.success("OTP verified");
  };

  const logout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" });
    applySession(null, null);
    toast.success("Successfully logged out");
  };

  const resetPassword = async () => {
    await apiRequest("/api/auth/request-password-reset", { method: "POST" });
    toast.success("Password reset link sent to admin email");
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    await apiRequest("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
    applySession(null, null);
    toast.success("Password reset successfully");
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await apiRequest("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    toast.success("Password changed successfully");
  };

  const updateUser = async (data: Partial<AppSettings>) => {
    await apiRequest("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    await reloadUser();
    toast.success("Settings updated successfully");
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    currentUser: user,
    settings,
    isAuthenticated: Boolean(user),
    isLoading,
    isEmailVerified: true,
    login,
    verifyLoginOtp,
    logout,
    resetPassword,
    confirmPasswordReset,
    changePassword,
    updateUser,
    reloadUser,
  }), [user, settings, isLoading, reloadUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
