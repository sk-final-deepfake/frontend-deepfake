"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  UploadCloud,
  X,
} from "lucide-react"
import type { CaseStatus, CaseSummary } from "@/app/mypage/_types/case"
import { CaseHistorySection } from "@/app/mypage/_components/case-history-section"
import { fetchMyAnalysisHistory } from "@/lib/api/mypage"
import { createCase, setRepresentativeEvidence, uploadEvidenceToCase } from "@/lib/api/case-workflow"
import { isUnauthorizedError } from "@/lib/api/errors"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildCaseDetailPath } from "@/lib/route-params"
import { getSession, type AuthSession } from "@/lib/auth"

const HISTORY_PAGE_SIZE = 10

const statusFilters: Array<{ label: string; value: "ALL" | CaseStatus }> = [
  { label: "전체", value: "ALL" },
  { label: "등록 대기", value: "PENDING" },
  { label: "처리 중", value: "PROCESSING" },
  { label: "분석 완료", value: "COMPLETED" },
  { label: "오류", value: "FAILED" },
]

export function MyPageContent() {
  const router = useRouter()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | CaseStatus>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newCaseName, setNewCaseName] = useState("")
  const [representativeFile, setRepresentativeFile] = useState<File | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    function syncSession() {
      setSession(getSession())
    }

    syncSession()
    window.addEventListener("auth-change", syncSession)
    return () => window.removeEventListener("auth-change", syncSession)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadCases() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchMyAnalysisHistory()
        if (cancelled) return
        setCases(response.content)
        setTotalCount(response.totalElements)
      } catch (error) {
        if (cancelled) return
        if (isUnauthorizedError(error)) {
          setErrorMessage("사건 목록을 보려면 로그인이 필요합니다.")
        } else {
          setErrorMessage("사건 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
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
      const matchesKeyword =
        keyword.length === 0 ||
        item.caseName.toLowerCase().includes(keyword) ||
        (item.representativeEvidenceLabel ?? "").toLowerCase().includes(keyword) ||
        (item.representativeEvidenceId ? `evd-${item.representativeEvidenceId}` : "").includes(keyword)

      return matchesStatus && matchesKeyword
    })
  }, [cases, query, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / HISTORY_PAGE_SIZE))
  const pageStart = filteredCases.length === 0 ? 0 : (currentPage - 1) * HISTORY_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * HISTORY_PAGE_SIZE, filteredCases.length)
  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  async function handleCreateCase() {
    const trimmed = newCaseName.trim()
    if (!trimmed) {
      setCreateError("사건명을 입력해 주세요.")
      return
    }

    if (cases.some((item) => normalizeCaseNameForCompare(item.caseName) === normalizeCaseNameForCompare(trimmed))) {
      setCreateError("이미 등록된 사건명입니다. 다른 사건명을 입력해 주세요.")
      return
    }

    if (!representativeFile) {
      setCreateError("대표 증거 영상을 1개 선택해 주세요.")
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const created = await createCase(trimmed)
      const representativeEvidence = await uploadEvidenceToCase(
        created.caseId,
        created.caseName,
        representativeFile
      )

      if (representativeEvidence) {
        try {
          await setRepresentativeEvidence(created.caseId, representativeEvidence.evidenceId)
        } catch {
          // 실제 API 계약 전에는 대표 증거 지정이 지원되지 않을 수 있다.
        }
      }

      setCreateOpen(false)
      setNewCaseName("")
      setRepresentativeFile(null)
      router.push(buildCaseDetailPath(created.caseId, representativeEvidence?.evidenceId))
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "사건과 증거 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsCreating(false)
    }
  }

  function closeCreateDialog() {
    if (isCreating) return
    setCreateOpen(false)
    setNewCaseName("")
    setRepresentativeFile(null)
    setCreateError(null)
  }

  function selectRepresentativeFile(fileList: FileList | null) {
    const file = fileList?.item(0)
    if (!file) return

    setRepresentativeFile(file)
    setCreateError(null)
  }

  const canCreateCase = canRegisterCase(session)
  const receptionistText = `${session?.name ?? "김민희"} · 서울경찰청 · 사이버수사팀`

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-teal-600">Case Management</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">
            사건 관리
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            사건을 먼저 등록하고, 사건 상세에서 증거를 추가한 뒤 필요한 분석을 실행합니다.
          </p>
        </div>
        {canCreateCase ? (
          <Button
            className="h-9 rounded-lg bg-teal-600 px-4 text-sm font-black hover:bg-teal-700"
            onClick={() => setCreateOpen(true)}
          >
            사건 등록
          </Button>
        ) : null}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 px-4 py-6">
          <section className="w-full max-w-5xl rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-foreground">사건 등록</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  사건 정보와 대표 증거 영상을 함께 접수합니다. 등록된 증거는 원본 해시와 함께 이력에 기록됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateDialog}
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="사건 등록 닫기"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <section className="rounded-xl border border-border bg-background p-4">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">
                    1
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">사건 정보</h3>
                    <p className="text-xs text-muted-foreground">목록과 상세 화면에 표시될 사건명을 입력합니다.</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label htmlFor="newCaseName" className="block text-sm font-bold text-foreground">
                      사건명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="newCaseName"
                      value={newCaseName}
                      onChange={(event) => setNewCaseName(event.target.value)}
                      placeholder="예: 2026-서울-0123 영상 증거 분석"
                      className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-xs font-black text-muted-foreground">접수자 정보</p>
                  <p className="mt-1 text-sm font-black text-foreground">{receptionistText}</p>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-background p-4">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-foreground">증거 업로드</h3>
                    <p className="text-xs text-muted-foreground">
                      MP4, MOV 등 대표 증거 영상 1개를 선택하세요. 추가 증거는 사건 상세 화면에서 등록할 수 있습니다.
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="evidenceFiles"
                  className={cn(
                    "flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
                    representativeFile
                      ? "border-teal-300 bg-teal-50/70 text-teal-700"
                      : "border-border bg-card text-muted-foreground hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700"
                  )}
                >
                  <UploadCloud className="size-8" aria-hidden="true" />
                  <span className="mt-3 text-sm font-black text-foreground">
                    {representativeFile ? "대표 증거 선택 완료" : "대표 증거 영상 선택"}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    MP4, MOV 등 대표 증거 영상 1개를 선택하세요.
                  </span>
                  {representativeFile ? (
                    <span className="mt-3 flex max-w-full items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-black text-teal-700 shadow-sm">
                      <span className="max-w-[420px] truncate">{representativeFile.name}</span>
                      <button
                        type="button"
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="선택한 대표 증거 제거"
                        onClick={(event) => {
                          event.preventDefault()
                          setRepresentativeFile(null)
                        }}
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}
                </label>
                <input
                  id="evidenceFiles"
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(event) => {
                    selectRepresentativeFile(event.target.files)
                    event.currentTarget.value = ""
                  }}
                />

              </section>
            </div>

            {createError ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-red-500">
                <AlertCircle className="size-4" aria-hidden="true" />
                {createError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <p className="mr-auto self-center text-xs font-semibold text-muted-foreground">
                등록 후 원본 저장, SHA-256 해시 생성, 메타데이터 추출이 자동으로 진행됩니다.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4 font-bold"
                disabled={isCreating}
                onClick={closeCreateDialog}
              >
                취소
              </Button>
              <Button
                type="button"
                className="h-10 bg-teal-600 px-4 font-black hover:bg-teal-700"
                disabled={isCreating}
                onClick={handleCreateCase}
              >
                {isCreating ? "등록 중" : "사건 및 증거 등록"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-black text-card-foreground">
                사건 목록
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                총 {totalCount}건 · {filteredCases.length}건 표시
              </p>
            </div>
            <label className="relative block w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="사건명 또는 증거 ID 검색"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const selected = statusFilter === filter.value

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm font-bold transition-colors",
                    selected
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-border bg-background text-muted-foreground hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                  )}
                  aria-pressed={selected}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            사건 목록을 불러오는 중...
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

function canRegisterCase(session: AuthSession | null) {
  const role = session?.role
  if (!role) return true
  if (role === "REVIEWER" || role === "ROLE_REVIEWER") return false
  return role === "INVESTIGATOR" || role === "ROLE_INVESTIGATOR" || role === "ORG_ADMIN" || role === "ROLE_ORG_ADMIN" || role === "user" || role === "admin"
}

function normalizeCaseNameForCompare(caseName: string) {
  return caseName.trim().toLowerCase()
}
