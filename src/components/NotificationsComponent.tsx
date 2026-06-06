/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Notification as AppNotification } from "../types";
import { 
  Bell, BellOff, CheckCircle2, AlertTriangle, Briefcase, 
  Sparkles, Check, Trash2, MailOpen, Calendar, CircleDot 
} from "lucide-react";

interface NotificationsComponentProps {
  userId: string;
}

export default function NotificationsComponent({ userId }: NotificationsComponentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  const fetchNotifs = async () => {
    try {
      setLoading(false); // Make state change fast
      setError(null);
      const list = await api.getNotifications(userId);
      setNotifs(list);
    } catch {
      setError("Failed to stream notification database updates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [userId]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markAsRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {
      setError("Could not update status.");
    }
  };

  const handleClearAll = async () => {
    try {
      // Direct update read in memory
      for (const n of notifs) {
        if (!n.isRead) {
          await api.markAsRead(n.id);
        }
      }
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      setError("Failed updating notifications parameters.");
    }
  };

  const getNotifUI = (notif: AppNotification) => {
    let icon = <Bell className="h-4.5 w-4.5 text-blue-900" />;
    let bg = "bg-blue-50/20 hover:bg-blue-50/50";
    
    // Evaluate type keyword matching
    const txt = notif.content.toLowerCase();
    
    if (txt.includes("match") || txt.includes("scan")) {
      icon = <Sparkles className="h-4.5 w-4.5 text-indigo-700" />;
      bg = "bg-indigo-50/20 hover:bg-slate-50";
    } else if (txt.includes("claim") || txt.includes("approved") || txt.includes("releas")) {
      icon = <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />;
      bg = "bg-emerald-50/15 hover:bg-slate-50";
    } else if (txt.includes("intern") || txt.includes("opportunity") || txt.includes("publish")) {
      icon = <Briefcase className="h-4.5 w-4.5 text-blue-900" />;
      bg = "bg-blue-50/20 hover:bg-slate-50";
    } else if (txt.includes("critical") || txt.includes("suspend") || txt.includes("flag")) {
      icon = <AlertTriangle className="h-4.5 w-4.5 text-amber-600 animate-bounce" />;
      bg = "bg-amber-50/20 hover:bg-slate-50";
    }

    return { icon, bg };
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;

  if (loading && notifs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[150px]">
        <span className="text-slate-400 font-medium text-xs">Awaiting alert signals...</span>
      </div>
    );
  }

  return (
    <div id="notifications_dock_root" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 font-sans text-slate-800">
      
      {/* Header bar controls */}
      <div className="flex justify-between items-center border-b border-slate-50 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bell className="h-5.5 w-5.5 text-blue-950 shrink-0" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-650 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-md font-bold text-slate-900">Institutional Announcements & Notifications</h3>
            <p className="text-xs text-slate-400">Targeted match warnings, administrative claims updates, and careers drives.</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border rounded-xl cursor-pointer"
          >
            <MailOpen className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <p className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</p>
      )}

      {/* Lists alerts */}
      {notifs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 space-y-2">
          <BellOff className="h-9 w-9 text-slate-300 mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-slate-805 text-slate-850 text-slate-800">Your bulletin is clean</p>
          <p className="text-[11px] text-slate-400">Once active matches operate, we will stream notifications directly to your terminal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => {
            const { icon, bg } = getNotifUI(n);
            return (
              <div 
                key={n.id} 
                className={`p-4 rounded-2xl border transition-colors flex items-start gap-3.5 justify-between ${bg} ${n.isRead ? "border-slate-100/65 opacity-75" : "border-slate-200"}`}
              >
                
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`h-8 w-8 rounded-xl bg-white border border-slate-150 shadow-xs flex items-center justify-center shrink-0`}>
                    {icon}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${n.isRead ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                      {n.content}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-sans">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Mark read toggle */}
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-1 px-2 border rounded-lg bg-white hover:bg-slate-100 text-blue-900 text-[10px] font-bold shrink-0 cursor-pointer flex items-center gap-1"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3 text-blue-900" />
                    Read
                  </button>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
