"use client"

import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  readinessTierBadgeClass,
  readinessTierLabel,
  hasBlockingReadiness,
  type ReadinessCheckSummary,
  type ReadinessTier,
} from "@/lib/readiness"

type QualityWarningDialogProps = {
  open: boolean
  summaries: ReadinessCheckSummary[]
  worstTier: ReadinessTier
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function QualityWarningDialog({
  open,
  summaries,
  worstTier,
  loading = false,
  onConfirm,
  onCancel,
}: QualityWarningDialogProps) {
  if (!open) return null

  const ackItems = summaries.filter((item) => item.readiness.requiresAcknowledgement)
  const infoItems = summaries.filter(
    (item) =>
      !item.readiness.requiresAcknowledgement &&
      item.readiness.frameCheckStatus &&
      ["FAILED", "SKIPPED"].includes(item.readiness.frameCheckStatus)
  )
  const displayItems = ackItems.length > 0 ? ackItems : infoItems.length > 0 ? infoItems : summaries
  const blocking = hasBlockingReadiness(summaries)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="alertdialog"
        aria-labelledby="quality-warning-title"
        aria-describedby="quality-warning-desc"
        className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="quality-warning-title" className="text-lg font-semibold text-foreground">
                화질 안내
              </h2>
              <Badge
                variant="outline"
                className={readinessTierBadgeClass(worstTier)}
              >
                {readinessTierLabel(worstTier)}
              </Badge>
            </div>
            <p id="quality-warning-desc" className="mt-2 text-sm text-muted-foreground">
              {blocking
                ? "이 영상은 분석을 진행할 수 없습니다."
                : (
                  <>
                    이 영상은 분석에 적합하지 않을 수 있습니다. 화질이 낮아{" "}
                    <span className="font-medium text-foreground">분석 신뢰도가 제한</span>될 수
                    있습니다. 위변조 판별 결과가 아니라 사전 품질 안내입니다.
                  </>
                )}
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-4">
          {displayItems.map((item) => (
            <li
              key={item.evidenceId}
              className="rounded-lg border border-border bg-muted/20 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{item.fileName}</p>
                <Badge
                  variant="outline"
                  className={readinessTierBadgeClass(item.readiness.readinessTier)}
                >
                  {readinessTierLabel(item.readiness.readinessTier)}
                </Badge>
              </div>
              {item.readiness.frameCheckStatus &&
              ["FAILED", "SKIPPED"].includes(item.readiness.frameCheckStatus) ? (
                <p className="mb-2 text-xs text-amber-800 dark:text-amber-200">
                  프레임 검사 {item.readiness.frameCheckStatus === "SKIPPED" ? "미실행" : "실패"}
                  {item.readiness.frameCheckMessage
                    ? `: ${item.readiness.frameCheckMessage}`
                    : " (ffprobe 결과만 반영됨)"}
                </p>
              ) : null}
              {item.readiness.confidenceCap < 100 && (
                <p className="mb-2 text-xs text-muted-foreground">
                  예상 신뢰도 상한: {item.readiness.confidenceCap}%
                </p>
              )}
              {item.readiness.reasons.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {item.readiness.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">상세 사유가 없습니다.</p>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {blocking ? "닫기" : "아니오"}
          </Button>
          {!blocking ? (
            <Button onClick={onConfirm} disabled={loading}>
              {loading ? "프레임 검사 및 분석 요청 중..." : "예, 계속 분석"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
