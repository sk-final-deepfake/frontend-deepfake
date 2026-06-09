// 담당: 윤형진
// 역할: 마이페이지 및 분석 기록 화면 구현
import { SiteHeader } from "@/components/site-header"
import { CaseHistorySection } from "@/app/mypage/_components/case-history-section"
import { mockCases } from "@/app/mypage/_data/mock-cases"

export default function MyPage() {
  // TODO: API 연동 시 GET /api/v1/cases/me 로 교체
  const cases = mockCases

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            내 분석 기록
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            내가 요청한 포렌식 분석 사건을 확인하고 추적합니다.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-card-foreground">
                분석 기록 목록
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                총 {cases.length}건
              </p>
            </div>
          </div>

          <CaseHistorySection cases={cases} />
        </section>
      </main>
    </div>
  )
}
