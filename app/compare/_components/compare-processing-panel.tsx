import { Ban, GitCompare } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SourceEvidence, UploadedCompareFile } from "./compare-verification-flow"

type CompareProcessingPanelProps = {
  sourceEvidence: SourceEvidence
  compareFile: UploadedCompareFile | null
  progress: number
  onCancel: () => void
}

export function CompareProcessingPanel({
  sourceEvidence,
  compareFile,
  progress,
  onCancel,
}: CompareProcessingPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
            <GitCompare className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-foreground">비교 처리 중</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
              기준 증거와 비교 대상 파일의 해시, 메타데이터, 스트림 구조를 비교하고 있습니다.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10 rounded-md border-red-200 px-4 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          <Ban className="size-4" aria-hidden="true" />
          검증 중지
        </Button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <CompareFileSummary
          label="기준 증거"
          name={sourceEvidence.displayLabel}
          detail={formatEvidenceId(sourceEvidence.id)}
        />
        <CompareFileSummary label="비교 대상" name={compareFile?.name ?? "비교 파일"} detail={compareFile?.sizeLabel ?? "-"} />
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-muted-foreground">
          <span>검증 진행률</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
          <div
            className="h-full rounded-full bg-teal-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function formatEvidenceId(evidenceId: number) {
  return `EVD-${evidenceId}`
}

function CompareFileSummary({ label, name, detail }: { label: string; name: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/30">
      <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-foreground">{name}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-muted-foreground">{detail}</p>
    </div>
  )
}
