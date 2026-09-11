import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import notificationService from "../services/notification.service";

const DEFAULT_INTERVAL_MS = 60000;
const listeners = new Set<(count: number) => void>();
let current = 0;
let inFlight: Promise<number> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;

async function fetchUnread(): Promise<number> {
  if (!inFlight) {
    inFlight = notificationService
      .unreadCount()
      .then((count) => {
        current = count;
        listeners.forEach((listener) => listener(count));
        return count;
      })
      .catch(() => current)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

function ensureTimer(intervalMs: number) {
  if (timer) {
    return;
  }
  timer = setInterval(() => {
    void fetchUnread();
  }, intervalMs);
}

export function useUnreadCount(intervalMs = DEFAULT_INTERVAL_MS) {
  const [unread, setUnread] = useState(current);

  useEffect(() => {
    const listener = (count: number) => setUnread(count);
    listeners.add(listener);
    subscriberCount += 1;
    void fetchUnread();
    ensureTimer(intervalMs);
    return () => {
      listeners.delete(listener);
      subscriberCount -= 1;
      if (subscriberCount === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [intervalMs]);

  useFocusEffect(
    useCallback(() => {
      void fetchUnread();
    }, [])
  );

  return unread;
}
