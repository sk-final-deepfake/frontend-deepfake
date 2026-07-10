"use client"

import type { UiReadinessMetricItem } from "@/lib/readiness"
import { cn } from "@/lib/utils"

type ReadinessMetricPanelProps = {
  metrics: UiReadinessMetricItem[]
  className?: string
}

export function ReadinessMetricPanel({ metrics, className }: ReadinessMetricPanelProps) {
  if (metrics.length === 0) return null

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card",
        className
      )}
    >
      <div>
        <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">화질 사전 검사</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Blur, Blockiness, FFT Peak 측정 결과입니다.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
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
    </section>
  )
}
