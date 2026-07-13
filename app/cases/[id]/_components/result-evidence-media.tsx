"use client"

import { useEffect, useMemo, useState, type ReactNode, type RefObject } from "react"
import { FileVideo } from "lucide-react"

import {
  ProtectedEvidencePlayer,
  type ProtectedSecurityEvent,
} from "@/components/protected-evidence-player"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import type { HlsPlayback } from "@/lib/hls-playback"
import { cn } from "@/lib/utils"

import {
  buildModelOverlayOptions,
  findOverlayOption,
  getDefaultOverlaySelection,
  type ModelOverlayOption,
  type OverlayCategory,
  type ResultMediaView,
} from "../_lib/model-overlays"

type ResultEvidenceMediaProps = {
  evidenceDetail: EvidenceDetailData
  selectedEvidenceId: number | null
  hlsPlayback: HlsPlayback | null
  videoRef: RefObject<HTMLVideoElement | null>
  onSecurityEvent: (event: ProtectedSecurityEvent) => void
  onSeek?: (seconds: number) => void
  onMediaContextChange?: (context: string) => void
  renderHeatStrip: (props: {
    scores: import("@/lib/api/evidence-detail").FrameScore[]
    caption: string
    onSeek?: (seconds: number) => void
  }) => ReactNode
  renderWatermark: ReactNode
}

export function ResultEvidenceMedia({
  evidenceDetail,
  selectedEvidenceId,
  hlsPlayback,
  videoRef,
  onSecurityEvent,
  onSeek,
  onMediaContextChange,
  renderHeatStrip,
  renderWatermark,
}: ResultEvidenceMediaProps) {
  const overlayOptions = useMemo(() => buildModelOverlayOptions(evidenceDetail), [evidenceDetail])
  const defaultSelection = useMemo(() => getDefaultOverlaySelection(overlayOptions), [overlayOptions])

  const [mediaView, setMediaView] = useState<ResultMediaView>("original")
  const [overlayCategory, setOverlayCategory] = useState<OverlayCategory>(defaultSelection.category)
  const [selectedOverlayId, setSelectedOverlayId] = useState(defaultSelection.overlayId)

  useEffect(() => {
    setOverlayCategory(defaultSelection.category)
    setSelectedOverlayId(defaultSelection.overlayId)
  }, [selectedEvidenceId, defaultSelection.category, defaultSelection.overlayId])

  const activeOverlay =
    findOverlayOption(overlayOptions, selectedOverlayId) ??
    overlayOptions.find((item) => item.category === overlayCategory) ??
    overlayOptions[0] ??
    null

  useEffect(() => {
    if (!onMediaContextChange) return
    if (mediaView === "original") {
      onMediaContextChange("original")
      return
    }
    onMediaContextChange(`overlay:${activeOverlay?.id ?? selectedOverlayId}`)
  }, [mediaView, activeOverlay?.id, selectedOverlayId, onMediaContextChange])

  const categoryOptions = overlayOptions.filter((item) => item.category === overlayCategory)
  const useOverlaySrc = mediaView === "overlay"
  const activeOverlayUrl = useOverlaySrc ? activeOverlay?.overlayVideoUrl ?? null : null
  const hasHlsOriginal =
    hlsPlayback?.hlsStatus === "READY" &&
    Boolean(hlsPlayback.streamToken) &&
    Boolean(hlsPlayback.manifestPath)
  const showResultPlayer = useOverlaySrc ? true : hasHlsOriginal || Boolean(hlsPlayback)
  const playerSurfaceKey = useOverlaySrc
    ? `overlay-${activeOverlay?.id ?? "none"}-${activeOverlayUrl ?? "pending"}`
    : `hls-${hlsPlayback?.streamToken ?? hlsPlayback?.hlsStatus ?? "pending"}`

  const heatScores = useOverlaySrc
    ? activeOverlay?.timelineScores ?? []
    : overlayOptions.find((item) => item.id === "deepfake:cnn")?.timelineScores ?? []

  const heatCaption = useOverlaySrc
    ? activeOverlay?.timelineCaption ?? "타임라인 위험도"
    : "Xception 타임라인 위험도"

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
            src={useOverlaySrc ? activeOverlayUrl : null}
            playback={useOverlaySrc ? null : hlsPlayback}
            fallbackOpenUrl={useOverlaySrc ? activeOverlayUrl : null}
            videoRef={videoRef}
            objectFit="cover"
            onSecurityEvent={onSecurityEvent}
          >
            {useOverlaySrc && !activeOverlayUrl ? (
              <MockModelOverlay option={activeOverlay} />
            ) : null}
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
          </ProtectedEvidencePlayer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-bold text-white/60">
            <FileVideo className="mb-3 size-8" aria-hidden="true" />
            미리보기 가능한 영상이 없습니다.
          </div>
        )}
      </div>

      {useOverlaySrc && activeOverlay && !activeOverlay.ready ? (
        <p className="mt-2 rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          {activeOverlay.pendingMessage}
          <span className="mt-1 block text-[11px] font-medium text-amber-700/80 dark:text-amber-300/80">
            UI는 연동 완료를 가정해 구성되어 있습니다. BE/AI가 `overlayVideoUrl`을 모듈별로 내려주면 자동 재생됩니다.
          </span>
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
          <li>오버레이는 모델별 산출물이 제공된 경우에만 해당 시각화가 재생됩니다.</li>
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
  onCategoryChange,
  onSelectOverlay,
}: {
  overlayCategory: OverlayCategory
  selectedOverlayId: string
  options: ModelOverlayOption[]
  categoryOptions: ModelOverlayOption[]
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
        {categoryOptions.map((option) => (
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
                  option.ready ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"
                )}
                title={option.ready ? "오버레이 제공됨" : "연동 대기"}
              />
            </span>
            <span className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-4 text-slate-500">
              {option.overlayBadge}
            </span>
          </button>
        ))}
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

function MockModelOverlay({ option }: { option: ModelOverlayOption | null }) {
  const label = option?.label ?? "모델"
  const isForgery = option?.category === "forgery"
  const isTemporal = option?.id === "deepfake:temporal"
  const isOptical = option?.id === "deepfake:optical"

  return (
    <div className="pointer-events-none absolute inset-0">
      {isForgery ? (
        <>
          <div className="absolute inset-x-[18%] top-[62%] h-[8%] rounded-sm border-2 border-orange-500 bg-orange-500/20" />
          <div className="absolute bottom-4 left-4 rounded-md bg-orange-600/95 px-2.5 py-1 text-xs font-bold text-white">
            {label} · 편집 구간 미리보기
          </div>
        </>
      ) : isTemporal ? (
        <>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-red-500/80" />
          <div className="absolute inset-x-[8%] top-[12%] h-[76%] rounded-lg border-2 border-dashed border-red-400/70 bg-red-500/10" />
          <div className="absolute bottom-4 left-4 rounded-md bg-red-700/95 px-2.5 py-1 text-xs font-bold text-white">
            TimeSformer · 클립 구간
          </div>
        </>
      ) : isOptical ? (
        <>
          <div className="absolute left-[30%] top-[35%] size-16 rounded-full border-2 border-cyan-400 bg-cyan-400/10" />
          <div className="absolute left-[48%] top-[42%] size-10 rounded-full border-2 border-cyan-300 bg-cyan-300/10" />
          <div className="absolute bottom-4 left-4 rounded-md bg-cyan-700/95 px-2.5 py-1 text-xs font-bold text-white">
            GMFlow · motion 이상
          </div>
        </>
      ) : (
        <>
          <div className="absolute left-[39%] top-[20%] h-[34%] w-[24%] rounded-[18%] border-2 border-red-700 bg-red-700/15 shadow-[0_0_24px_rgba(185,28,28,0.3)]" />
          <div className="absolute left-[43%] top-[38%] h-[7%] w-[16%] rounded-sm bg-yellow-300/55" />
          <div className="absolute bottom-4 left-4 rounded-md bg-red-700/95 px-2.5 py-1 text-xs font-bold text-white">
            {label} · 얼굴 bbox 미리보기
          </div>
        </>
      )}
    </div>
  )
}
