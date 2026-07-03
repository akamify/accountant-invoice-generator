import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AppNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";
import { playNotificationSound } from "@/utils/notifications";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousUnread = useRef(0);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    const data = await getNotifications(10);
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    if (previousUnread.current > 0 && data.unreadCount > previousUnread.current) {
      playNotificationSound();
    }
    previousUnread.current = data.unreadCount;
  };

  useEffect(() => {
    loadNotifications().catch(() => undefined);
    const interval = window.setInterval(() => {
      loadNotifications().catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.readAt) await markNotificationRead(notification.id);
    setOpen(false);
    navigate(`/notifications/${notification.id}`);
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    await loadNotifications();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-[4px]">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-red-600 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>Notifications</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleReadAll} disabled={!unreadCount}>
              Mark all read
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {notifications.length ? notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
            className={`w-full rounded-[4px] border p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 ${
                notification.readAt ? "bg-white" : "border-blue-700 bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                </div>
                {!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-[4px] bg-blue-600" />}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
            </button>
          )) : (
          <div className="rounded-[4px] border p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
          )}
        </div>
        <Button variant="outline" onClick={() => { setOpen(false); navigate("/notifications"); }}>
          View all notifications
        </Button>
      </DialogContent>
    </Dialog>
  );
}
