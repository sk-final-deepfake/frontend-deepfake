import { FileText } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-bold text-teal-600">Reports</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">보고서</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            분석 결과에서 생성한 최종 보고서를 모아보는 화면입니다.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card px-6 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-bold text-card-foreground">생성된 보고서가 없습니다</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            사건 상세의 분석 결과 화면에서 보고서를 생성하면 이곳에 표시됩니다.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
