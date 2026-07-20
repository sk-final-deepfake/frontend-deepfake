"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, ShieldAlert } from "lucide-react"
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from "@/lib/api/notifications"
import { getSession, isMockAuthSession } from "@/lib/auth"
import { cn } from "@/lib/utils"

type SecurityAlertItem = {
  id: number
  title: string
  message: string
  evidenceId?: number | null
  read: boolean
  createdAt: string
}

function toSecurityAlerts(notifications: ApiNotification[]): SecurityAlertItem[] {
  return notifications
    .filter((item) => item.type === "SECURITY_ALERT")
    .map((item) => ({
      id: item.notificationId,
      title: item.title,
      message: item.message,
      evidenceId: item.referenceId,
      read: item.read,
      createdAt: item.createdAt,
    }))
}

export function AdminSecurityAlerts() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<SecurityAlertItem[]>([])

  const load = useCallback(async () => {
    const session = getSession()
    if (!session || isMockAuthSession(session)) {
      setAlerts([])
      return
    }
    try {
      const response = await fetchNotifications(30)
      setAlerts(toSecurityAlerts(response.notifications))
    } catch {
      // keep previous
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const unread = alerts.filter((item) => !item.read).length

  async function handleReadAll() {
    setAlerts((current) => current.map((item) => ({ ...item, read: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      void load()
    }
  }

  async function handleOpen(alert: SecurityAlertItem) {
    setAlerts((current) =>
      current.map((item) => (item.id === alert.id ? { ...item, read: true } : item))
    )
    setOpen(false)
    try {
      await markNotificationRead(alert.id)
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
          void load()
        }}
        className="relative inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        aria-label="보안 경고 알림"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-red-600" />
              <div>
                <p className="text-sm font-bold text-slate-900">보안 경고</p>
                <p className="text-xs text-slate-500">미확인 {unread}건</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleReadAll()}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              모두 읽음
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">보안 경고가 없습니다.</p>
            ) : (
              alerts.map((alert) => {
                const href =
                  alert.evidenceId != null
                    ? `/admin/evidences/${alert.evidenceId}`
                    : "/admin/evidences"
                return (
                  <Link
                    key={alert.id}
                    href={href}
                    onClick={() => void handleOpen(alert)}
                    className={cn(
                      "block border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50",
                      !alert.read && "bg-red-50/80"
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{alert.message}</p>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
