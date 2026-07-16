import { useState, useEffect, useCallback } from "react";

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

  const unreadCount = notifications.filter((n) => !n.leida).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotifications([
        { id: 1, tipo: "examen", mensaje: "Parcial 1 de Física 3 mañana a las 08:00", leida: false, fecha: "2026-07-15" },
        { id: 2, tipo: "nota", mensaje: "Se cargó tu nota del Parcial 2 de Programación I", leida: false, fecha: "2026-07-14" },
        { id: 3, tipo: "asistencia", mensaje: "Asistencia registrada en Matemática I", leida: true, fecha: "2026-07-13" },
      ]);
    } catch {
      // silencioso
    }
    setLoading(false);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return { notifications, unreadCount, loading, markAllRead, reload: load };
}
