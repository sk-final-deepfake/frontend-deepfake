"use client"

import { useEffect, useState, type RefObject } from "react"

import {
  buildTopRiskFrames,
  normalizeResultValue,
} from "@/lib/api/analysis-result-ui"
import type { EvidenceDetailData, FrameScore, RepresentativeFrame } from "@/lib/api/evidence-detail"
import type { HlsPlayback } from "@/lib/hls-playback"
import { cn } from "@/lib/utils"

import {
  buildForgeryRepresentativeFrames,
  FORGERY_SPATIAL_MODULE,
  FORGERY_TEMPORAL_MODULE,
} from "../_lib/forgery-ui"
import {
  buildDeepfakeTimelineTabs,
  buildForgeryTimelineTabs,
  summarizeFrameScores,
  type DeepfakeTimelineTab,
  type ForgeryTimelineTab,
} from "../_lib/module-timelines"
import { FrameRiskChart } from "./frame-risk-chart"
import { VideoSeekThumbnail, type VideoSeekThumbnailStatus } from "./video-seek-thumbnail"

const REPRESENTATIVE_MATCH_MAX_DELTA_SEC = 2

type ResultFrameAnalysisProps = {
  evidenceDetail: EvidenceDetailData
  detectionThreshold: number
  representativeFrames: RepresentativeFrame[]
  videoRef: RefObject<HTMLVideoElement | null>
  hlsPlayback: HlsPlayback | null
  onSeek: (seconds: number) => void
}

type AnalysisCategory = "deepfake" | "forgery"

export function ResultFrameAnalysis({
  evidenceDetail,
  detectionThreshold,
  representativeFrames,
  videoRef,
  hlsPlayback,
  onSeek,
}: ResultFrameAnalysisProps) {
  const [category, setCategory] = useState<AnalysisCategory>("deepfake")
  const deepfakeTabs = buildDeepfakeTimelineTabs(evidenceDetail, detectionThreshold)
  // Overlay cards stay score-sorted; frame-analysis tabs keep a stable TruFor → TimeSformer order
  // so low-score cases still open the same chart layout as high-score fakes.
  const forgeryTabs = [...buildForgeryTimelineTabs(evidenceDetail, detectionThreshold)].sort((a, b) => {
    const order = (key: string) =>
      key === "forgery_spatial" ? 0 : key === "forgery_temporal" ? 1 : 2
    return order(a.key) - order(b.key)
  })
  const [deepfakeKey, setDeepfakeKey] = useState(deepfakeTabs[0]?.key ?? "cnn")
  const [forgeryKey, setForgeryKey] = useState(
    () =>
      forgeryTabs.find((tab) => tab.key === FORGERY_SPATIAL_MODULE)?.key ??
      forgeryTabs[0]?.key ??
      ""
  )

  const forgeryTabKeys = forgeryTabs.map((tab) => tab.key).join("|")

  useEffect(() => {
    setForgeryKey(
      forgeryTabs.find((tab) => tab.key === FORGERY_SPATIAL_MODULE)?.key ??
      forgeryTabs[0]?.key ??
      ""
    )
  }, [evidenceDetail.evidenceInfo.evidenceId, forgeryTabKeys])

  const activeDeepfakeTab = deepfakeTabs.find((tab) => tab.key === deepfakeKey) ?? deepfakeTabs[0]
  const activeForgeryTab = forgeryTabs.find((tab) => tab.key === forgeryKey) ?? forgeryTabs[0]

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-foreground">프레임 분석</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            딥페이크 모델(Xception·TimeSformer·GMFlow)과 위변조 모델을 분리해 확인합니다.
          </p>
        </div>
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

      {category === "deepfake" ? (
        <DeepfakeFrameAnalysis
          tabs={deepfakeTabs}
          activeTab={activeDeepfakeTab}
          activeKey={activeDeepfakeTab?.key ?? "cnn"}
          onSelectTab={setDeepfakeKey}
          detectionThreshold={detectionThreshold}
          representativeFrames={representativeFrames}
          evidenceDetail={evidenceDetail}
          videoRef={videoRef}
          hlsPlayback={hlsPlayback}
          onSeek={onSeek}
        />
      ) : (
        <ForgeryFrameAnalysis
          tabs={forgeryTabs}
          activeTab={activeForgeryTab}
          activeKey={activeForgeryTab?.key ?? ""}
          onSelectTab={setForgeryKey}
          evidenceDetail={evidenceDetail}
          representativeFrames={representativeFrames}
          videoRef={videoRef}
          hlsPlayback={hlsPlayback}
          onSeek={onSeek}
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
  detectionThreshold,
  representativeFrames,
  evidenceDetail,
  videoRef,
  hlsPlayback,
  onSeek,
}: {
  tabs: DeepfakeTimelineTab[]
  activeTab?: DeepfakeTimelineTab
  activeKey: string
  onSelectTab: (key: DeepfakeTimelineTab["key"]) => void
  detectionThreshold: number
  representativeFrames: RepresentativeFrame[]
  evidenceDetail: EvidenceDetailData
  videoRef: RefObject<HTMLVideoElement | null>
  hlsPlayback: HlsPlayback | null
  onSeek: (seconds: number) => void
}) {
  const scores = activeTab?.points ?? []
  const summary = summarizeFrameScores(scores, detectionThreshold)
  const topRiskFrames = buildTopRiskFrames(evidenceDetail, scores)

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
            <>
              <MetricGrid
                summary={summary}
                scores={scores}
                detectionThreshold={detectionThreshold}
                unitLabel={activeTab.unitLabel}
              />

              <div className="rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
                <FrameRiskChart
                  scores={scores}
                  threshold={activeTab.threshold}
                  title={activeTab.title}
                  emptyMessage={`${activeTab.label} 타임라인 데이터가 없습니다.`}
                />
              </div>

              {topRiskFrames.length > 0 ? (
                <TopRiskFrameList
                  frames={topRiskFrames}
                  representativeFrames={representativeFrames}
                  videoRef={videoRef}
                  hlsPlayback={hlsPlayback}
                  onSeek={onSeek}
                />
              ) : null}
            </>
          ) : (
            <EmptyTimelineMessage
              title={`${activeTab.label} 타임라인 데이터가 없습니다.`}
              description="백엔드가 moduleTimelines 또는 frameRisks/clipRisks/pairRisks를 제공하면 이 영역에 차트가 표시됩니다."
            />
          )}
        </>
      ) : (
        <EmptyTimelineMessage
          title="딥페이크 모델 타임라인이 없습니다."
          description="분석이 완료된 뒤 모듈별 타임라인이 제공되면 표시됩니다."
        />
      )}
    </div>
  )
}

function ForgeryFrameAnalysis({
  tabs,
  activeTab,
  activeKey,
  onSelectTab,
  evidenceDetail,
  representativeFrames,
  videoRef,
  hlsPlayback,
  onSeek,
}: {
  tabs: ForgeryTimelineTab[]
  activeTab?: ForgeryTimelineTab
  activeKey: string
  onSelectTab: (key: string) => void
  evidenceDetail: EvidenceDetailData
  representativeFrames: RepresentativeFrame[]
  videoRef: RefObject<HTMLVideoElement | null>
  hlsPlayback: HlsPlayback | null
  onSeek: (seconds: number) => void
}) {
  if (tabs.length === 0) {
    return (
      <EmptyTimelineMessage
        title="위변조 프레임 분석 데이터가 없습니다."
        description="GPU worker가 forgery_spatial(TruFor) 또는 forgery_temporal(TimeSformer) moduleTimelines를 내면 모델별로 표시됩니다."
      />
    )
  }

  const moduleThreshold = activeTab?.threshold ?? 0.515
  // Keep low-score timelines visible (flat near-zero charts) — do not hide the graph UI.
  const scores =
    activeTab?.points && activeTab.points.length > 0
      ? activeTab.points
      : activeTab
        ? [{ timeSec: 0, score: activeTab.videoScore }]
        : []
  const summary = summarizeFrameScores(scores, moduleThreshold)
  const isTemporal = activeKey === FORGERY_TEMPORAL_MODULE
  const unitLabel = isTemporal ? "클립" : "프레임"
  const chartTitle = isTemporal ? "클립별 위험도" : "프레임별 위험도"
  const topRiskFrames = buildTopRiskFrames(evidenceDetail, scores).map((frame) => ({
    ...frame,
    signal: activeTab?.label ?? "위변조",
  }))
  const forgeryRepresentativeFrames = buildForgeryRepresentativeFrames(evidenceDetail, {
    moduleKey: activeKey,
    maxFrames: 5,
  })
  const thumbFrames = [...forgeryRepresentativeFrames, ...representativeFrames]

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

          <MetricGrid
            summary={summary}
            scores={scores}
            detectionThreshold={moduleThreshold}
            unitLabel={unitLabel}
          />

          <div className="rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
            <FrameRiskChart
              scores={scores}
              threshold={moduleThreshold}
              title={chartTitle}
              emptyMessage={
                activeTab.points.length === 0
                  ? `${activeTab.label} 상세 타임라인이 없어 모듈 점수만 표시합니다.`
                  : `${activeTab.label} 타임라인 데이터가 없습니다.`
              }
            />
          </div>

          {topRiskFrames.length > 0 ? (
            <TopRiskFrameList
              frames={topRiskFrames}
              representativeFrames={thumbFrames}
              videoRef={videoRef}
              hlsPlayback={hlsPlayback}
              onSeek={onSeek}
            />
          ) : null}
        </>
      ) : (
        <EmptyTimelineMessage
          title="위변조 모델 타임라인이 없습니다."
          description="분석이 완료된 뒤 TruFor·TimeSformer 타임라인이 제공되면 표시됩니다."
        />
      )}
    </div>
  )
}

function MetricGrid({
  summary,
  scores,
  detectionThreshold,
  unitLabel,
}: {
  summary: ReturnType<typeof summarizeFrameScores>
  scores: FrameScore[]
  detectionThreshold: number
  unitLabel: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MetricCard
        label="최고 위험"
        value={summary.peakValue}
        sub={summary.peakLabel}
        tone={
          summary.peak != null && normalizeResultValue(summary.peak.score) >= detectionThreshold
            ? "danger"
            : "neutral"
        }
      />
      <MetricCard label="평균 위험도" value={summary.avgValue} sub={`전체 ${unitLabel} 평균`} />
      <MetricCard
        label="임계값 초과"
        value={`${summary.highRiskCount} / ${scores.length}`}
        sub={`위험 점수 ${Math.round(detectionThreshold * 100)}점 이상`}
        tone={summary.highRiskCount > 0 ? "danger" : "neutral"}
      />
      <MetricCard label="표본 수" value={`${scores.length}${unitLabel}`} sub="분석 단위 기준" />
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string
  value: string
  sub?: string
  tone?: "danger" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 dark:border-border dark:bg-card">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-lg font-bold tracking-tight text-slate-950 dark:text-foreground",
          tone === "danger" && "text-red-700"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p> : null}
    </div>
  )
}

function TopRiskFrameRow({
  frame,
  index,
  videoRef,
  imageUrl,
  heatmapImageUrl,
  hlsPlayback,
  onSeek,
}: {
  frame: ReturnType<typeof buildTopRiskFrames>[number]
  index: number
  videoRef: RefObject<HTMLVideoElement | null>
  imageUrl?: string | null
  heatmapImageUrl?: string | null
  hlsPlayback: HlsPlayback | null
  onSeek: (seconds: number) => void
}) {
  const [thumbStatus, setThumbStatus] = useState<VideoSeekThumbnailStatus>(() =>
    imageUrl?.trim() || heatmapImageUrl?.trim() ? "loading" : "loading"
  )
  const showThumb = thumbStatus !== "unavailable"

  return (
    <button
      type="button"
      onClick={() => onSeek(frame.seconds)}
      className="flex w-full items-stretch gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-left transition-colors hover:border-slate-200 hover:bg-white dark:border-border dark:bg-background dark:hover:bg-secondary/30"
    >
      {showThumb ? (
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-slate-950 sm:w-32">
          <VideoSeekThumbnail
            videoRef={videoRef}
            timeSec={frame.seconds}
            imageUrl={imageUrl}
            heatmapImageUrl={heatmapImageUrl}
            label={`${frame.time} 프레임`}
            hlsPlayback={hlsPlayback}
            captureDelayMs={index * 180}
            hideWhenUnavailable
            onStatusChange={setThumbStatus}
          />
          <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {index + 1}
          </span>
        </div>
      ) : (
        <div className="flex w-8 shrink-0 items-center justify-center text-xs font-bold text-slate-400">
          {index + 1}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
        <p className="whitespace-nowrap font-mono text-sm font-semibold text-slate-950 dark:text-foreground">
          {frame.time}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-sm font-bold text-red-700">{frame.score} / 100</p>
          <p className="text-xs font-semibold text-slate-500">{frame.signal}</p>
        </div>
      </div>
    </button>
  )
}

function matchRepresentativeFrame(
  representativeFrames: RepresentativeFrame[],
  seconds: number,
  timeLabel: string
): RepresentativeFrame | null {
  const withMedia = representativeFrames.filter(
    (frame) => Boolean(frame.imageUrl?.trim() || frame.heatmapImageUrl?.trim())
  )
  if (withMedia.length === 0) return null

  const exactTimestamp = withMedia.find((frame) => frame.timestamp === timeLabel)
  if (exactTimestamp) return exactTimestamp

  let best: RepresentativeFrame | null = null
  let bestDelta = REPRESENTATIVE_MATCH_MAX_DELTA_SEC
  for (const frame of withMedia) {
    if (frame.timeSec == null || !Number.isFinite(frame.timeSec)) continue
    const delta = Math.abs(frame.timeSec - seconds)
    if (delta <= bestDelta) {
      best = frame
      bestDelta = delta
    }
  }
  return best
}

function TopRiskFrameList({
  frames,
  representativeFrames,
  videoRef,
  hlsPlayback,
  onSeek,
}: {
  frames: ReturnType<typeof buildTopRiskFrames>
  representativeFrames: RepresentativeFrame[]
  videoRef: RefObject<HTMLVideoElement | null>
  hlsPlayback: HlsPlayback | null
  onSeek: (seconds: number) => void
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 dark:border-border dark:bg-card">
      <div>
        <h4 className="text-sm font-bold text-slate-950 dark:text-foreground">상위 위험 프레임</h4>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">카드를 선택하면 영상이 해당 지점으로 이동합니다.</p>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {frames.map((frame, index) => {
          const representative = matchRepresentativeFrame(
            representativeFrames,
            frame.seconds,
            frame.time
          )
          return (
            <TopRiskFrameRow
              key={`${frame.startSec}-${frame.endSec}-${frame.score}-${index}`}
              frame={frame}
              index={index}
              videoRef={videoRef}
              imageUrl={representative?.imageUrl}
              heatmapImageUrl={representative?.heatmapImageUrl}
              hlsPlayback={hlsPlayback}
              onSeek={onSeek}
            />
          )
        })}
      </div>
    </div>
  )
}

function EmptyTimelineMessage({ title, description }: { title: string; description: string }) {
  return (
    <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400 dark:border-border dark:bg-background">
      {title}
      <br />
      <span className="mt-2 inline-block text-xs font-medium leading-5 text-slate-400">{description}</span>
    </p>
  )
}
