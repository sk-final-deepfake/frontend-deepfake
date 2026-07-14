"use client"

import { useEffect, useMemo, useState, type ReactNode, type RefObject } from "react"
import { FileVideo, Loader2 } from "lucide-react"

import {
  ProtectedEvidencePlayer,
  type ProtectedSecurityEvent,
} from "@/components/protected-evidence-player"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import {
  fetchOverlayJobStatus,
  requestOverlayGeneration,
  type OverlayJobStatusResponse,
} from "@/lib/evidence-api"
import type { HlsPlayback } from "@/lib/hls-playback"
import { cn } from "@/lib/utils"

import {
  buildModelOverlayOptions,
  findOverlayOption,
  getDefaultOverlaySelection,
  isDeepfakeOverlayBlocked,
  overlayModuleApiPath,
  resolveDeepfakeOverlayAdvisory,
  type ModelOverlayOption,
  type OverlayCategory,
  type ResultMediaView,
} from "../_lib/model-overlays"
import { ModelOverlayLayer } from "./model-overlay-layer"

type ResultEvidenceMediaProps = {
  evidenceDetail: EvidenceDetailData
  selectedEvidenceId: number | null
  hlsPlayback: HlsPlayback | null
  videoRef: RefObject<HTMLVideoElement | null>
  onSecurityEvent: (event: ProtectedSecurityEvent) => void
  onSeek?: (seconds: number) => void
  onMediaContextChange?: (context: string) => void
  onOverlayReady?: () => void
  renderHeatStrip: (props: {
    scores: import("@/lib/api/evidence-detail").FrameScore[]
    caption: string
    onSeek?: (seconds: number) => void
  }) => ReactNode
  renderWatermark: ReactNode
}

type OverlayJobUiState = {
  jobId: number
  module: string
  status: string
  progress: number
  errorMessage?: string | null
}

export function ResultEvidenceMedia({
  evidenceDetail,
  selectedEvidenceId,
  hlsPlayback,
  videoRef,
  onSecurityEvent,
  onSeek,
  onMediaContextChange,
  onOverlayReady,
  renderHeatStrip,
  renderWatermark,
}: ResultEvidenceMediaProps) {
  const overlayOptions = useMemo(() => buildModelOverlayOptions(evidenceDetail), [evidenceDetail])
  const defaultSelection = useMemo(() => getDefaultOverlaySelection(overlayOptions), [overlayOptions])
  const deepfakeOverlayBlocked = isDeepfakeOverlayBlocked(evidenceDetail)
  const deepfakeAdvisoryMessage = resolveDeepfakeOverlayAdvisory(evidenceDetail.analysisInfo.errorCode)

  const [mediaView, setMediaView] = useState<ResultMediaView>("original")
  const [overlayCategory, setOverlayCategory] = useState<OverlayCategory>(defaultSelection.category)
  const [selectedOverlayId, setSelectedOverlayId] = useState(defaultSelection.overlayId)
  const [jobByModule, setJobByModule] = useState<Record<string, OverlayJobUiState>>({})
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    setOverlayCategory(defaultSelection.category)
    setSelectedOverlayId(defaultSelection.overlayId)
  }, [selectedEvidenceId, defaultSelection.category, defaultSelection.overlayId])

  const activeOverlay =
    findOverlayOption(overlayOptions, selectedOverlayId) ??
    overlayOptions.find((item) => item.category === overlayCategory) ??
    overlayOptions[0] ??
    null

  const activeModulePath = activeOverlay ? overlayModuleApiPath(activeOverlay.id) : null
  const activeJob = activeModulePath ? jobByModule[activeModulePath] : undefined
  const isGenerating =
    Boolean(activeJob) &&
    (activeJob?.status === "QUEUED" || activeJob?.status === "PROCESSING")

  useEffect(() => {
    if (!onMediaContextChange) return
    if (mediaView === "original") {
      onMediaContextChange("original")
      return
    }
    onMediaContextChange(`overlay:${activeOverlay?.id ?? selectedOverlayId}`)
  }, [mediaView, activeOverlay?.id, selectedOverlayId, onMediaContextChange])

  useEffect(() => {
    const evidenceId = selectedEvidenceId
    if (!evidenceId) return

    const activeJobs = Object.values(jobByModule).filter(
      (job) => job.status === "QUEUED" || job.status === "PROCESSING"
    )
    if (activeJobs.length === 0) return

    let cancelled = false
    const poll = async () => {
      for (const job of activeJobs) {
        try {
          const status = await fetchOverlayJobStatus(evidenceId, job.jobId)
          if (cancelled) return
          applyJobStatus(status)
          if (status.status === "COMPLETED") {
            onOverlayReady?.()
          }
        } catch {
          // keep previous progress; next tick retries
        }
      }
    }

    void poll()
    const timer = window.setInterval(() => {
      if (document.hidden) return
      void poll()
    }, 1500)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [jobByModule, onOverlayReady, selectedEvidenceId])

  function applyJobStatus(status: OverlayJobStatusResponse) {
    setJobByModule((current) => ({
      ...current,
      [status.module]: {
        jobId: status.overlayJobId,
        module: status.module,
        status: status.status,
        progress: status.progressPercent ?? 0,
        errorMessage: status.errorMessage,
      },
    }))
  }

  async function handleGenerateOverlay() {
    if (!selectedEvidenceId || !activeModulePath || !activeOverlay) return
    if (activeOverlay.overlayVideoUrl) return
    setGenerateError(null)
    setIsRequesting(true)
    try {
      const status = await requestOverlayGeneration(selectedEvidenceId, activeModulePath)
      applyJobStatus(status)
      if (status.status === "COMPLETED") {
        onOverlayReady?.()
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "오버레이 생성 요청에 실패했습니다.")
    } finally {
      setIsRequesting(false)
    }
  }

  const categoryOptions = overlayOptions.filter((item) => item.category === overlayCategory)
  const useOverlaySrc = mediaView === "overlay"
  const activeOverlayUrl = useOverlaySrc ? activeOverlay?.overlayVideoUrl ?? null : null
  const useOverlayMp4 = useOverlaySrc && Boolean(activeOverlayUrl)
  const useOverlayPreview =
    useOverlaySrc &&
    !activeOverlayUrl &&
    Boolean(activeOverlay?.ready) &&
    !(activeOverlay?.category === "deepfake" && deepfakeOverlayBlocked)
  const hasHlsOriginal =
    hlsPlayback?.hlsStatus === "READY" &&
    Boolean(hlsPlayback.streamToken) &&
    Boolean(hlsPlayback.manifestPath)
  const showResultPlayer =
    useOverlaySrc ? useOverlayMp4 || useOverlayPreview || hasHlsOriginal || Boolean(hlsPlayback) : hasHlsOriginal || Boolean(hlsPlayback)
  const playerSurfaceKey = useOverlaySrc
    ? `overlay-${activeOverlay?.id ?? "none"}-${activeOverlayUrl ?? (useOverlayPreview ? "preview" : "pending")}`
    : `hls-${hlsPlayback?.streamToken ?? hlsPlayback?.hlsStatus ?? "pending"}`

  const heatScores = useOverlaySrc
    ? activeOverlay?.timelineScores ?? []
    : overlayOptions.find((item) => item.id === "deepfake:cnn")?.timelineScores ?? []

  const heatCaption = useOverlaySrc
    ? activeOverlay?.timelineCaption ?? "타임라인 위험도"
    : "Xception 타임라인 위험도"

  const showDeepfakeAdvisory =
    useOverlaySrc && activeOverlay?.category === "deepfake" && Boolean(deepfakeAdvisoryMessage)

  const canRequestOverlay =
    useOverlaySrc &&
    Boolean(activeModulePath) &&
    !activeOverlayUrl &&
    !showDeepfakeAdvisory &&
    Boolean(activeOverlay?.ready || activeOverlay)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-none lg:sticky lg:top-4 lg:self-start dark:border-border dark:bg-card">
      <div className="mb-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-foreground">증거 영상</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              원본과 모델별 오버레이를 같은 위치에서 비교합니다.
            </p>
          </div>
          <div className="flex rounded-full bg-slate-950/80 p-1 backdrop-blur-sm">
            {(
              [
                ["original", "원본"],
                ["overlay", "오버레이"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                  mediaView === mode ? "bg-teal-500 text-white" : "text-white/80 hover:text-white"
                )}
                onClick={() => setMediaView(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mediaView === "overlay" ? (
          <ModelOverlayPicker
            overlayCategory={overlayCategory}
            selectedOverlayId={activeOverlay?.id ?? selectedOverlayId}
            options={overlayOptions}
            categoryOptions={categoryOptions}
            deepfakeOverlayBlocked={deepfakeOverlayBlocked}
            hasGeneratedUrl={(id) => Boolean(findOverlayOption(overlayOptions, id)?.overlayVideoUrl)}
            onCategoryChange={(category) => {
              setOverlayCategory(category)
              const firstInCategory = overlayOptions.find((item) => item.category === category)
              if (firstInCategory) setSelectedOverlayId(firstInCategory.id)
            }}
            onSelectOverlay={setSelectedOverlayId}
          />
        ) : null}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
        {showResultPlayer ? (
          <ProtectedEvidencePlayer
            key={`result-player-${selectedEvidenceId ?? "none"}-${playerSurfaceKey}`}
            src={useOverlayMp4 ? activeOverlayUrl : null}
            playback={useOverlayMp4 ? null : hlsPlayback}
            fallbackOpenUrl={useOverlayMp4 ? activeOverlayUrl : null}
            videoRef={videoRef}
            objectFit="cover"
            onSecurityEvent={onSecurityEvent}
          >
            {useOverlayPreview ? <ModelOverlayLayer option={activeOverlay} videoRef={videoRef} /> : null}
            {mediaView === "original" ? renderWatermark : null}
            {useOverlaySrc && activeOverlay ? (
              <div className="absolute left-4 top-4 z-20 max-w-[70%] space-y-1">
                <div className="rounded-md bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
                  {activeOverlay.label} 오버레이
                </div>
                <div className="rounded-md bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold text-white/85">
                  {activeOverlay.overlayBadge}
                </div>
              </div>
            ) : null}
            {isGenerating ? (
              <div className="absolute inset-x-0 bottom-0 z-30 bg-black/70 px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-white/90">
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    baked 오버레이 생성 중
                  </span>
                  <span>{Math.max(0, Math.min(100, activeJob?.progress ?? 0))}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-[width] duration-300"
                    style={{ width: `${Math.max(2, Math.min(100, activeJob?.progress ?? 0))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </ProtectedEvidencePlayer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-bold text-white/60">
            <FileVideo className="mb-3 size-8" aria-hidden="true" />
            미리보기 가능한 영상이 없습니다.
          </div>
        )}
      </div>

      {canRequestOverlay ? (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-border dark:bg-background">
          <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-muted-foreground">
            {useOverlayPreview
              ? "지금은 원본 위 미리보기입니다. baked 오버레이 MP4를 만들면 모델 산출 영상을 재생할 수 있습니다."
              : activeOverlay?.pendingMessage}
          </p>
          {activeJob?.status === "FAILED" ? (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              {activeJob.errorMessage || "오버레이 생성에 실패했습니다. 다시 시도해 주세요."}
            </p>
          ) : null}
          {generateError ? (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{generateError}</p>
          ) : null}
          <button
            type="button"
            disabled={isRequesting || isGenerating}
            onClick={() => void handleGenerateOverlay()}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition-colors",
              isRequesting || isGenerating
                ? "cursor-not-allowed opacity-60"
                : "hover:bg-teal-500"
            )}
          >
            {isRequesting || isGenerating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                생성 중…
              </>
            ) : (
              "오버레이 생성"
            )}
          </button>
        </div>
      ) : useOverlaySrc && activeOverlay && !activeOverlay.ready ? (
        <p
          className={cn(
            "mt-2 rounded-lg border px-3 py-2 text-xs font-semibold leading-5",
            showDeepfakeAdvisory
              ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-border dark:bg-background dark:text-muted-foreground"
              : "border-dashed border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
          )}
        >
          {showDeepfakeAdvisory ? deepfakeAdvisoryMessage : activeOverlay.pendingMessage}
        </p>
      ) : useOverlayMp4 ? (
        <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold leading-5 text-teal-800 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200">
          baked 오버레이 MP4를 재생 중입니다.
        </p>
      ) : null}

      {heatScores.length > 0 ? (
        renderHeatStrip({
          scores: heatScores,
          caption: heatCaption,
          onSeek,
        })
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-500 dark:bg-background">
          위험 신호가 높은 구간은 프레임 분석 탭에서 모델별로 확인할 수 있습니다.
        </p>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-border">
        <p className="text-[11px] font-bold text-slate-400">분석 유의사항</p>
        <ul className="mt-1.5 space-y-1 text-xs font-medium leading-5 text-slate-500">
          <li>본 결과는 AI 기반 조작 의심 신호 분석이며, 조작 여부를 확정하지 않습니다.</li>
          <li>baked 오버레이는 필요할 때 생성하며, 그동안은 원본 위 미리보기를 사용할 수 있습니다.</li>
          <li>최종 판단은 원본 자료, 사건 맥락, 전문가 검토 결과와 함께 이루어져야 합니다.</li>
        </ul>
      </div>
    </section>
  )
}

function ModelOverlayPicker({
  overlayCategory,
  selectedOverlayId,
  options,
  categoryOptions,
  deepfakeOverlayBlocked,
  hasGeneratedUrl,
  onCategoryChange,
  onSelectOverlay,
}: {
  overlayCategory: OverlayCategory
  selectedOverlayId: string
  options: ModelOverlayOption[]
  categoryOptions: ModelOverlayOption[]
  deepfakeOverlayBlocked: boolean
  hasGeneratedUrl: (overlayId: string) => boolean
  onCategoryChange: (category: OverlayCategory) => void
  onSelectOverlay: (overlayId: string) => void
}) {
  const deepfakeCount = options.filter((item) => item.category === "deepfake").length
  const forgeryCount = options.filter((item) => item.category === "forgery").length

  return (
    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-border dark:bg-background/60">
      <div className="grid grid-cols-2 gap-1 rounded-md bg-white p-1 text-xs font-bold shadow-sm dark:bg-card">
        {(
          [
            ["deepfake", `딥페이크 (${deepfakeCount})`],
            ["forgery", `위변조 (${forgeryCount})`],
          ] as const
        ).map(([category, label]) => (
          <button
            key={category}
            type="button"
            onClick={() => onCategoryChange(category)}
            className={cn(
              "rounded px-2 py-1.5 transition-colors",
              overlayCategory === category
                ? "bg-teal-500 text-white"
                : "text-slate-500 hover:bg-slate-50 dark:text-muted-foreground dark:hover:bg-secondary/40"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "grid gap-1",
          categoryOptions.length >= 3 ? "grid-cols-3" : categoryOptions.length === 2 ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {categoryOptions.map((option) => {
          const generated = hasGeneratedUrl(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectOverlay(option.id)}
              className={cn(
                "flex flex-col items-start rounded-md border px-2.5 py-2 text-left transition-colors",
                selectedOverlayId === option.id
                  ? "border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-950/30"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-border dark:bg-card"
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-950 dark:text-foreground">{option.shortLabel}</span>
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    generated
                      ? "bg-teal-500"
                      : option.ready
                        ? "bg-amber-400"
                        : "bg-slate-300 dark:bg-slate-600"
                  )}
                  title={
                    generated
                      ? "baked 오버레이 준비됨"
                      : option.category === "deepfake" && deepfakeOverlayBlocked
                        ? "오버레이 없음"
                        : option.ready
                          ? "미리보기 가능 · 생성 대기"
                          : "데이터 대기"
                  }
                />
              </span>
              <span className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-4 text-slate-500">
                {option.overlayBadge}
              </span>
            </button>
          )
        })}
      </div>

      {categoryOptions.length === 0 ? (
        <p className="text-center text-xs font-semibold text-slate-400">
          {overlayCategory === "forgery"
            ? "위변조 모듈 결과가 없습니다."
            : "딥페이크 모듈 타임라인이 없습니다."}
        </p>
      ) : null}
    </div>
  )
}
