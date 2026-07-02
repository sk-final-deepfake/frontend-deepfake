"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  GitCompare,
  ImageOff,
  Loader2,
} from "lucide-react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  downloadCompareReport,
  fetchCompareResult,
  type CompareItem,
  type CompareItemResult,
  type CompareResult,
  type CompareVerdict,
} from "@/lib/api/compare"
import { getApiErrorMessage } from "@/lib/api/errors"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export default function CompareReportPage() {
  const params = useParams()
  const router = useRouter()
  const compareIdParam = Array.isArray(params.compareId) ? params.compareId[0] : params.compareId
  const compareId = Number(compareIdParam)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      if (!Number.isFinite(compareId) || compareId <= 0) {
        setError("올바른 비교검증 리포트 주소가 아닙니다.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchCompareResult(compareId)
        if (!cancelled) setResult(data)
      } catch (error) {
        if (!cancelled) {
          setError(getApiErrorMessage(error, "비교검증 리포트를 불러오지 못했습니다."))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadReport()

    return () => {
      cancelled = true
    }
  }, [compareId])

  async function handleDownloadReport() {
    if (!result) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      const blob = await downloadCompareReport(result.compareId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `compare-report-${result.compareId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(getApiErrorMessage(error, "PDF 리포트 다운로드에 실패했습니다."))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-7 sm:px-8 lg:px-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          이전 화면
        </button>

        {isLoading ? (
          <ReportStateCard>
            <Loader2 className="size-9 animate-spin text-slate-500" aria-hidden="true" />
            <p className="text-sm font-bold text-muted-foreground">비교검증 리포트를 불러오는 중입니다.</p>
          </ReportStateCard>
        ) : error ? (
          <ReportStateCard>
            <AlertCircle className="size-9 text-amber-600" aria-hidden="true" />
            <div className="space-y-2 text-center">
              <p className="text-base font-bold text-foreground">리포트를 열 수 없습니다.</p>
              <p className="text-sm font-semibold text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" className="h-10 rounded-lg px-4 font-bold" onClick={() => router.push("/compare")}>
              새 비교검증
            </Button>
          </ReportStateCard>
        ) : result ? (
          <CompareReport result={result} isDownloading={isDownloading} onDownload={handleDownloadReport} />
        ) : null}

        {downloadError ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {downloadError}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}

function CompareReport({
  result,
  isDownloading,
  onDownload,
}: {
  result: CompareResult
  isDownloading: boolean
  onDownload: () => void
}) {
  const verdict = getVerdictDisplay(result.verdict, result.summary.verdictLabel)
  const hashItems = result.items.filter(isHashItem)
  const comparisonItems = result.items.filter((item) => !isHashItem(item))
  const visibleComparisonItems = comparisonItems.length > 0 ? comparisonItems : result.items

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500">Compare Report</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">비교검증 리포트</h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              기준 증거와 비교 대상 파일의 검증 결과를 저장된 기록으로 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg px-4 font-bold"
              onClick={onDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {isDownloading ? "PDF 생성 중" : "PDF 다운로드"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReportMetric label="Compare ID" value={`CMP-${result.compareId}`} />
          <ReportMetric label="기준 증거" value={`EVD-${result.originalEvidenceId}`} />
          <ReportMetric label="비교 대상" value={result.candidateFileName} />
          <ReportMetric label="수행 일시" value={formatDateTime(result.createdAt)} />
        </div>
      </section>

      <section className={cn("rounded-xl border p-5 shadow-sm", verdict.containerClassName)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/70">
              {verdict.icon}
            </span>
            <div>
              <p className="text-xl font-bold">{verdict.title}</p>
              <p className="mt-1 max-w-2xl text-sm font-semibold opacity-80">{verdict.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SummaryPill label="일치" value={String(result.summary.matchCount)} />
            <SummaryPill label="차이" value={String(result.summary.mismatchCount)} />
            <SummaryPill label="제외" value={String(result.summary.skippedCount)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ReportCard title="기준 증거와 비교 대상" icon={<GitCompare className="size-5 text-slate-500" aria-hidden="true" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <TargetSummaryCard
              title="기준 증거"
              rows={[
                ["증거 ID", `EVD-${result.originalEvidenceId}`],
                ["파일 유형", "-"],
                ["재생 시간", "-"],
                ["해상도", "-"],
              ]}
            />
            <TargetSummaryCard
              title="비교 대상 파일"
              rows={[
                ["파일명", result.candidateFileName],
                ["파일 유형", getFileTypeFromName(result.candidateFileName)],
                ["재생 시간", "-"],
                ["해상도", "-"],
              ]}
            />
          </div>
        </ReportCard>

        <ReportCard title="차이 구간" icon={<FileText className="size-5 text-slate-500" aria-hidden="true" />}>
          <EmptyReportBlock
            title="구간 단위 차이 정보가 없습니다."
            description="현재 백엔드 응답은 항목별 비교 결과만 제공합니다. 차이 구간 데이터가 추가되면 타임라인으로 표시합니다."
          />
        </ReportCard>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ReportCard title="대표 프레임" icon={<ImageOff className="size-5 text-slate-500" aria-hidden="true" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FramePlaceholder label="기준 프레임" />
            <FramePlaceholder label="비교 프레임" />
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
            백엔드에서 대표 프레임 URL을 제공하면 이 영역에 실제 프레임 이미지를 표시합니다.
          </p>
        </ReportCard>

        <ReportCard title="파일 단위 동일성 참고" icon={<FileCheck2 className="size-5 text-slate-500" aria-hidden="true" />}>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
            SHA-256 같은 해시값은 바이트 단위 파일 동일성 확인용입니다. 전송, 재인코딩, 컨테이너 변경으로 값이 달라질 수
            있으며, 내용 기준 비교 판정과 별도로 해석해야 합니다.
          </p>
          {hashItems.length > 0 ? (
            <div className="mt-3 space-y-2">
              {hashItems.map((item) => (
                <CompactCompareRow key={item.itemKey} item={item} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-muted-foreground">해시 비교 항목이 제공되지 않았습니다.</p>
          )}
        </ReportCard>
      </section>

      <ReportCard title="항목별 비교 결과" icon={<GitCompare className="size-5 text-slate-500" aria-hidden="true" />}>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">항목</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">기준 증거</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">비교 대상</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">결과</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {visibleComparisonItems.map((item) => (
                <tr key={item.itemKey} className={getItemRowClassName(item.result)}>
                  <td className="px-4 py-3 font-bold text-foreground">{item.label}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 font-semibold text-muted-foreground">
                    {item.originalValue || "-"}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3 font-semibold text-muted-foreground">
                    {item.candidateValue || "-"}
                  </td>
                  <td className="px-4 py-3 font-bold">{getCompareItemResultLabel(item.result)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportCard>

      <ReportCard title="기술 및 감사 정보" icon={<FileText className="size-5 text-slate-500" aria-hidden="true" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AuditInfo label="Compare ID" value={String(result.compareId)} />
          <AuditInfo label="기준 증거 ID" value={String(result.originalEvidenceId)} />
          <AuditInfo label="수행자" value="-" />
          <AuditInfo label="알고리즘 버전" value="-" />
        </div>
      </ReportCard>
    </div>
  )
}

function ReportStateCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[48vh] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8 shadow-sm">
      {children}
    </div>
  )
}

function ReportCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-foreground">{value || "-"}</p>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-lg bg-white/65 px-3 py-2">
      <p className="text-xs font-bold opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  )
}

function TargetSummaryCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-t border-border pt-2">
            <dt className="shrink-0 text-xs font-bold text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-right text-sm font-bold text-foreground">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function EmptyReportBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function FramePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-background">
      <div className="text-center">
        <ImageOff className="mx-auto size-6 text-slate-400" aria-hidden="true" />
        <p className="mt-2 text-xs font-bold text-muted-foreground">{label} 없음</p>
      </div>
    </div>
  )
}

function CompactCompareRow({ item }: { item: CompareItem }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground">{item.label}</p>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", getResultBadgeClassName(item.result))}>
          {getCompareItemResultLabel(item.result)}
        </span>
      </div>
      <div className="mt-2 grid gap-2 text-xs font-semibold text-muted-foreground sm:grid-cols-2">
        <p className="truncate">기준: {item.originalValue || "-"}</p>
        <p className="truncate">비교: {item.candidateValue || "-"}</p>
      </div>
    </div>
  )
}

function AuditInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{value || "-"}</p>
    </div>
  )
}

function getVerdictDisplay(verdict: CompareVerdict, verdictLabel: string) {
  if (verdict === "ORIGINAL_MATCH") {
    return {
      title: verdictLabel || "내용 기준 일치",
      description: "비교 가능한 항목이 기준 증거와 일치합니다.",
      containerClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="size-6 text-emerald-700" aria-hidden="true" />,
    }
  }

  if (verdict === "TAMPERED") {
    return {
      title: verdictLabel || "내용 기준 차이 확인",
      description: "비교 가능한 항목에서 기준 증거와 다른 값이 확인되었습니다.",
      containerClassName: "border-amber-200 bg-amber-50 text-amber-700",
      icon: <AlertCircle className="size-6 text-amber-700" aria-hidden="true" />,
    }
  }

  return {
    title: verdictLabel || "검증 불가",
    description: "데이터가 부족하거나 일부 항목만 비교되어 판정을 보류했습니다.",
    containerClassName: "border-slate-200 bg-slate-50 text-slate-700",
    icon: <AlertCircle className="size-6 text-slate-600" aria-hidden="true" />,
  }
}

function getCompareItemResultLabel(result: CompareItemResult) {
  const labels: Record<CompareItemResult, string> = {
    MATCH: "일치",
    MISMATCH: "차이 확인",
    SKIPPED: "제외",
  }

  return labels[result]
}

function getItemRowClassName(result: CompareItemResult) {
  if (result === "MISMATCH") return "bg-amber-50/70 text-amber-700"
  if (result === "SKIPPED") return "bg-slate-50 text-slate-500"
  return ""
}

function getResultBadgeClassName(result: CompareItemResult) {
  if (result === "MISMATCH") return "bg-amber-100 text-amber-700"
  if (result === "SKIPPED") return "bg-slate-100 text-slate-600"
  return "bg-emerald-100 text-emerald-700"
}

function isHashItem(item: CompareItem) {
  const value = `${item.itemKey} ${item.label}`.toLowerCase()
  return value.includes("hash") || value.includes("sha") || value.includes("md5") || value.includes("해시")
}

function getFileTypeFromName(fileName: string) {
  const extension = fileName.split(".").pop()
  return extension ? extension.toUpperCase() : "-"
}
