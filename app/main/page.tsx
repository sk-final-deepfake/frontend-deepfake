// 담당: 이새연
// 역할: 메인페이지 및 파일 업로드 화면 (클론 디자인 기반)
import { SiteHeader } from "@/components/site-header"
import { UploadPanel } from "@/components/upload-panel"
import { CapabilitiesSection } from "@/components/capabilities-section"
import { RecentAnalyses } from "@/components/recent-analyses"
import { MetadataInfo } from "@/components/metadata-info"
import { Badge } from "@/components/ui/badge"
import { Activity, LayoutDashboard, History } from "lucide-react"

export default function MainPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <Badge
            variant="outline"
            className="w-fit gap-1.5 border-primary/30 bg-primary/10 text-primary"
          >
            <Activity className="size-3" aria-hidden="true" />
            포렌식 분석 시스템 · 정상 운영 중
          </Badge>
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            디지털 미디어 위변조 분석 대시보드
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            첨단 AI 모델을 활용하여 미디어 증거물의 무결성을 검증합니다.
            업로드된 파일은 안전하게 분석되며, 결과 보고서를 즉시 확인할 수 있습니다.
          </p>
        </div>

        {/* 분석 기록 섹션 타이틀 */}
        <div className="mb-6 flex items-center gap-2 border-b border-border pb-2">
          <History className="size-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">분석 기록 및 새 분석 시작</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* 왼쪽 영역 (60%) */}
          <div className="space-y-8 lg:col-span-2">
            <UploadPanel />
            <CapabilitiesSection />
          </div>

          {/* 오른쪽 영역 (40%): 메타데이터 정보 + 최근 분석 내역 */}
          <div className="space-y-6 lg:col-span-1">
            <MetadataInfo />
            <RecentAnalyses />
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-white dark:bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>VeriForensics · 디지털 미디어 인증 시스템 v1.0</p>
          <p className="font-mono">내부망 전용 · 외부 반출 금지</p>
        </div>
      </footer>
    </div>
  )
}
