"use client"

import { useState } from "react"

import { normalizeResultValue, type UiMethodologyModel } from "@/lib/api/analysis-result-ui"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDuration } from "@/lib/formatters"
import { cn } from "@/lib/utils"

import { FORGERY_TEMPORAL_MODULE } from "../_lib/forgery-ui"
import {
  buildDeepfakeTimelineTabs,
  buildForgeryTimelineTabs,
  type DeepfakeTimelineTab,
  type ForgeryTimelineTab,
} from "../_lib/module-timelines"
import { FrameRiskChart } from "./frame-risk-chart"
import { MethodologyModelChart } from "./methodology-model-chart"

type ResultFrameAnalysisProps = {
  evidenceDetail: EvidenceDetailData
  detectionThreshold: number
  deepfakeChartModels: UiMethodologyModel[]
  forgeryChartModels: UiMethodologyModel[]
  onSeek: (seconds: number) => void
}

type AnalysisCategory = "deepfake" | "forgery"

const CATEGORY_COPY: Record<
  AnalysisCategory,
  { subtitle: string; chartTitle: string; emptyMessage: string }
> = {
  deepfake: {
    subtitle: "얼굴 합성·시계열·움직임 신호를 프레임·클립 단위로 확인합니다.",
    chartTitle: "딥페이크 모델별 판단 점수",
    emptyMessage: "딥페이크 모델 타임라인이 아직 제공되지 않았습니다.",
  },
  forgery: {
    subtitle: "국소 부위·컷편집·프레임조작 위변조 신호를 프레임·클립 단위로 확인합니다.",
    chartTitle: "위변조 모델별 판단 점수",
    emptyMessage: "위변조 모델 타임라인이 아직 제공되지 않았습니다.",
  },
}

export function ResultFrameAnalysis({
  evidenceDetail,
  detectionThreshold,
  deepfakeChartModels,
  forgeryChartModels,
  onSeek,
}: ResultFrameAnalysisProps) {
  const [category, setCategory] = useState<AnalysisCategory>("deepfake")
  const deepfakeTabs = buildDeepfakeTimelineTabs(evidenceDetail, detectionThreshold)
  const forgeryTabs = buildForgeryTimelineTabs(evidenceDetail, detectionThreshold)
  const [deepfakeKey, setDeepfakeKey] = useState(deepfakeTabs[0]?.key ?? "cnn")
  const [forgeryKey, setForgeryKey] = useState(forgeryTabs[0]?.key ?? "")

  const activeDeepfakeTab = deepfakeTabs.find((tab) => tab.key === deepfakeKey) ?? deepfakeTabs[0]
  const activeForgeryTab = forgeryTabs.find((tab) => tab.key === forgeryKey) ?? forgeryTabs[0]
  const copy = CATEGORY_COPY[category]
  const chartModels = category === "deepfake" ? deepfakeChartModels : forgeryChartModels
  const modelCount = category === "deepfake" ? deepfakeChartModels.length : forgeryChartModels.length

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">프레임 분석</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{copy.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
          모델 {modelCount}개
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-bold dark:bg-secondary">
        {(
          [
            ["deepfake", "딥페이크"],
            ["forgery", "위변조"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className={cn(
              "rounded-md px-3 py-2 transition-colors",
              category === value
                ? "bg-white text-slate-950 shadow-sm dark:bg-card dark:text-foreground"
                : "text-slate-500 hover:text-slate-700 dark:text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {chartModels.length > 0 ? (
        <section className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-white dark:border-border dark:bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-border">
            <h4 className="text-sm font-bold text-slate-950 dark:text-foreground">{copy.chartTitle}</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-secondary">
              모듈별 기준선 · 초과 시 탐지
            </span>
          </div>
          <MethodologyModelChart models={chartModels} />
        </section>
      ) : null}

      {category === "deepfake" ? (
        <DeepfakeFrameAnalysis
          tabs={deepfakeTabs}
          activeTab={activeDeepfakeTab}
          activeKey={activeDeepfakeTab?.key ?? "cnn"}
          onSelectTab={setDeepfakeKey}
          emptyMessage={copy.emptyMessage}
        />
      ) : (
        <ForgeryFrameAnalysis
          tabs={forgeryTabs}
          activeTab={activeForgeryTab}
          activeKey={activeForgeryTab?.key ?? ""}
          onSelectTab={setForgeryKey}
          onSeek={onSeek}
          emptyMessage={copy.emptyMessage}
        />
      )}
    </section>
  )
}

function DeepfakeFrameAnalysis({
  tabs,
  activeTab,
  activeKey,
  onSelectTab,
  emptyMessage,
}: {
  tabs: DeepfakeTimelineTab[]
  activeTab?: DeepfakeTimelineTab
  activeKey: string
  onSelectTab: (key: DeepfakeTimelineTab["key"]) => void
  emptyMessage: string
}) {
  const scores = activeTab?.points ?? []

  if (tabs.length === 0) {
    return <EmptyTimelineMessage title={emptyMessage} />
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid grid-cols-3 rounded-lg bg-slate-50 p-1 text-xs font-bold dark:bg-background">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectTab(tab.key)}
            className={cn(
              "rounded-md px-2 py-2 transition-colors",
              activeKey === tab.key
                ? "bg-white text-slate-950 shadow-sm dark:bg-card dark:text-foreground"
                : "text-slate-500 hover:text-slate-700 dark:text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab ? (
        <>
          <p className="text-xs font-semibold text-slate-500">{activeTab.description}</p>

          {scores.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
              <FrameRiskChart
                scores={scores}
                threshold={activeTab.threshold}
                title={activeTab.title}
                emptyMessage={`${activeTab.label} 타임라인 데이터가 없습니다.`}
              />
            </div>
          ) : (
            <EmptyTimelineMessage
              title={`${activeTab.label} 타임라인 데이터가 없습니다.`}
              description="백엔드가 moduleTimelines 또는 frameRisks/clipRisks/pairRisks를 제공하면 이 영역에 차트가 표시됩니다."
            />
          )}
        </>
      ) : (
        <EmptyTimelineMessage title={emptyMessage} />
      )}
    </div>
  )
}

function ForgeryFrameAnalysis({
  tabs,
  activeTab,
  activeKey,
  onSelectTab,
  onSeek,
  emptyMessage,
}: {
  tabs: ForgeryTimelineTab[]
  activeTab?: ForgeryTimelineTab
  activeKey: string
  onSelectTab: (key: string) => void
  onSeek: (seconds: number) => void
  emptyMessage: string
}) {
  if (tabs.length === 0) {
    return (
      <EmptyTimelineMessage
        title={emptyMessage}
        description="GPU worker가 forgery_spatial(TruFor) 또는 forgery_temporal(TimeSformer) moduleTimelines를 내면 모델별로 표시됩니다."
      />
    )
  }

  const moduleThreshold = activeTab?.threshold ?? 0.515
  const scores = activeTab?.points ?? []
  const isTemporal = activeKey === FORGERY_TEMPORAL_MODULE

  return (
    <div className="mt-5 space-y-4">
      <div
        className={cn(
          "grid gap-1 rounded-lg bg-slate-50 p-1 text-xs font-bold dark:bg-background",
          tabs.length >= 3 ? "grid-cols-3" : tabs.length === 2 ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectTab(tab.key)}
            className={cn(
              "rounded-md px-2 py-2 transition-colors",
              activeKey === tab.key
                ? "bg-white text-slate-950 shadow-sm dark:bg-card dark:text-foreground"
                : "text-slate-500 hover:text-slate-700 dark:text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab ? (
        <>
          <p className="text-xs font-semibold text-slate-500">{activeTab.description}</p>

          {scores.length > 0 ? (
            <>
              <div className="rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
                <FrameRiskChart
                  scores={scores}
                  threshold={moduleThreshold}
                  title={`${activeTab.label} ${isTemporal ? "클립별" : "프레임별"} 위험도`}
                />
              </div>
              <SegmentList segments={activeTab.segments} onSeek={onSeek} />
            </>
          ) : (
            <EmptyTimelineMessage
              title={`${activeTab.label} 프레임 데이터가 없습니다.`}
              description="해당 모듈이 frameRisks 또는 clipRisks를 보고하면 시간축 차트가 표시됩니다."
            />
          )}
        </>
      ) : null}
    </div>
  )
}

function SegmentList({
  segments,
  onSeek,
}: {
  segments: ForgeryTimelineTab["segments"]
  onSeek: (seconds: number) => void
}) {
  if (segments.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
      <h4 className="text-sm font-bold text-slate-950 dark:text-foreground">의심 구간 목록</h4>
      <div className="mt-3 space-y-2">
        {segments.map((segment, index) => (
          <button
            key={`${segment.startTime}-${segment.endTime}-${index}`}
            type="button"
            onClick={() => onSeek(segment.startTime)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:border-border dark:hover:bg-secondary/40"
          >
            <span className="font-mono text-sm font-semibold text-slate-950 dark:text-foreground">
              {formatDuration(segment.startTime)} ~ {formatDuration(segment.endTime)}
            </span>
            <span className="text-sm font-bold text-red-700">
              {Math.round(normalizeResultValue(segment.maxRiskScore) * 100)} / 100
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EmptyTimelineMessage({ title, description }: { title: string; description?: string }) {
  return (
    <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400 dark:border-border dark:bg-background">
      {title}
      {description ? (
        <>
          <br />
          <span className="mt-2 inline-block text-xs font-medium leading-5 text-slate-400">{description}</span>
        </>
      ) : null}
    </p>
  )
}
