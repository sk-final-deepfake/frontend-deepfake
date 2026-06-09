import { SiteHeader } from "@/components/site-header"
import { UploadPanel } from "@/components/upload-panel"
import { CapabilitiesSection } from "@/components/capabilities-section"
import { RecentAnalyses } from "@/components/recent-analyses"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
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
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            딥페이크 및 디지털 미디어 위변조 분석
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            음성·영상·이미지 증거물의 합성 및 편집 흔적을 자동으로 탐지하고,
            법정 제출용 분석 보고서를 생성하는 수사관 보조 플랫폼입니다.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <UploadPanel />
            <CapabilitiesSection />
          </div>
          <div className="lg:col-span-1">
            <RecentAnalyses />
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>VeriForensics · 디지털 미디어 인증 시스템 v1.0</p>
          <p className="font-mono">내부망 전용 · 외부 반출 금지</p>
        </div>
      </footer>
    </div>
  )
}
