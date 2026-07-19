import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";

type Notification = {
  id: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const subscribedRef = useRef(false);

  const unreadCount = notifications.filter((n) => !n.leida).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Notification[]>("/notificaciones");
      setNotifications(data);
    } catch {
      // silencioso — el endpoint puede no existir
    }
    setLoading(false);
  }, []);

  const registerPushToken = useCallback(async (token: string) => {
    if (subscribedRef.current) return;
    try {
      await api.post("/notificaciones/subscribe", {
        endpoint: token,
        keys: { p256dh: "", auth: "" },
      });
      subscribedRef.current = true;
    } catch {
      // silencioso
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return { notifications, unreadCount, loading, markAllRead, reload: load, registerPushToken };
}
