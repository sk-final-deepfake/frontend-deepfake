import { Badge } from "@/components/ui/badge"
import type { CaseStatus } from "@/app/mypage/_types/case"

const statusConfig: Record<
  CaseStatus,
  { label: string; className: string; dot: string }
> = {
  // 사건 목록은 처리중 / 실패 / 완료 3개만 노출한다. 대기(PENDING)는 처리중과 동일하게 표시.
  PENDING: {
    label: "처리 중",
    className: "border-primary/40 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  PROCESSING: {
    label: "처리 중",
    className: "border-primary/40 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  COMPLETED: {
    label: "완료",
    className: "border-chart-4/40 bg-chart-4/10 text-chart-4",
    dot: "bg-chart-4",
  },
  FAILED: {
    label: "실패",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const config = statusConfig[status]

  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
      <span className={`size-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </Badge>
  )
}
