"use client"

import { useEffect, useState } from "react"

import type { UiMethodologyModel } from "@/lib/api/analysis-result-ui"
import { cn } from "@/lib/utils"

const MODEL_BAR_COLORS = [
  { bar: "bg-emerald-800 dark:bg-emerald-600", label: "text-emerald-800 dark:text-emerald-300" },
  { bar: "bg-emerald-600 dark:bg-emerald-500", label: "text-emerald-600 dark:text-emerald-300" },
  { bar: "bg-emerald-400 dark:bg-emerald-400", label: "text-emerald-500 dark:text-emerald-200" },
  { bar: "bg-teal-300 dark:bg-teal-300", label: "text-teal-500 dark:text-teal-200" },
] as const

export function MethodologyModelChart({ models }: { models: UiMethodologyModel[] }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    setAnimated(false)
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimated(true))
    })
    return () => cancelAnimationFrame(frame)
  }, [models])

  return (
    <div className="px-6 pb-3 pt-8">
      <div className="mx-auto flex max-w-[560px] justify-center gap-2 px-1 sm:gap-3">
        {models.map((model, index) => {
          const percent = model.score == null ? null : Math.round(model.score * 100)
          const thresholdPercent = Math.round(model.threshold * 100)
          const thresholdBottom = Math.max(0, Math.min(100, thresholdPercent))
          const color = MODEL_BAR_COLORS[index % MODEL_BAR_COLORS.length]
          const over = model.score != null && model.overThreshold

          return (
            <div
              key={`${model.name}-${model.version}`}
              className="flex w-[108px] shrink-0 flex-col items-center"
            >
              <div className="relative h-40 w-full border-b border-slate-200 dark:border-border">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 z-10 w-12 -translate-x-1/2"
                  style={{ bottom: `${thresholdBottom}%` }}
                >
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold leading-none text-slate-500">
                    기준 {thresholdPercent}
                  </span>
                  <span className="block w-full border-t border-dashed border-slate-500/80 dark:border-slate-400" />
                </div>

                <div className="flex h-full flex-col items-center justify-end">
                  <span
                    className={cn(
                      "mb-1 text-xs font-bold transition-opacity duration-500",
                      animated ? "opacity-100" : "opacity-0",
                      over ? "text-red-700 dark:text-red-300" : color.label
                    )}
                    style={{ transitionDelay: `${index * 140 + 350}ms` }}
                  >
                    {percent ?? "-"}
                  </span>
                  <div
                    className={cn(
                      "w-12 rounded-t-[3px] transition-[height] duration-700 ease-out",
                      over ? "bg-red-600 dark:bg-red-500" : color.bar
                    )}
                    style={{
                      height: animated ? `${Math.max(2, percent ?? 0)}%` : "0%",
                      transitionDelay: `${index * 140}ms`,
                    }}
                  />
                </div>
              </div>

              <div
                className="w-full pt-2 text-center"
                title={`${model.name} · 기준 ${thresholdPercent} 초과 시 탐지`}
              >
                <span
                  className={cn(
                    "block whitespace-nowrap text-[11px] font-bold leading-tight",
                    color.label
                  )}
                >
                  {model.name}
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">
                  {model.overThreshold ? "기준 초과 · 탐지" : "기준 미만"}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
