"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, UserRoundCheck } from "lucide-react"
import { AdminPageHeader } from "@/app/admin/_components/admin-page-header"
import { useAdminToast } from "@/app/admin/_components/admin-toast-provider"
import type { CaseSummary } from "@/app/mypage/_types/case"
import { Button } from "@/components/ui/button"
import { fetchMyAnalysisHistory } from "@/lib/api/mypage"
import { getApiErrorMessage } from "@/lib/api/errors"
import { mockAssignReviewerToCase } from "@/lib/mock/forensic-api"
import { mockUsers, reviewStatusLabelMap } from "@/lib/permissions"

const reviewers = mockUsers.filter((user) => user.role === "REVIEWER")

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function ReviewStatusPill({ status }: { status: CaseSummary["reviewStatus"] }) {
  const normalized = status ?? "NONE"
  const tone =
    normalized === "REVIEW_REQUESTED"
      ? "bg-amber-50 text-amber-700"
      : normalized === "REVIEW_ASSIGNED"
        ? "bg-teal-50 text-teal-700"
        : normalized === "REVIEW_COMPLETED" || normalized === "REPORT_APPROVED"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {reviewStatusLabelMap[normalized]}
    </span>
  )
}

function reviewerName(reviewerId?: string | null) {
  if (!reviewerId) return "미배정"
  return reviewers.find((reviewer) => reviewer.id === reviewerId)?.name ?? reviewerId
}

export default function AdminReviewAssignmentPage() {
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [selectedReviewerByCase, setSelectedReviewerByCase] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [processingCaseId, setProcessingCaseId] = useState<string | null>(null)
  const { toast } = useAdminToast()

  const loadCases = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchMyAnalysisHistory({ page: 0, size: 50 })
      setCases(response.content)
    } catch (error) {
      const message = getApiErrorMessage(error, "검토 배정 목록을 불러오지 못했습니다.")
      toast({ title: "조회 실패", description: message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  const reviewCases = useMemo(
    () =>
      cases.filter((item) =>
        ["REVIEW_REQUESTED", "REVIEW_ASSIGNED", "REVIEW_COMPLETED", "REPORT_APPROVED"].includes(
          item.reviewStatus ?? "NONE"
        )
      ),
    [cases]
  )

  async function handleAssign(caseItem: CaseSummary) {
    const reviewerId =
      selectedReviewerByCase[caseItem.caseId] ?? caseItem.reviewerId ?? reviewers[0]?.id
    if (!reviewerId) {
      toast({ title: "배정 실패", description: "선택 가능한 검토자가 없습니다." })
      return
    }

    setProcessingCaseId(caseItem.caseId)
    try {
      await mockAssignReviewerToCase(caseItem.caseId, reviewerId)
      toast({
        title: "검토자 배정 완료",
        description: `${caseItem.caseName} 사건이 ${reviewerName(reviewerId)} 검토자에게 배정되었습니다.`,
      })
      await loadCases()
    } catch (error) {
      const message = getApiErrorMessage(error, "검토자 배정 중 오류가 발생했습니다.")
      toast({ title: "배정 실패", description: message })
    } finally {
      setProcessingCaseId(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="검토 배정"
        description="검토 요청된 사건에 검토자를 지정하고 배정 상태를 확인합니다."
      />

      <div className="space-y-5 px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">검토 요청</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {reviewCases.filter((item) => item.reviewStatus === "REVIEW_REQUESTED").length}건
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">검토 중</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {reviewCases.filter((item) => item.reviewStatus === "REVIEW_ASSIGNED").length}건
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">검토자</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{reviewers.length}명</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">검토 대상 사건</h2>
              <p className="mt-1 text-sm text-slate-500">
                분석관이 검토 요청한 사건만 배정 대상으로 표시됩니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {reviewCases.length}건
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : reviewCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="size-9 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                검토 배정할 사건이 없습니다.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                사건 상세에서 검토 요청이 생성되면 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviewCases.map((caseItem) => {
                const selectedReviewer =
                  selectedReviewerByCase[caseItem.caseId] ??
                  caseItem.reviewerId ??
                  reviewers[0]?.id ??
                  ""
                const isAssigned = caseItem.reviewStatus === "REVIEW_ASSIGNED"

                return (
                  <div
                    key={caseItem.caseId}
                    className="grid gap-4 px-6 py-5 lg:grid-cols-[1fr_280px]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ReviewStatusPill status={caseItem.reviewStatus} />
                        <span className="text-xs text-slate-400">
                          요청 {formatDateTime(caseItem.reviewRequestedAt)}
                        </span>
                      </div>
                      <h3 className="mt-3 truncate text-base font-bold text-slate-900">
                        {caseItem.caseName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {caseItem.caseId} · 증거 {caseItem.evidenceCount}건 ·{" "}
                        {caseItem.department ?? "소속 미지정"}
                      </p>
                    </div>

                    <div className="w-full space-y-3 lg:justify-self-end">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-500">
                          검토자
                        </span>
                        <select
                          value={selectedReviewer}
                          onChange={(event) =>
                            setSelectedReviewerByCase((current) => ({
                              ...current,
                              [caseItem.caseId]: event.target.value,
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        >
                          {reviewers.map((reviewer) => (
                            <option key={reviewer.id} value={reviewer.id}>
                              {reviewer.name} · {reviewer.department}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        className="w-full gap-2"
                        variant={isAssigned ? "outline" : "default"}
                        disabled={processingCaseId === caseItem.caseId}
                        onClick={() => handleAssign(caseItem)}
                      >
                        {processingCaseId === caseItem.caseId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <UserRoundCheck className="size-4" />
                        )}
                        {isAssigned ? "재배정" : "배정"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
