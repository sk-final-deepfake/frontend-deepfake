// 상세 페이지 스텁 — API 연동 전 라우팅 동작 확인용
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/site-header"

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/mypage"
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          내 분석 기록으로
        </Link>

        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <h1 className="text-xl font-semibold text-foreground">사건 상세</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            상세 검증 페이지는 추후 구현 예정입니다.
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">{id}</p>
        </div>
      </main>
    </div>
  )
}
