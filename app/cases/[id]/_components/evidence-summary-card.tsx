import { AlertCircle, ClipboardCheck, FileBadge, FileText, LockKeyhole } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime, formatFileSize as formatBytes } from "@/lib/formatters"
import { cn } from "@/lib/utils"

import { SummaryMetaItem } from "./summary-meta-item"

type EvidenceSummaryCardProps = {
  data: EvidenceDetailData
  extension: string
  riskLabel: string
  statusLabel: string
  riskBadgeClassName: string
}

export function EvidenceSummaryCard({
  data,
  extension,
  riskLabel,
  statusLabel,
  riskBadgeClassName,
}: EvidenceSummaryCardProps) {
  const { evidenceInfo, analysisInfo } = data

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full px-4 font-black", riskBadgeClassName)}>
            {riskLabel}
          </Badge>
          <Badge variant="secondary" className="rounded-full px-4 font-black">
            {statusLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 font-black">
            {extension}
          </Badge>
        </div>

        <h2 className="truncate text-2xl font-black tracking-normal text-slate-950 dark:text-foreground">
          {evidenceInfo.fileName}
        </h2>

        <div className="mt-4 grid overflow-hidden rounded-lg border border-slate-200 bg-slate-50/50 sm:grid-cols-2 2xl:grid-cols-3 dark:border-border dark:bg-muted/20">
          <SummaryMetaItem icon={LockKeyhole} label="증거번호" value={`EVD-${evidenceInfo.evidenceId}`} />
          <SummaryMetaItem icon={ClipboardCheck} label="업로드 일시" value={formatDateTime(evidenceInfo.uploadedAt)} />
          <SummaryMetaItem icon={FileBadge} label="파일 유형" value={evidenceInfo.mediaType || "VIDEO"} />
          <SummaryMetaItem icon={FileText} label="파일 크기" value={formatBytes(evidenceInfo.fileSize)} />
        </div>

        {analysisInfo.status === "FAILED" ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-black">실패 사유</p>
                <p className="mt-1 leading-5">{analysisInfo.summary || "분석 처리 중 오류가 발생했습니다."}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
