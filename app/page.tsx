import { SiteHeader } from "@/components/site-header"
import { UploadPanel } from "@/components/upload-panel"
import { CapabilitiesSection } from "@/components/capabilities-section"
import { RecentAnalyses } from "@/components/recent-analyses"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      {/* 상단: 사이트 헤더 */}
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 히어로 섹션 / 안내 문구 */}
        <div className="mb-8 flex flex-col gap-3">
          <Badge
            variant="outline"
            className="w-fit gap-1.5 border-primary/30 bg-primary/10 text-primary"
          >
            <Activity className="size-3" aria-hidden="true" />
            시스템 운영 현황: 정상 (Online)
          </Badge>
          <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground sm:text-3xl">
            ForenShield: 디지털 포렌식 분석 플랫폼
          </h1>
          <p className="max-w-3xl text-pretty text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
            딥페이크 탐지 및 미디어 위변조 분석을 위한 통합 대시보드입니다. 
            파일을 업로드하여 즉시 분석을 시작하거나, 최근 활동 내역을 확인하세요.
          </p>
        </div>

        {/* 대시보드 레이아웃: 60(왼쪽) / 40(오른쪽) 구성 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* 왼쪽 영역 (60%): 파일 업로드 패널 */}
          <div className="lg:col-span-3">
            <UploadPanel />
          </div>

          {/* 오른쪽 영역 (40%): 분석 역량 및 최근 내역 */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <CapabilitiesSection />
            <RecentAnalyses />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 dark:text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 ForenShield · Digital Forensic Intelligence</p>
          <div className="flex gap-4">
            <p className="font-mono">보안 등급: 대외비 (Confidential)</p>
            <p className="font-mono text-primary">v1.2.0-stable</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
