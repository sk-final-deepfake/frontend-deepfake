import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CaseDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type CaseHeroProps = {
  data: CaseDetailData
  getStatusLabel: (status: string) => string
  normalizeStatus: (status: string) => string
}

export function CaseHero({ data, getStatusLabel, normalizeStatus }: CaseHeroProps) {
  const completed = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "COMPLETED").length
  const processing = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "PROCESSING").length
  const failed = data.evidences.filter((item) => normalizeStatus(item.analysisStatus) === "FAILED").length

  return (
    <section className="py-2">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-3xl font-black tracking-normal text-slate-950 sm:text-4xl dark:text-foreground">
          {data.caseName}
        </h1>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-slate-400">
          <Copy className="size-4" />
        </Button>
      </div>
      <p className="mt-3 break-all font-mono text-sm font-bold text-slate-500 dark:text-muted-foreground">
        {data.caseId}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-black">
        <HeroChip label="생성일" value={formatDateTime(data.createdAt)} />
        <HeroChip label="상태" value={getStatusLabel(data.status)} highlight />
        <HeroChip label="총 증거 수" value={`${data.evidences.length}개`} />
        <HeroChip label="완료" value={`${completed}개`} />
        <HeroChip label="처리 중" value={`${processing}개`} />
        <HeroChip label="실패" value={`${failed}개`} />
      </div>
    </section>
  )
}

function HeroChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-muted dark:text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-slate-800 dark:text-foreground", highlight && "text-emerald-600")}>{value}</span>
    </div>
  )
}
