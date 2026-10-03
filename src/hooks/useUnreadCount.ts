import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import notificationService from "../services/notification.service";

const DEFAULT_INTERVAL_MS = 60000;

export type UnreadCounts = {
  total: number;
  errors: number;
  general: number;
};

const EMPTY: UnreadCounts = { total: 0, errors: 0, general: 0 };
const listeners = new Set<(counts: UnreadCounts) => void>();
let current: UnreadCounts = EMPTY;
let inFlight: Promise<UnreadCounts> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;

function toCounts(total: number, errors: number): UnreadCounts {
  const safeTotal = Math.max(0, total);
  const safeErrors = Math.min(Math.max(0, errors), safeTotal);
  return { total: safeTotal, errors: safeErrors, general: safeTotal - safeErrors };
}

function publish(counts: UnreadCounts) {
  current = counts;
  listeners.forEach((listener) => listener(counts));
}

export function refreshUnreadCounts(): Promise<UnreadCounts> {
  if (!inFlight) {
    inFlight = notificationService
      .unreadCounts()
      .then(({ total, errors }) => {
        const counts = toCounts(total, errors);
        publish(counts);
        return counts;
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
    void refreshUnreadCounts();
  }, intervalMs);
}

export function useUnreadCounts(intervalMs = DEFAULT_INTERVAL_MS) {
  const [counts, setCounts] = useState(current);

  useEffect(() => {
    const listener = (next: UnreadCounts) => setCounts(next);
    listeners.add(listener);
    subscriberCount += 1;
    void refreshUnreadCounts();
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
      void refreshUnreadCounts();
    }, [])
  );

  return counts;
}
