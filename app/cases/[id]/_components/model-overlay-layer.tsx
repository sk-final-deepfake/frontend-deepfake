"use client"

import { useEffect, useMemo, useState, type RefObject } from "react"

import { normalizeResultValue } from "@/lib/api/analysis-result-ui"

import type { ModelOverlayOption, OverlaySpatialBBox } from "../_lib/model-overlays"

type ModelOverlayLayerProps = {
  option: ModelOverlayOption | null
  videoRef: RefObject<HTMLVideoElement | null>
}

/** TruFor samples ~16 frames — allow wider sync than deepfake per-frame scores. */
const SPATIAL_MATCH_SEC = 2.5

function normalizeRawBboxes(
  raw: NonNullable<ModelOverlayOption["spatialMarkers"][number]["rawBboxes"]>,
  videoWidth: number,
  videoHeight: number,
  fallbackScore: number
): OverlaySpatialBBox[] {
  if (videoWidth <= 0 || videoHeight <= 0) return []
  return raw
    .map((box) => ({
      x: Math.max(0, Math.min(1, Number(box.x) / videoWidth)),
      y: Math.max(0, Math.min(1, Number(box.y) / videoHeight)),
      w: Math.max(0.01, Math.min(1, Number(box.w) / videoWidth)),
      h: Math.max(0.01, Math.min(1, Number(box.h) / videoHeight)),
      score: Number(box.score ?? fallbackScore) || 0,
    }))
    .filter((box) => box.w > 0 && box.h > 0)
}

function markerHasBoxes(marker: ModelOverlayOption["spatialMarkers"][number]) {
  return (marker.bboxes?.length ?? 0) > 0 || (marker.rawBboxes?.length ?? 0) > 0
}

function resolveMarkerBoxes(
  marker: ModelOverlayOption["spatialMarkers"][number] | null,
  videoWidth: number,
  videoHeight: number
): OverlaySpatialBBox[] {
  if (!marker) return []
  if (marker.bboxes?.length) return marker.bboxes
  if (marker.rawBboxes?.length) {
    return normalizeRawBboxes(marker.rawBboxes, videoWidth, videoHeight, marker.score)
  }
  return []
}

type BannerTone = {
  border: string
  band: string
  badge: string
}

const TONE_RED: BannerTone = {
  border: "border-red-500",
  band: "bg-red-600/88",
  badge: "bg-red-800/95",
}

const TONE_ORANGE: BannerTone = {
  border: "border-orange-500",
  band: "bg-orange-600/88",
  badge: "bg-orange-800/95",
}

const TONE_CYAN: BannerTone = {
  border: "border-cyan-500",
  band: "bg-cyan-700/88",
  badge: "bg-cyan-900/95",
}

/**
 * Always-on border + top banner. Intensity tracks risk; numbers always update.
 */
function ScoreBannerOverlay({
  tone,
  riskScore,
  modelLabel,
  elevated,
}: {
  tone: BannerTone
  riskScore: number
  modelLabel: string
  elevated: boolean
}) {
  const risk = normalizeResultValue(riskScore)
  const riskText = risk.toFixed(2)
  const scorePct = Math.round(risk * 100)
  const borderOpacity = 0.45 + risk * 0.5
  const bandOpacity = 0.55 + risk * 0.4

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className={`absolute inset-0 border-[3px] sm:border-4 ${tone.border}`}
        style={{ opacity: borderOpacity }}
      />

      <div
        className={`absolute inset-x-0 top-0 flex min-h-[28px] items-center px-2.5 sm:min-h-[32px] sm:px-3.5 ${tone.band}`}
        style={{ height: "7.2%", opacity: bandOpacity }}
      >
        <p
          className="max-w-full truncate text-[11px] font-semibold leading-none tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-sm sm:tracking-normal md:text-[15px]"
          title={`${modelLabel}  risk=${riskText}`}
        >
          <span className="font-bold">{modelLabel}</span>
          <span className="mx-1.5 opacity-80">risk=</span>
          <span className="tabular-nums font-bold">{riskText}</span>
          {elevated ? <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide opacity-90 sm:text-xs">HIGH</span> : null}
        </p>
      </div>

      <div
        className={`absolute bottom-3 left-3 max-w-[min(90%,20rem)] truncate rounded-md ${tone.badge} px-2.5 py-1 text-[11px] font-bold leading-tight text-white sm:bottom-4 sm:left-4 sm:text-xs`}
      >
        {modelLabel} · risk {scorePct}점
      </div>
    </div>
  )
}

function riskAtTime(
  clipWindows: ModelOverlayOption["clipWindows"],
  currentTime: number
): number {
  if (!clipWindows.length) return 0
  const hit = clipWindows.find(
    (clip) => currentTime >= clip.startTimeSec && currentTime <= clip.endTimeSec
  )
  if (hit) return normalizeResultValue(hit.riskScore)

  // Nearest window score (keep frame readable between sparse hits).
  let best = clipWindows[0]
  let bestDelta = Number.POSITIVE_INFINITY
  for (const clip of clipWindows) {
    const mid = (clip.startTimeSec + clip.endTimeSec) / 2
    const delta = Math.abs(mid - currentTime)
    if (delta < bestDelta) {
      best = clip
      bestDelta = delta
    }
  }
  // Far from any window → show 0 rather than a misleading distant score.
  if (bestDelta > 1.5) return 0
  return normalizeResultValue(best.riskScore)
}

export function ModelOverlayLayer({ option, videoRef }: ModelOverlayLayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const sync = () => {
      setCurrentTime(video.currentTime)
      const w = video.videoWidth || 0
      const h = video.videoHeight || 0
      if (w > 0 && h > 0) setVideoSize({ width: w, height: h })
    }
    sync()
    video.addEventListener("timeupdate", sync)
    video.addEventListener("seeked", sync)
    video.addEventListener("loadedmetadata", sync)
    return () => {
      video.removeEventListener("timeupdate", sync)
      video.removeEventListener("seeked", sync)
      video.removeEventListener("loadedmetadata", sync)
    }
  }, [videoRef, option?.id])

  const threshold = option?.detectionThreshold ?? 0.6
  const elevateFloor = Math.max(0.12, threshold * 0.35)

  const activeClip = useMemo(() => {
    if (!option?.clipWindows.length) return null
    return (
      option.clipWindows.find(
        (clip) => currentTime >= clip.startTimeSec && currentTime <= clip.endTimeSec
      ) ?? null
    )
  }, [option?.clipWindows, currentTime])

  const bannerRisk = useMemo(() => {
    if (!option) return 0
    return riskAtTime(option.clipWindows, currentTime)
  }, [option, currentTime])

  const activeSpatial = useMemo(() => {
    if (!option?.spatialMarkers.length) return null
    const withBoxes = option.spatialMarkers.filter(markerHasBoxes)
    const pool = withBoxes.length > 0 ? withBoxes : option.spatialMarkers
    let best: (typeof option.spatialMarkers)[number] | null = null
    let bestDelta = Number.POSITIVE_INFINITY
    for (const marker of pool) {
      const delta = Math.abs(marker.timeSec - currentTime)
      if (delta <= SPATIAL_MATCH_SEC && delta < bestDelta) {
        best = marker
        bestDelta = delta
      }
    }
    return best
  }, [option?.spatialMarkers, currentTime])

  const anyTamperBoxes = useMemo(
    () => option?.spatialMarkers.some(markerHasBoxes) ?? false,
    [option?.spatialMarkers]
  )

  const cnnRisk = useMemo(() => {
    if (!option) return 0
    if (activeSpatial) return normalizeResultValue(activeSpatial.score)
    // Fall back to nearest timeline sample if spatial markers are sparse.
    const scores = option.timelineScores
    if (!scores.length) return 0
    let best = scores[0]
    let bestDelta = Number.POSITIVE_INFINITY
    for (const point of scores) {
      const t = Number(point.timeSec)
      if (!Number.isFinite(t)) continue
      const delta = Math.abs(t - currentTime)
      if (delta < bestDelta) {
        best = point
        bestDelta = delta
      }
    }
    if (!Number.isFinite(bestDelta) || bestDelta > 1.0) return 0
    return normalizeResultValue(best.score)
  }, [option, activeSpatial, currentTime])

  if (!option) return null

  const label = option.label
  const isForgerySpatial = option.id === "forgery:forgery_spatial"
  const isForgeryTemporal = option.id === "forgery:forgery_temporal"
  const isDeepfakeTemporal = option.id === "deepfake:temporal"
  const isDeepfakeOptical = option.id === "deepfake:optical"
  const isDeepfakeCnn = option.id === "deepfake:cnn"

  if (isDeepfakeTemporal || isDeepfakeOptical) {
    return (
      <ScoreBannerOverlay
        tone={isDeepfakeOptical ? TONE_CYAN : TONE_RED}
        riskScore={bannerRisk}
        modelLabel={isDeepfakeOptical ? "GMFlow" : "TimeSformer"}
        elevated={bannerRisk >= elevateFloor}
      />
    )
  }

  if (isForgeryTemporal) {
    return (
      <ScoreBannerOverlay
        tone={TONE_ORANGE}
        riskScore={bannerRisk}
        modelLabel={label}
        elevated={bannerRisk >= elevateFloor}
      />
    )
  }

  if (isForgerySpatial) {
    const score = activeSpatial ? normalizeResultValue(activeSpatial.score) : cnnRisk
    const scorePct = Math.round(score * 100)
    const boxes = resolveMarkerBoxes(activeSpatial, videoSize.width, videoSize.height)
    const statusHint = !anyTamperBoxes
      ? " · bbox 없음(최신 GPU로 재분석 필요)"
      : boxes.length === 0
        ? " · 이 구간 샘플 없음"
        : null
    return (
      <div className="pointer-events-none absolute inset-0">
        {boxes.length > 0 ? (
          boxes.map((box, idx) => {
            const boxScore = normalizeResultValue(box.score)
            const tone = boxScore >= elevateFloor ? "border-orange-500 bg-orange-500/18" : "border-amber-400 bg-amber-400/12"
            return (
              <div
                key={`${box.x}-${box.y}-${idx}`}
                className={`absolute rounded-sm border-2 ${tone}`}
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  opacity: 0.45 + boxScore * 0.5,
                }}
              />
            )
          })
        ) : null}
        <div className="absolute bottom-4 left-4 rounded-md bg-orange-600/95 px-2.5 py-1 text-xs font-bold text-white">
          {label} · risk {scorePct}점
          {statusHint}
        </div>
      </div>
    )
  }

  if (isDeepfakeCnn) {
    const scorePct = Math.round(cnnRisk * 100)
    return (
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-[39%] top-[20%] h-[34%] w-[24%] rounded-[18%] border-2 border-red-700 bg-red-700/15"
          style={{ opacity: 0.45 + cnnRisk * 0.5 }}
        />
        <div
          className="absolute left-[43%] top-[38%] h-[7%] w-[16%] rounded-sm bg-yellow-300/55"
          style={{ opacity: 0.35 + cnnRisk * 0.55 }}
        />
        <div className="absolute bottom-4 left-4 rounded-md bg-red-700/95 px-2.5 py-1 text-xs font-bold text-white">
          {label} · risk {scorePct}점
        </div>
      </div>
    )
  }

  const fallbackRisk = activeClip ? normalizeResultValue(activeClip.riskScore) : bannerRisk
  return (
    <ScoreBannerOverlay
      tone={TONE_ORANGE}
      riskScore={fallbackRisk}
      modelLabel={label}
      elevated={fallbackRisk >= elevateFloor}
    />
  )
}
