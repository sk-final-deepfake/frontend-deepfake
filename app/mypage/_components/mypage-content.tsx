"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Loader2,
  Search,
  UploadCloud,
} from "lucide-react"
import type { CaseStatus, CaseSummary } from "@/app/mypage/_types/case"
import { CaseHistorySection } from "@/app/mypage/_components/case-history-section"
import { mockCases } from "@/app/mypage/_data/mock-cases"
import { fetchMyAnalysisHistory } from "@/lib/api/mypage"
import { ApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false"
const HISTORY_PAGE_SIZE = 10

const statusFilters: Array<{ label: string; value: "ALL" | CaseStatus }> = [
  { label: "처리 중", value: "PROCESSING" },
  { label: "완료", value: "COMPLETED" },
  { label: "실패", value: "FAILED" },
]

export function MyPageContent() {
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | CaseStatus>("ALL")
  const [analysisDate, setAnalysisDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCases() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchMyAnalysisHistory()
        if (cancelled) return
        const nextCases =
          USE_MOCK_API && response.content.length === 0 ? mockCases : response.content
        setCases(nextCases)
        setTotalCount(nextCases.length)
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          setErrorMessage("분석 기록을 보려면 로그인이 필요합니다.")
        } else {
          setErrorMessage("분석 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
        }
        setCases([])
        setTotalCount(0)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadCases()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredCases = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return cases.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter
      const matchesDate = analysisDate.length === 0 || isSameDate(item.createdAt, analysisDate)
      const matchesKeyword =
        keyword.length === 0 ||
        item.caseName.toLowerCase().includes(keyword) ||
        (item.representativeFileName ?? "").toLowerCase().includes(keyword)

      return matchesStatus && matchesDate && matchesKeyword
    })
  }, [analysisDate, cases, query, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / HISTORY_PAGE_SIZE))
  const pageStart = filteredCases.length === 0 ? 0 : (currentPage - 1) * HISTORY_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * HISTORY_PAGE_SIZE, filteredCases.length)
  const activeFilterLabel =
    statusFilters.find((filter) => filter.value === statusFilter)?.label ?? "전체"

  useEffect(() => {
    setCurrentPage(1)
  }, [analysisDate, query, statusFilter])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            분석 이력
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            사건별 분석 요청 기록을 확인하고, 상세 화면에서 연결된 증거 파일을 추적합니다.
          </p>
        </div>
        <Button
          className="h-9 rounded-lg bg-teal-600 px-4 text-sm font-black hover:bg-teal-700"
          render={<Link href="/main#new-analysis" />}
          nativeButton={false}
        >
          <UploadCloud className="size-4" aria-hidden="true" />
          새 분석 요청
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="sticky top-20 z-20 flex flex-col gap-4 border-b border-border bg-card px-5 py-4 sm:top-24 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-card-foreground">
              사건별 분석 이력
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              총 {totalCount}건 · 10개씩 표시
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="사건명, 파일명 검색..."
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
              />
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-black transition-colors",
                  filterOpen || statusFilter !== "ALL"
                    ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                    : "border-border bg-background text-muted-foreground hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/10 dark:hover:text-teal-300"
                )}
                aria-expanded={filterOpen}
              >
                <Filter className="size-4" aria-hidden="true" />
                필터
                <span className="rounded bg-white/70 px-1.5 py-0.5 text-[11px] dark:bg-white/15">
                  {activeFilterLabel}
                </span>
                <ChevronDown
                  className={cn("size-4 transition-transform", filterOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {filterOpen ? (
                <div className="absolute right-0 top-12 z-30 w-64 rounded-xl border border-border bg-white p-3 shadow-lg dark:bg-popover">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-black text-foreground">필터</p>
                    {statusFilter !== "ALL" || analysisDate ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("ALL")
                          setAnalysisDate("")
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        초기화
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="analysisDateFilter"
                        className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500 dark:text-muted-foreground"
                      >
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        분석 날짜
                      </label>
                      <input
                        id="analysisDateFilter"
                        type="date"
                        value={analysisDate}
                        onChange={(event) => setAnalysisDate(event.target.value)}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-black text-slate-500 dark:text-muted-foreground">상태</p>
                      <div className="grid gap-1">
                    {statusFilters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(filter.value)
                          setFilterOpen(false)
                        }}
                        className={cn(
                          "flex h-9 items-center justify-between rounded-lg px-3 text-sm font-bold transition-colors",
                          statusFilter === filter.value
                            ? "bg-teal-600 text-white"
                            : "text-muted-foreground hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-500/10 dark:hover:text-teal-300"
                        )}
                      >
                        {filter.label}
                        {statusFilter === filter.value ? <span className="text-xs">선택됨</span> : null}
                      </button>
                    ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            분석 기록을 불러오는 중...
          </div>
        ) : errorMessage ? (
          <div className="space-y-4 px-5 py-16 text-center">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            {errorMessage.includes("로그인") && (
              <Button render={<Link href="/login" />} nativeButton={false}>
                로그인하기
              </Button>
            )}
          </div>
        ) : (
          <>
            <CaseHistorySection
              cases={filteredCases}
              page={currentPage}
              pageSize={HISTORY_PAGE_SIZE}
            />
            {filteredCases.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {pageStart}-{pageEnd} / {filteredCases.length}건 · {currentPage}/{totalPages} 페이지
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    <ChevronLeft className="size-3.5" aria-hidden="true" />
                    이전
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    다음
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  )
}

function isSameDate(value: string, selectedDate: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}` === selectedDate
}
