"use client"

import { useEffect, useMemo, useState, type RefObject } from "react"

import { normalizeResultValue } from "@/lib/api/analysis-result-ui"

import type { ModelOverlayOption } from "../_lib/model-overlays"

type ModelOverlayLayerProps = {
  option: ModelOverlayOption | null
  videoRef: RefObject<HTMLVideoElement | null>
}

const SPATIAL_MATCH_SEC = 0.45

type BannerTone = {
  border: string
  borderIdle: string
  band: string
  bandIdle: string
  badge: string
}

const TONE_RED: BannerTone = {
  border: "border-red-500",
  borderIdle: "border-red-400/35",
  band: "bg-red-600/88",
  bandIdle: "bg-red-500/30",
  badge: "bg-red-800/95",
}

const TONE_ORANGE: BannerTone = {
  border: "border-orange-500",
  borderIdle: "border-orange-400/35",
  band: "bg-orange-600/88",
  bandIdle: "bg-orange-500/30",
  badge: "bg-orange-800/95",
}

const TONE_CYAN: BannerTone = {
  border: "border-cyan-500",
  borderIdle: "border-cyan-400/35",
  band: "bg-cyan-700/88",
  bandIdle: "bg-cyan-600/30",
  badge: "bg-cyan-900/95",
}

/** Backend-like score banner: full-frame border + top band with readable risk label. */
function ScoreBannerOverlay({
  tone,
  active,
  riskScore,
  modelLabel,
  idleLabel,
}: {
  tone: BannerTone
  active: boolean
  riskScore: number
  modelLabel: string
  idleLabel: string
}) {
  const risk = normalizeResultValue(riskScore)
  const riskText = risk.toFixed(2)
  const scorePct = Math.round(risk * 100)

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Full-frame border — thickness scales with container */}
      <div
        className={`absolute inset-0 border-[3px] sm:border-4 ${active ? tone.border : tone.borderIdle}`}
        style={active ? { opacity: 0.55 + risk * 0.4 } : undefined}
      />

      {/* Top banner (~h/14 of frame) */}
      <div
        className={`absolute inset-x-0 top-0 flex min-h-[28px] items-center px-2.5 sm:min-h-[32px] sm:px-3.5 ${
          active ? tone.band : tone.bandIdle
        }`}
        style={{ height: "7.2%" }}
      >
        <p
          className="max-w-full truncate text-[11px] font-semibold leading-none tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-sm sm:tracking-normal md:text-[15px]"
          title={active ? `${modelLabel}  risk=${riskText}` : idleLabel}
        >
          {active ? (
            <>
              <span className="font-bold">{modelLabel}</span>
              <span className="mx-1.5 opacity-80">risk=</span>
              <span className="tabular-nums font-bold">{riskText}</span>
            </>
          ) : (
            idleLabel
          )}
        </p>
      </div>

      <div
        className={`absolute bottom-3 left-3 max-w-[min(90%,20rem)] truncate rounded-md ${tone.badge} px-2.5 py-1 text-[11px] font-bold leading-tight text-white sm:bottom-4 sm:left-4 sm:text-xs`}
      >
        {active ? `${modelLabel} · risk ${scorePct}점` : `${modelLabel} · ${idleLabel}`}
      </div>
    </div>
  )
}

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

  if (isDeepfakeTemporal || isDeepfakeOptical) {
    return (
      <ScoreBannerOverlay
        tone={isDeepfakeOptical ? TONE_CYAN : TONE_RED}
        active={clipActive}
        riskScore={activeClip?.riskScore ?? 0}
        modelLabel={isDeepfakeOptical ? "GMFlow" : "TimeSformer"}
        idleLabel="구간 미리보기"
      />
    )
  }

  if (isForgeryTemporal) {
    return (
      <ScoreBannerOverlay
        tone={TONE_ORANGE}
        active={clipActive}
        riskScore={activeClip?.riskScore ?? 0}
        modelLabel={label}
        idleLabel="클립 구간 미리보기"
      />
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
