"use client"

import { useEffect, useMemo, useState, type RefObject } from "react"

import { normalizeResultValue } from "@/lib/api/analysis-result-ui"

import type { ModelOverlayOption } from "../_lib/model-overlays"

type ModelOverlayLayerProps = {
  option: ModelOverlayOption | null
  videoRef: RefObject<HTMLVideoElement | null>
}

const SPATIAL_MATCH_SEC = 0.45

export function ModelOverlayLayer({ option, videoRef }: ModelOverlayLayerProps) {
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const syncTime = () => setCurrentTime(video.currentTime)
    syncTime()
    video.addEventListener("timeupdate", syncTime)
    video.addEventListener("seeked", syncTime)
    return () => {
      video.removeEventListener("timeupdate", syncTime)
      video.removeEventListener("seeked", syncTime)
    }
  }, [videoRef, option?.id])

  const threshold = option?.detectionThreshold ?? 0.6

  const activeClip = useMemo(() => {
    if (!option?.clipWindows.length) return null
    return (
      option.clipWindows.find(
        (clip) => currentTime >= clip.startTimeSec && currentTime <= clip.endTimeSec
      ) ?? null
    )
  }, [option?.clipWindows, currentTime])

  const activeSpatial = useMemo(() => {
    if (!option?.spatialMarkers.length) return null
    let best: (typeof option.spatialMarkers)[number] | null = null
    let bestDelta = Number.POSITIVE_INFINITY
    for (const marker of option.spatialMarkers) {
      const delta = Math.abs(marker.timeSec - currentTime)
      if (delta <= SPATIAL_MATCH_SEC && delta < bestDelta) {
        best = marker
        bestDelta = delta
      }
    }
    return best
  }, [option?.spatialMarkers, currentTime])

  if (!option) return null

  const label = option.label
  const isForgerySpatial = option.id === "forgery:forgery_spatial"
  const isForgeryTemporal = option.id === "forgery:forgery_temporal"
  const isDeepfakeTemporal = option.id === "deepfake:temporal"
  const isDeepfakeOptical = option.id === "deepfake:optical"
  const isDeepfakeCnn = option.id === "deepfake:cnn"

  const clipActive =
    activeClip != null && normalizeResultValue(activeClip.riskScore) >= Math.max(0.12, threshold * 0.35)
  const spatialActive =
    activeSpatial != null && normalizeResultValue(activeSpatial.score) >= Math.max(0.12, threshold * 0.35)

  if (isForgeryTemporal || isDeepfakeTemporal) {
    const borderClass = isForgeryTemporal ? "border-orange-400" : "border-red-400"
    const fillClass = isForgeryTemporal ? "bg-orange-500/10" : "bg-red-500/10"
    const barClass = isForgeryTemporal ? "bg-orange-500/85" : "bg-red-500/80"
    const badgeClass = isForgeryTemporal ? "bg-orange-700/95" : "bg-red-700/95"
    const shadowClass = isForgeryTemporal
      ? "shadow-[0_0_28px_rgba(249,115,22,0.25)]"
      : "shadow-[0_0_28px_rgba(239,68,68,0.25)]"

    return (
      <div className="pointer-events-none absolute inset-0">
        {clipActive ? (
          <>
            <div
              className={`absolute inset-x-[6%] top-[10%] h-[80%] rounded-lg border-[3px] border-dashed ${borderClass} ${fillClass} ${shadowClass}`}
              style={{ opacity: 0.55 + normalizeResultValue(activeClip!.riskScore) * 0.45 }}
            />
            <div className={`absolute inset-x-0 top-0 h-1.5 ${barClass}`} />
          </>
        ) : (
          <>
            <div className={`absolute inset-x-0 top-0 h-1 ${isForgeryTemporal ? "bg-orange-400/35" : "bg-red-400/35"}`} />
            <div
              className={`absolute inset-x-[10%] top-[14%] h-[72%] rounded-lg border border-dashed ${isForgeryTemporal ? "border-orange-300/40" : "border-red-300/40"}`}
            />
          </>
        )}
        <div className={`absolute bottom-4 left-4 rounded-md ${badgeClass} px-2.5 py-1 text-xs font-bold text-white`}>
          {label} ·{" "}
          {clipActive
            ? `의심 클립 ${Math.round(normalizeResultValue(activeClip!.riskScore) * 100)}점`
            : "클립 구간 미리보기"}
        </div>
      </div>
    )
  }

  if (isForgerySpatial) {
    return (
      <div className="pointer-events-none absolute inset-0">
        {spatialActive ? (
          <>
            <div
              className="absolute left-[34%] top-[48%] h-[14%] w-[28%] rounded-sm border-[3px] border-orange-500 bg-orange-500/20 shadow-[0_0_24px_rgba(249,115,22,0.35)]"
              style={{ opacity: 0.65 + normalizeResultValue(activeSpatial!.score) * 0.35 }}
            />
            <div className="absolute left-[36%] top-[52%] h-[6%] w-[12%] rounded-sm border border-orange-300/80 bg-orange-300/25" />
          </>
        ) : (
          <div className="absolute inset-x-[22%] top-[58%] h-[10%] rounded-sm border border-orange-300/45 bg-orange-500/10" />
        )}
        <div className="absolute bottom-4 left-4 rounded-md bg-orange-600/95 px-2.5 py-1 text-xs font-bold text-white">
          {label} ·{" "}
          {spatialActive
            ? `국소 변조 ${Math.round(normalizeResultValue(activeSpatial!.score) * 100)}점`
            : "spatial bbox 미리보기"}
        </div>
      </div>
    )
  }

  if (isDeepfakeOptical) {
    return (
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[30%] top-[35%] size-16 rounded-full border-2 border-cyan-400 bg-cyan-400/10" />
        <div className="absolute left-[48%] top-[42%] size-10 rounded-full border-2 border-cyan-300 bg-cyan-300/10" />
        <div className="absolute bottom-4 left-4 rounded-md bg-cyan-700/95 px-2.5 py-1 text-xs font-bold text-white">
          GMFlow · motion 이상
        </div>
      </div>
    )
  }

  if (isDeepfakeCnn) {
    return (
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[39%] top-[20%] h-[34%] w-[24%] rounded-[18%] border-2 border-red-700 bg-red-700/15 shadow-[0_0_24px_rgba(185,28,28,0.3)]" />
        <div className="absolute left-[43%] top-[38%] h-[7%] w-[16%] rounded-sm bg-yellow-300/55" />
        <div className="absolute bottom-4 left-4 rounded-md bg-red-700/95 px-2.5 py-1 text-xs font-bold text-white">
          {label} · 얼굴 bbox 미리보기
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-[18%] top-[62%] h-[8%] rounded-sm border-2 border-orange-500 bg-orange-500/20" />
      <div className="absolute bottom-4 left-4 rounded-md bg-orange-600/95 px-2.5 py-1 text-xs font-bold text-white">
        {label} · 편집 구간 미리보기
      </div>
    </div>
  )
}
