"use client"

import { useEffect, useMemo, useState, type RefObject } from "react"

import { normalizeResultValue } from "@/lib/api/analysis-result-ui"

import type { ModelOverlayOption, OverlaySpatialBBox } from "../_lib/model-overlays"

type ModelOverlayLayerProps = {
  option: ModelOverlayOption | null
  videoRef: RefObject<HTMLVideoElement | null>
}

/**
 * Match nearest TruFor sample. Keep this tight so below-threshold gaps do not
 * keep showing the previous high-risk box across the whole clip.
 */
const SPATIAL_MATCH_SEC = 0.75
/** Max gap between two samples to interpolate across (FE display only). */
const SPATIAL_INTERP_MAX_GAP_SEC = 2.5
/** TruFor: hide broad torso/head blobs; keep compact chest/face peaks. */
const TRUFOR_DISPLAY_MAX_AREA_RATIO = 0.35
const TRUFOR_DISPLAY_MAX_BOXES = 1

type SpatialBoxSample = {
  timeSec: number
  score: number
  boxes: OverlaySpatialBBox[]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpBox(a: OverlaySpatialBBox, b: OverlaySpatialBBox, t: number): OverlaySpatialBBox {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    w: lerp(a.w, b.w, t),
    h: lerp(a.h, b.h, t),
    score: lerp(a.score, b.score, t),
  }
}

function buildSpatialBoxSamples(
  markers: ModelOverlayOption["spatialMarkers"],
  threshold: number,
  videoWidth: number,
  videoHeight: number
): SpatialBoxSample[] {
  return markers
    .filter((marker) => marker.score >= threshold && markerHasBoxes(marker))
    .map((marker) => ({
      timeSec: marker.timeSec,
      score: marker.score,
      boxes: pickDisplayBoxes(resolveMarkerBoxes(marker, videoWidth, videoHeight), {
        maxBoxes: TRUFOR_DISPLAY_MAX_BOXES,
        maxAreaRatio: TRUFOR_DISPLAY_MAX_AREA_RATIO,
      }),
    }))
    .filter((sample) => sample.boxes.length > 0)
    .sort((a, b) => a.timeSec - b.timeSec)
}

/**
 * Interpolate bbox between adjacent TruFor samples so the box tracks smoothly
 * while the playhead moves. Does not change analysis scores/threshold.
 */
function interpolateSpatialAtTime(
  samples: SpatialBoxSample[],
  currentTime: number
): { boxes: OverlaySpatialBBox[]; score: number } | null {
  if (!samples.length) return null

  const first = samples[0]
  const last = samples[samples.length - 1]

  if (currentTime <= first.timeSec) {
    if (first.timeSec - currentTime > SPATIAL_MATCH_SEC) return null
    return { boxes: first.boxes, score: first.score }
  }
  if (currentTime >= last.timeSec) {
    if (currentTime - last.timeSec > SPATIAL_MATCH_SEC) return null
    return { boxes: last.boxes, score: last.score }
  }

  let i = 0
  while (i < samples.length - 1 && samples[i + 1].timeSec < currentTime) i += 1
  const a = samples[i]
  const b = samples[i + 1]
  const gap = b.timeSec - a.timeSec
  if (!(gap > 0)) return { boxes: a.boxes, score: a.score }

  // Large hole between samples → only show when near an endpoint (no inventing).
  if (gap > SPATIAL_INTERP_MAX_GAP_SEC) {
    if (currentTime - a.timeSec <= SPATIAL_MATCH_SEC) {
      return { boxes: a.boxes, score: a.score }
    }
    if (b.timeSec - currentTime <= SPATIAL_MATCH_SEC) {
      return { boxes: b.boxes, score: b.score }
    }
    return null
  }

  const t = (currentTime - a.timeSec) / gap
  const pairCount = Math.min(a.boxes.length, b.boxes.length)
  const boxes: OverlaySpatialBBox[] = []
  for (let j = 0; j < pairCount; j += 1) {
    boxes.push(lerpBox(a.boxes[j], b.boxes[j], t))
  }
  // If counts differ, keep the nearer sample's extra boxes without inventing motion.
  if (pairCount === 0) {
    return currentTime - a.timeSec <= b.timeSec - currentTime
      ? { boxes: a.boxes, score: a.score }
      : { boxes: b.boxes, score: b.score }
  }
  return { boxes, score: lerp(a.score, b.score, t) }
}

/** object-fit: contain 으로 그려진 실제 영상 영역 (플레이어 요소 기준 px) */
type ContainedVideoLayout = {
  left: number
  top: number
  width: number
  height: number
  elementW: number
  elementH: number
}

function getContainedVideoLayout(video: HTMLVideoElement): ContainedVideoLayout | null {
  const elementW = video.clientWidth
  const elementH = video.clientHeight
  const videoW = video.videoWidth
  const videoH = video.videoHeight
  if (elementW <= 0 || elementH <= 0 || videoW <= 0 || videoH <= 0) return null

  const videoAspect = videoW / videoH
  const elementAspect = elementW / elementH
  let width: number
  let height: number
  let left: number
  let top: number

  if (videoAspect > elementAspect) {
    // 좌우 맞춤 → 위아래 레터박스
    width = elementW
    height = elementW / videoAspect
    left = 0
    top = (elementH - height) / 2
  } else {
    // 상하 맞춤 → 좌우 필러박스
    height = elementH
    width = elementH * videoAspect
    top = 0
    left = (elementW - width) / 2
  }

  return { left, top, width, height, elementW, elementH }
}

/** 영상 정규화 좌표(0..1) → 플레이어 컨테이너 % (contain 오프셋 반영) */
function boxToContainPercent(
  box: OverlaySpatialBBox,
  layout: ContainedVideoLayout
): { left: number; top: number; width: number; height: number } {
  const { left, top, width, height, elementW, elementH } = layout
  return {
    left: ((left + box.x * width) / elementW) * 100,
    top: ((top + box.y * height) / elementH) * 100,
    width: (box.w * width / elementW) * 100,
    height: (box.h * height / elementH) * 100,
  }
}

function boxArea(box: OverlaySpatialBBox) {
  return Math.max(0, box.w) * Math.max(0, box.h)
}

function intersectionArea(a: OverlaySpatialBBox, b: OverlaySpatialBBox) {
  const x0 = Math.max(a.x, b.x)
  const y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w, b.x + b.w)
  const y1 = Math.min(a.y + a.h, b.y + b.h)
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
}

type PickDisplayBoxesOptions = {
  maxBoxes?: number
  maxAreaRatio?: number
  containOverlap?: number
}

/**
 * Nested boxes: the smaller one is usually the real local peak.
 * Prefer compact boxes; drop larger parents that mostly contain them.
 * Analysis coords/scores are unchanged — display selection only.
 */
function pickDisplayBoxes(
  boxes: OverlaySpatialBBox[],
  options: PickDisplayBoxesOptions = {}
): OverlaySpatialBBox[] {
  if (!boxes.length) return []

  const maxBoxes = Math.max(1, options.maxBoxes ?? 2)
  const maxAreaRatio = options.maxAreaRatio ?? 1
  const containOverlap = options.containOverlap ?? 0.55

  // Smallest first so localized peaks win over broad blobs.
  const sorted = [...boxes].sort((a, b) => boxArea(a) - boxArea(b) || b.score - a.score)
  const picked: OverlaySpatialBBox[] = []

  for (const box of sorted) {
    if (boxArea(box) > maxAreaRatio) continue

    // Already covered by a tighter box we kept.
    const mostlyInsidePicked = picked.some((keep) => {
      const overlap = intersectionArea(keep, box)
      return overlap / Math.max(boxArea(box), 1e-9) >= containOverlap
    })
    if (mostlyInsidePicked) continue

    // This is a broad parent of a tighter box we already kept — skip.
    const containsPicked = picked.some((keep) => {
      const overlap = intersectionArea(box, keep)
      return overlap / Math.max(boxArea(keep), 1e-9) >= containOverlap
    })
    if (containsPicked) continue

    picked.push(box)
    if (picked.length >= maxBoxes) break
  }
  return picked
}

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

function TamperRegionMarker({
  box,
  layout,
  primary,
  frameScore,
}: {
  box: OverlaySpatialBBox
  layout: ContainedVideoLayout
  primary: boolean
  /** Frame-level TruFor risk for the label (keep analysis score; box is location only). */
  frameScore?: number
}) {
  const pos = boxToContainPercent(box, layout)
  const labelScore =
    typeof frameScore === "number" && Number.isFinite(frameScore)
      ? normalizeResultValue(frameScore)
      : normalizeResultValue(box.score)
  const scorePct = Math.round(labelScore * 100)
  const corner = primary ? "border-[#e11d48]" : "border-[#fb7185]/70"
  const cornerSize = primary ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-2.5 w-2.5"
  const borderW = primary ? "border-[2.5px]" : "border-2"
  // 상단에 붙으면 라벨이 잘리니 박스 안쪽으로 내린다.
  const labelAbove = pos.top >= 7

  return (
    <div
      className="absolute transition-[left,top,width,height] duration-75 ease-linear"
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: `${pos.width}%`,
        height: `${pos.height}%`,
      }}
    >
      {primary ? (
        <div className="absolute inset-0 bg-[#e11d48]/18 mix-blend-multiply" />
      ) : (
        <div className="absolute inset-0 border border-dashed border-[#fb7185]/55 bg-[#e11d48]/06" />
      )}

      <div className={`absolute left-0 top-0 ${cornerSize} ${borderW} ${corner} border-b-0 border-r-0`} />
      <div className={`absolute right-0 top-0 ${cornerSize} ${borderW} ${corner} border-b-0 border-l-0`} />
      <div className={`absolute bottom-0 left-0 ${cornerSize} ${borderW} ${corner} border-t-0 border-r-0`} />
      <div className={`absolute bottom-0 right-0 ${cornerSize} ${borderW} ${corner} border-t-0 border-l-0`} />

      {primary ? (
        <div
          className={`absolute left-0 z-10 flex max-w-[min(100%,14rem)] items-center gap-1.5 whitespace-nowrap rounded-sm bg-[#9f1239]/95 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm sm:text-[11px] ${
            labelAbove ? "-top-6 sm:-top-7" : "top-1.5"
          }`}
        >
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-white/95" aria-hidden />
          위조 의심 영역 · {scorePct}점
        </div>
      ) : null}
    </div>
  )
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
  const [containLayout, setContainLayout] = useState<ContainedVideoLayout | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let raf = 0

    const syncTimeAndIntrinsics = () => {
      setCurrentTime(video.currentTime)
      const w = video.videoWidth || 0
      const h = video.videoHeight || 0
      if (w > 0 && h > 0) setVideoSize({ width: w, height: h })
      setContainLayout(getContainedVideoLayout(video))
    }

    const syncLayout = () => {
      setContainLayout(getContainedVideoLayout(video))
    }

    const tick = () => {
      setCurrentTime(video.currentTime)
      if (!video.paused && !video.ended) {
        raf = requestAnimationFrame(tick)
      }
    }

    const onPlay = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }

    const onPauseOrSeek = () => {
      cancelAnimationFrame(raf)
      syncTimeAndIntrinsics()
    }

    syncTimeAndIntrinsics()
    video.addEventListener("timeupdate", syncTimeAndIntrinsics)
    video.addEventListener("seeked", onPauseOrSeek)
    video.addEventListener("loadedmetadata", syncTimeAndIntrinsics)
    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPauseOrSeek)
    video.addEventListener("ended", onPauseOrSeek)
    video.addEventListener("resize", syncLayout)
    window.addEventListener("resize", syncLayout)
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => syncLayout()) : null
    ro?.observe(video)
    if (!video.paused && !video.ended) onPlay()

    return () => {
      cancelAnimationFrame(raf)
      video.removeEventListener("timeupdate", syncTimeAndIntrinsics)
      video.removeEventListener("seeked", onPauseOrSeek)
      video.removeEventListener("loadedmetadata", syncTimeAndIntrinsics)
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPauseOrSeek)
      video.removeEventListener("ended", onPauseOrSeek)
      video.removeEventListener("resize", syncLayout)
      window.removeEventListener("resize", syncLayout)
      ro?.disconnect()
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
    // Prefer threshold-cleared frames that actually have localization boxes.
    const aboveThreshold = option.spatialMarkers.filter(
      (marker) => marker.score >= threshold && markerHasBoxes(marker)
    )
    const pool = aboveThreshold.length > 0 ? aboveThreshold : []
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
  }, [option?.spatialMarkers, currentTime, threshold])

  const spatialBoxSamples = useMemo(() => {
    if (!option?.spatialMarkers.length) return []
    return buildSpatialBoxSamples(
      option.spatialMarkers,
      threshold,
      videoSize.width,
      videoSize.height
    )
  }, [option?.spatialMarkers, threshold, videoSize.width, videoSize.height])

  const trackedSpatial = useMemo(
    () => interpolateSpatialAtTime(spatialBoxSamples, currentTime),
    [spatialBoxSamples, currentTime]
  )

  const anyTamperBoxes = useMemo(
    () =>
      option?.spatialMarkers.some(
        (marker) => marker.score >= threshold && markerHasBoxes(marker)
      ) ?? false,
    [option?.spatialMarkers, threshold]
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
    const score = trackedSpatial
      ? normalizeResultValue(trackedSpatial.score)
      : activeSpatial
        ? normalizeResultValue(activeSpatial.score)
        : cnnRisk
    const scorePct = Math.round(score * 100)
    const boxes = trackedSpatial?.boxes ?? []
    const statusHint = !anyTamperBoxes
      ? " · bbox 없음(최신 GPU로 재분석 필요)"
      : boxes.length === 0
        ? " · 임계값 미만 · 박스 숨김"
        : null
    return (
      <div className="pointer-events-none absolute inset-0">
        {boxes.length > 0 && containLayout
          ? boxes.map((box, idx) => (
              <TamperRegionMarker
                key={`tracked-${idx}`}
                box={box}
                layout={containLayout}
                primary={idx === 0}
                frameScore={score}
              />
            ))
          : null}
        <div className="absolute bottom-4 left-4 max-w-[min(92%,22rem)] rounded-md bg-[#9f1239]/95 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
          {boxes.length > 0
            ? `위조 의심 영역 추적 중 · TruFor ${scorePct}점`
            : `${label} · risk ${scorePct}점`}
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
