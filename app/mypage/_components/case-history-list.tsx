import Link from "next/link"
import { ChevronRight, FileStack } from "lucide-react"
import type { CaseSummary } from "@/app/mypage/_types/case"
import { formatCreatedAt } from "@/app/mypage/_lib/format-date"
import { CaseStatusBadge } from "@/app/mypage/_components/case-status-badge"
import { CaseHistoryEmpty } from "@/app/mypage/_components/case-history-empty"
import type { DateFormat } from "@/lib/user-settings"
import { buildCaseDetailPath } from "@/lib/route-params"

export function CaseHistoryList({
  cases,
  dateFormat = "ko-full",
}: {
  cases: CaseSummary[]
  dateFormat?: DateFormat
}) {
  if (cases.length === 0) {
    return <CaseHistoryEmpty />
  }

  return (
    <>
      {/* 모바일: 카드형 리스트 */}
      <ul className="divide-y divide-border md:hidden">
        {cases.map((item) => (
          <li key={item.caseId}>
            <Link
              href={buildCaseDetailPath(item.caseId)}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <FileStack className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.caseName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatRepresentativeEvidence(item)} · 증거 {item.evidenceCount}건
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatCreatedAt(item.createdAt, dateFormat)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CaseStatusBadge status={item.status} />
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* 데스크톱: 테이블 */}
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">사건</th>
              <th className="px-5 py-3 font-medium">대표 증거</th>
              <th className="px-5 py-3 font-medium">증거 수</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">최근 분석일</th>
              <th className="px-5 py-3 font-medium">
                <span className="sr-only">상세 보기</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cases.map((item) => (
              <tr key={item.caseId} className="transition-colors hover:bg-accent/40">
                <td className="px-5 py-3.5">
                  <Link
                    href={buildCaseDetailPath(item.caseId)}
                    className="block max-w-[260px] truncate font-medium text-foreground hover:underline"
                  >
                    {item.caseName}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.caseId}</p>
                </td>
                <td className="max-w-[220px] px-5 py-3.5">
                  <span className="block truncate text-muted-foreground">
                    {formatRepresentativeEvidence(item)}
                  </span>
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                  {item.evidenceCount}건
                </td>
                <td className="px-5 py-3.5">
                  <CaseStatusBadge status={item.status} />
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                  {formatCreatedAt(item.createdAt, dateFormat)}
                </td>
                <td className="px-5 py-3.5">
                  <Link
                    href={buildCaseDetailPath(item.caseId)}
                    className="inline-flex items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`${item.caseName} 상세 보기`}
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function formatRepresentativeEvidence(item: CaseSummary) {
  if (item.representativeEvidenceLabel && item.representativeEvidenceId) {
    return `${item.representativeEvidenceLabel} / EVD-${item.representativeEvidenceId}`
  }

  if (item.representativeEvidenceId) {
    return `EVD-${item.representativeEvidenceId}`
  }

  return "대표 증거 없음"
}
