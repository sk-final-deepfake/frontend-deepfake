import type { CaseDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type CaseHeroProps = {
  data: CaseDetailData
  getStatusLabel: (status: string) => string
}

export function CaseHero({ data, getStatusLabel }: CaseHeroProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="max-w-full truncate text-2xl font-bold tracking-normal text-slate-950 dark:text-foreground">
          {data.caseName}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          {formatDateTime(data.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <HeroChip value={getStatusLabel(data.status)} highlight />
        <HeroChip value={`증거 ${data.evidences.length}개`} />
      </div>
    </section>
  )
}

function HeroChip({ value, highlight }: { value: string; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full bg-muted px-3 py-1 text-muted-foreground",
        highlight && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
      )}
    >
      {value}
    </span>
  )
}
