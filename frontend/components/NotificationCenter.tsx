"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { getSplitsForWallet, type SplitRecord } from "@/lib/split-contract";

type NotificationContextValue = {
  assignments: SplitRecord[];
  open: boolean;
  unread: number;
  toggle: () => void;
  close: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function storageKey(address: string) {
  return `split-viewed-assignments:${address}`;
}

function readViewed(address: string): Set<number> {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey(address)) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id)) : []);
  } catch {
    return new Set();
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [assignments, setAssignments] = useState<SplitRecord[]>([]);
  const [viewed, setViewed] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<SplitRecord | null>(null);
  const initialized = useRef(false);
  const previousIds = useRef<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const records = (await getSplitsForWallet(address, 50))
        .filter((split) => split.creator !== address);

      if (initialized.current) {
        const newAssignment = records.find((split) => !previousIds.current.has(split.id));
        if (newAssignment) setToast(newAssignment);
      }

      previousIds.current = new Set(records.map((split) => split.id));
      initialized.current = true;
      setAssignments(records);
    } catch {
      // Notifications should never interrupt the primary payment flow.
    }
  }, [address]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      initialized.current = false;
      previousIds.current = new Set();
      setAssignments([]);
      setOpen(false);
      setToast(null);
      setViewed(address ? readViewed(address) : new Set());
      if (address) void load();
    }, 0);
    const interval = address ? window.setInterval(() => void load(), 30_000) : null;
    const onFocus = () => void load();
    if (address) window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [address, load]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const unread = useMemo(
    () => assignments.filter((split) => !viewed.has(split.id)).length,
    [assignments, viewed],
  );

  const markViewed = useCallback(() => {
    if (!address || assignments.length === 0) return;
    const next = new Set(viewed);
    assignments.forEach((split) => next.add(split.id));
    setViewed(next);
    window.localStorage.setItem(storageKey(address), JSON.stringify(Array.from(next)));
  }, [address, assignments, viewed]);

  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current;
      if (next) markViewed();
      return next;
    });
  }, [markViewed]);

  const value = useMemo(() => ({ assignments, open, unread, toggle, close: () => setOpen(false) }), [assignments, open, unread, toggle]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toast && <div className="assignment-toast" role="status">
        <span aria-hidden="true">✦</span>
        <div><strong>New Split assigned</strong><p>{toast.title}</p></div>
        <Link href={`/split/${toast.id}`} onClick={() => setToast(null)}>View →</Link>
      </div>}
    </NotificationContext.Provider>
  );
}

export function NotificationBell() {
  const { address } = useWallet();
  const notifications = useContext(NotificationContext);

  if (!address || !notifications) return null;

  return (
    <div className="notification-control">
      <button
        className="notification-bell"
        type="button"
        aria-label={notifications.unread ? `Notifications, ${notifications.unread} unread` : "Notifications"}
        aria-expanded={notifications.open}
        onClick={notifications.toggle}
      >
        <span aria-hidden="true">♢</span>
        {notifications.unread > 0 && <b>{notifications.unread > 9 ? "9+" : notifications.unread}</b>}
      </button>
      {notifications.open && <div className="notification-panel">
        <div className="notification-panel-heading"><div><p className="eyebrow">Assignments</p><strong>Your notifications</strong></div><button type="button" onClick={notifications.close} aria-label="Close notifications">×</button></div>
        {notifications.assignments.length === 0
          ? <p className="notification-empty">No Splits have been assigned to this wallet yet.</p>
          : <div className="notification-list">{notifications.assignments.slice(0, 6).map((split) => <Link href={`/split/${split.id}`} key={split.id} onClick={notifications.close}>
              <span className="notification-mark" aria-hidden="true">{split.status === "Completed" ? "✓" : split.id}</span>
              <span><strong>{split.title}</strong><small>Split #{split.id} · {split.status}</small></span>
              <i aria-hidden="true">↗</i>
            </Link>)}</div>}
        <p className="notification-footnote">Checked automatically every 30 seconds while Split is open.</p>
      </div>}
    </div>
  );
}
