import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";

export default function Notifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    const data = await getNotifications(100);
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) await markNotificationRead(notification.id);
    navigate(`/notifications/${notification.id}`);
  };

  const readAll = async () => {
    await markAllNotificationsRead();
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p>
        </div>
        <Button variant="outline" onClick={readAll} disabled={!unreadCount}>Mark all read</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Notification List</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {notifications.length ? notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => openNotification(notification)}
              className={`w-full rounded-[4px] border p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 ${
                notification.readAt ? "bg-white" : "border-blue-700 bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
                {!notification.readAt && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[4px] bg-blue-600" />}
              </div>
            </button>
          )) : (
            <div className="rounded-[4px] border p-8 text-center text-muted-foreground">No notifications yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
