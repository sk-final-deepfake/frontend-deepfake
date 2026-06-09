// 담당: 나중
// 역할: 관리자 승인 및 CoC 로그 화면 구현
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"

// 화면 테스트용 더미 데이터 (추후 adminApi 연동 예정)
const pendingUsers = [
  { id: 1, username: "hong", email: "hong@example.com", requestedAt: "2026-06-01" },
  { id: 2, username: "kim", email: "kim@example.com", requestedAt: "2026-06-02" },
  { id: 3, username: "lee", email: "lee@example.com", requestedAt: "2026-06-03" },
]

const cocLogs = [
  { id: 1, timestamp: "2026-06-05 10:21", actor: "admin", action: "증거 업로드" },
  { id: 2, timestamp: "2026-06-05 10:25", actor: "system", action: "분석 요청" },
  { id: 3, timestamp: "2026-06-05 10:30", actor: "system", action: "분석 완료" },
  { id: 4, timestamp: "2026-06-05 10:32", actor: "admin", action: "결과 확인" },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">관리자</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            가입 승인 및 CoC(Chain of Custody) 로그를 관리합니다.
          </p>
        </div>

        {/* 가입 승인 대기 목록 */}
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-card-foreground">가입 승인 대기 목록</h2>
          </div>
          <ul className="divide-y divide-border">
            {pendingUsers.map((user) => (
              <li key={user.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{user.username}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {user.email} · {user.requestedAt}
                  </p>
                </div>
                {/* TODO: adminApi.approveUser() / rejectUser() 연동 예정 */}
                <div className="flex gap-2">
                  <Button size="sm">승인</Button>
                  <Button size="sm" variant="destructive">거절</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* CoC 로그 조회 */}
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-card-foreground">CoC 로그 조회</h2>
          </div>
          <ul className="divide-y divide-border">
            {cocLogs.map((log) => (
              <li key={log.id} className="flex items-center gap-4 px-5 py-3 font-mono text-xs">
                <span className="text-muted-foreground">{log.timestamp}</span>
                <span className="text-primary">{log.actor}</span>
                <span className="text-foreground">{log.action}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
