// 담당: 나중
// 역할: 관리자 대시보드 허브
import Link from "next/link"
import {
  Users,
  Ticket,
  ScrollText,
  UserCog,
  UserPlus,
  Activity,
} from "lucide-react"
import {
  MOCK_ADMIN_LOGS,
  MOCK_ADMIN_USERS,
  MOCK_INVITE_CODES,
} from "@/app/admin/_data/mock-admin"

const cards = [
  {
    href: "/admin/users",
    title: "계정 관리",
    description: "전체 사용자 승인·삭제·상태 관리",
    icon: Users,
    metric: `${MOCK_ADMIN_USERS.length}명`,
    sub: `대기 ${MOCK_ADMIN_USERS.filter((u) => u.status === "PENDING").length}명`,
  },
  {
    href: "/admin/invite-codes",
    title: "생성코드",
    description: "가입용 유효 코드 발급 및 저장",
    icon: Ticket,
    metric: `${MOCK_INVITE_CODES.filter((c) => c.status === "UNUSED").length}개`,
    sub: "미사용 코드",
  },
  {
    href: "/admin/logs",
    title: "로그 대시보드",
    description: "시스템·CoC 로그 조회 및 필터",
    icon: ScrollText,
    metric: `${MOCK_ADMIN_LOGS.length}건`,
    sub: `CoC ${MOCK_ADMIN_LOGS.filter((l) => l.category === "COC").length}건`,
  },
  {
    href: "/admin/profile",
    title: "관리자 내 정보",
    description: "관리자 개인정보 수정",
    icon: UserCog,
    metric: "프로필",
    sub: "정보 수정",
  },
]

export default function AdminDashboardPage() {
  const pendingCount = MOCK_ADMIN_USERS.filter((u) => u.status === "PENDING").length
  const todayLogs = MOCK_ADMIN_LOGS.filter((l) => l.timestamp.startsWith("2026-06-09")).length

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
          <p className="mt-2 text-2xl font-semibold text-foreground">{pendingCount}명</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            전체 계정
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {MOCK_ADMIN_USERS.length}명
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="size-4" />
            오늘 로그
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{todayLogs}건</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ticket className="size-4" />
            미사용 코드
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {MOCK_INVITE_CODES.filter((c) => c.status === "UNUSED").length}개
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon
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
                  <p className="text-lg font-semibold text-foreground">{card.metric}</p>
                  <p className="text-xs text-muted-foreground">{card.sub}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
