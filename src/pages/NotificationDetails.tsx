import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppNotification, getNotification, markNotificationRead } from "@/services/notificationService";

export default function NotificationDetails() {
  const { id } = useParams<{ id: string }>();
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    getNotification(id)
      .then(async ({ notification }) => {
        setNotification(notification);
        if (!notification.readAt) {
          const updated = await markNotificationRead(notification.id);
          setNotification(updated.notification);
        }
      })
      .catch(() => navigate("/notifications", { replace: true }));
  }, [id, navigate]);

  if (!notification) return <div className="flex h-64 items-center justify-center">Loading notification...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" onClick={() => navigate("/notifications")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to notifications
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{notification.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
          <p className="leading-7 text-slate-700">{notification.message}</p>
          {notification.href && (
            <Button onClick={() => navigate(notification.href || "/dashboard")}>Open related item</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
