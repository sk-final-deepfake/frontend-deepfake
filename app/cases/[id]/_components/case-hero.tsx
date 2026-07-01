import type { CaseDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type CaseHeroProps = {
  data: CaseDetailData
  getStatusLabel: (status: string) => string
}

export function CaseHero({ data, getStatusLabel }: CaseHeroProps) {
  return (
    <section className="flex flex-col gap-3 py-1 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-black tracking-normal text-slate-950 sm:text-4xl dark:text-foreground">
          {data.caseName}
        </h1>
        <p className="mt-2 text-sm font-bold text-muted-foreground">
          {formatDateTime(data.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm font-black">
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
