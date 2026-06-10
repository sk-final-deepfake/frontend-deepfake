"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Users,
  Ticket,
  ScrollText,
  UserCog,
  UserPlus,
  Activity,
  Loader2,
} from "lucide-react"
import { fetchAdminDashboardStats, type AdminDashboardStats } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"

const cards = [
  {
    href: "/admin/users",
    title: "계정 관리",
    description: "전체 사용자 승인·삭제·상태 관리",
    icon: Users,
  },
  {
    href: "/admin/invite-codes",
    title: "생성코드",
    description: "가입용 유효 코드 발급 및 저장",
    icon: Ticket,
  },
  {
    href: "/admin/logs",
    title: "로그 대시보드",
    description: "시스템·CoC 로그 조회 및 필터",
    icon: ScrollText,
  },
  {
    href: "/admin/profile",
    title: "관리자 내 정보",
    description: "관리자 개인정보 수정",
    icon: UserCog,
  },
]

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError("")
      try {
        const response = await fetchAdminDashboardStats()
        setStats(response)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "통계를 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  if (loading) {
    return (
      <main className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!stats) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-destructive">{error || "통계를 불러오지 못했습니다."}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          관리자 대시보드
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          계정, 생성코드, 로그를 한곳에서 관리합니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="size-4" />
            가입 대기
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stats.pendingUsers}명</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            전체 계정
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stats.totalUsers}명</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="size-4" />
            오늘 로그
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stats.todayLogs}건</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ticket className="size-4" />
            미사용 코드
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {stats.unusedInviteCodes}개
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon
          const metric =
            card.href === "/admin/users"
              ? `${stats.totalUsers}명`
              : card.href === "/admin/invite-codes"
                ? `${stats.unusedInviteCodes}개`
                : card.href === "/admin/logs"
                  ? `${stats.todayLogs}건`
                  : "프로필"
          const sub =
            card.href === "/admin/users"
              ? `대기 ${stats.pendingUsers}명`
              : card.href === "/admin/invite-codes"
                ? "미사용 코드"
                : card.href === "/admin/logs"
                  ? `CoC ${stats.cocLogs}건`
                  : "정보 수정"

          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                    <h2 className="font-semibold text-foreground">{card.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">{metric}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
