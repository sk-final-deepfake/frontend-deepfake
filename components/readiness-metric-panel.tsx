"use client"

import { Loader2 } from "lucide-react"

import {
  buildDefaultReadinessMetricItems,
  type UiReadinessMetricItem,
} from "@/lib/readiness"
import { cn } from "@/lib/utils"

type ReadinessMetricPanelProps = {
  metrics?: UiReadinessMetricItem[]
  loading?: boolean
  statusMessage?: string | null
  className?: string
}

export function ReadinessMetricPanel({
  metrics,
  loading = false,
  statusMessage = null,
  className,
}: ReadinessMetricPanelProps) {
  const displayMetrics =
    metrics && metrics.length > 0 ? metrics : buildDefaultReadinessMetricItems()

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">화질 사전 검사</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Blur, Blockiness, FFT Peak 측정 결과입니다.
          </p>
        </div>
        {loading ? (
          <Loader2 className="size-5 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {displayMetrics.map((metric) => (
          <div
            key={metric.key}
            className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-border dark:bg-background"
          >
            <p className="text-xs font-semibold text-slate-400">{metric.label}</p>
            <p className="mt-1 font-mono text-xl font-bold tracking-tight text-slate-950 dark:text-foreground">
              {metric.value}
            </p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      {statusMessage ? (
        <p className="mt-4 text-sm font-medium leading-relaxed text-amber-700 dark:text-amber-300">
          {statusMessage}
        </p>
      ) : null}
    </section>
  )
}
