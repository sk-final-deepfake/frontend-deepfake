"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Download, ExternalLink, FileText, Loader2, RefreshCw, Search } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { getApiErrorMessage } from "@/lib/api/errors"
import {
  downloadReportPdf,
  fetchReports,
  type ReportListPage,
  type ReportSummary,
  type ReportTypeFilter,
} from "@/lib/api/reports"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

const TYPE_FILTERS: Array<{ value: ReportTypeFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "ANALYSIS", label: "딥페이크 분석" },
  { value: "COMPARE", label: "비교검증" },
]

export default function ReportsPage() {
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>("ALL")
  const [searchInput, setSearchInput] = useState("")
  const [query, setQuery] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [data, setData] = useState<ReportListPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput)
      setPage(0)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      setError(null)
      try {
        const nextData = await fetchReports({ page, size: PAGE_SIZE, type: typeFilter, query })
        if (!cancelled) {
          setData(nextData)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError, "보고서 목록을 불러오지 못했습니다."))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadReports()
    return () => {
      cancelled = true
    }
  }, [page, typeFilter, query, refreshKey])

  const reports = data?.content ?? []
  const totalPages = Math.max(data?.totalPages ?? 1, 1)
  const canGoPrev = page > 0
  const canGoNext = page + 1 < totalPages
  const hasActiveFilter = typeFilter !== "ALL" || query.trim().length > 0

  function selectTypeFilter(value: ReportTypeFilter) {
    setTypeFilter(value)
    setPage(0)
  }

  async function handleDownload(report: ReportSummary) {
    setDownloadingId(report.reportId)
    setActionMessage(null)
    try {
      const blob = await downloadReportPdf(report)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = report.reportFileName || `forenshield-report-${report.reportId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setActionMessage("PDF 다운로드를 시작했습니다.")
    } catch (downloadError) {
      setActionMessage(getApiErrorMessage(downloadError, "PDF 다운로드에 실패했습니다."))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-foreground">보고서</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              분석 결과와 비교검증에서 생성한 PDF 보고서를 확인하고 다운로드합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            새로고침
          </button>
        </div>

        {actionMessage ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:border-border dark:bg-card dark:text-muted-foreground">
            {actionMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none dark:border-border dark:bg-card">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-border">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-border dark:bg-background">
              {TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => selectTypeFilter(filter.value)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
                    typeFilter === filter.value
                      ? "bg-white text-slate-950 shadow-sm dark:bg-card dark:text-foreground"
                      : "text-slate-500 hover:text-slate-800 dark:text-muted-foreground dark:hover:text-foreground"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="파일명, 사건명, 증거 ID 검색"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 dark:border-border dark:bg-card dark:text-foreground"
              />
            </label>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-border">
            <p className="text-xs font-bold text-slate-400">
              {hasActiveFilter ? "검색 결과" : "생성된 보고서"} · 총 {data?.totalElements ?? 0}건
            </p>
          </div>

          {loading ? (
            <ReportState icon={<Loader2 className="size-5 animate-spin" />} title="보고서를 불러오는 중입니다" />
          ) : error ? (
            <ReportState icon={<FileText className="size-5" />} title={error} />
          ) : reports.length === 0 ? (
            <ReportState
              icon={<FileText className="size-5" />}
              title={hasActiveFilter ? "조건에 맞는 보고서가 없습니다" : "생성된 보고서가 없습니다"}
              description={
                hasActiveFilter
                  ? "필터나 검색어를 바꿔서 다시 시도해 보세요."
                  : "사건 상세 또는 비교검증 결과 화면에서 PDF를 생성하면 이곳에 표시됩니다."
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-border">
              {reports.map((report) => (
                <ReportRow
                  key={report.reportId}
                  report={report}
                  downloading={downloadingId === report.reportId}
                  onDownload={() => void handleDownload(report)}
                />
              ))}
            </div>
          )}

          {!loading && !error && reports.length > 0 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm font-semibold text-slate-500 dark:border-border">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card"
              >
                이전
              </button>
              <span className="tabular-nums">
                {page + 1} / {totalPages} 페이지
              </span>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-card"
              >
                다음
              </button>
            </div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function ReportRow({
  report,
  downloading,
  onDownload,
}: {
  report: ReportSummary
  downloading: boolean
  onDownload: () => void
}) {
  const detailHref = useMemo(() => {
    if (report.reportType === "COMPARE" && report.compareId) return `/compare/${report.compareId}`
    if (report.caseId) {
      return `/cases/${encodeURIComponent(report.caseId)}${report.evidenceId ? `?evidenceId=${report.evidenceId}` : ""}`
    }
    return null
  }, [report.caseId, report.compareId, report.evidenceId, report.reportType])

  return (
    <article className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-secondary dark:text-muted-foreground">
            {report.reportType === "COMPARE" ? "비교검증" : "딥페이크 분석"}
          </span>
          {report.verdictLabel ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                getVerdictBadgeClassName(report.verdictLabel)
              )}
            >
              {report.verdictLabel}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2.5 truncate text-base font-bold text-slate-950 dark:text-foreground">
          {report.reportFileName || `보고서 #${report.reportId}`}
        </h3>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-slate-500">
          <span>{report.caseName ?? "사건 정보 없음"}</span>
          <span>{formatDateTime(report.createdAt)}</span>
          {report.evidenceId ? <span className="font-mono text-xs">EVD-{report.evidenceId}</span> : null}
          {report.compareId ? <span className="font-mono text-xs">CMP-{report.compareId}</span> : null}
        </div>
        <p className="mt-1.5 truncate font-mono text-xs text-slate-400">{report.reportHash}</p>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        {detailHref ? (
          <Link
            href={detailHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            상세
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 dark:bg-foreground dark:text-background"
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          PDF
        </button>
      </div>
    </article>
  )
}

function getVerdictBadgeClassName(verdictLabel: string) {
  if (/위험|차이|불일치|높음/.test(verdictLabel)) {
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
  }
  if (/일치|정상|낮음|적합/.test(verdictLabel)) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
  }
  return "bg-slate-100 text-slate-500 dark:bg-secondary dark:text-muted-foreground"
}

function ReportState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-secondary dark:text-muted-foreground">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-950 dark:text-foreground">{title}</h2>
      {description ? <p className="mt-2 text-sm font-medium text-slate-500">{description}</p> : null}
    </div>
  )
}
