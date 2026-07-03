export type AppNotification = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  href?: string;
  readAt?: string | null;
  createdAt: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export async function getNotifications(limit = 20) {
  return request<{ notifications: AppNotification[]; unreadCount: number }>(`/api/notifications?limit=${limit}`);
}

export async function getNotification(id: string) {
  return request<{ notification: AppNotification }>(`/api/notifications/${id}`);
}

export async function markNotificationRead(id: string) {
  return request<{ notification: AppNotification }>(`/api/notifications/${id}`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return request<{ success: boolean }>("/api/notifications/read-all", { method: "PATCH" });
}
