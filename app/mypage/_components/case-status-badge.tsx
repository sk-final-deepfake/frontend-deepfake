import { Badge } from "@/components/ui/badge"
import type { CaseStatus } from "@/app/mypage/_types/case"

const statusConfig: Record<
  CaseStatus,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "대기",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  PROCESSING: {
    label: "진행",
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
