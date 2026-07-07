"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react"

import { getSession, type AuthSession } from "@/lib/auth"
import { formatDateTimeWithSeconds } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { SourceEvidence } from "./compare-verification-flow"

export function SourceEvidenceMediaPreview({
  evidence,
  className,
  compact = false,
}: {
  evidence: SourceEvidence
  className?: string
  compact?: boolean
}) {
  const playbackUrl = evidence.videoUrl ?? evidence.fileUrl ?? evidence.previewUrl
  const [thumbnailFailed, setThumbnailFailed] = useState(false)
  const thumbnailUrlLooksLikeVideo =
    Boolean(evidence.thumbnailUrl) &&
    [evidence.previewUrl, evidence.videoUrl, evidence.fileUrl].some((url) => url === evidence.thumbnailUrl)
  const thumbnailUrl = thumbnailUrlLooksLikeVideo || thumbnailFailed ? null : evidence.thumbnailUrl
  const mediaPreviewUrl = evidence.previewUrl ?? evidence.videoUrl ?? evidence.fileUrl ?? evidence.thumbnailUrl

  useEffect(() => {
    setThumbnailFailed(false)
  }, [evidence.thumbnailUrl])

  if (!compact && playbackUrl) {
    return (
      <CompareProtectedVideoPlayer
        src={playbackUrl}
        evidence={evidence}
        className={className}
      />
    )
  }

  return (
    <div className={cn("relative block min-w-0 overflow-hidden rounded-lg bg-slate-950", className)}>
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={`EVD-${evidence.id} 썸네일`}
          className="absolute inset-0 size-full object-cover"
          onError={() => setThumbnailFailed(true)}
        />
      ) : mediaPreviewUrl ? (
        <video
          src={mediaPreviewUrl}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
          preload="metadata"
          aria-label={`EVD-${evidence.id} 미리보기`}
        />
      ) : null}

      <CompareEvidenceWatermark evidence={evidence} compact={compact} />
      <span className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-slate-950/70 to-transparent" />
      <span
        className={cn(
          "absolute flex items-center justify-center rounded-full bg-white/90 text-slate-700",
          compact ? "left-1.5 top-1.5 size-5" : "left-2.5 top-2.5 size-7"
        )}
      >
        <Play className={cn("fill-current", compact ? "ml-px size-2.5" : "ml-0.5 size-3.5")} aria-hidden="true" />
      </span>
      {!compact && evidence.durationLabel !== "-" ? (
        <span className="absolute bottom-2 right-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {evidence.durationLabel}
        </span>
      ) : null}
    </div>
  )
}

function CompareProtectedVideoPlayer({
  src,
  evidence,
  className,
}: {
  src: string
  evidence: SourceEvidence
  className?: string
}) {
  const playerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const captureAlertTimerRef = useRef<number | undefined>(undefined)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [captureAlert, setCaptureAlert] = useState(false)
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  const showCaptureAlert = useCallback(() => {
    setCaptureAlert(true)
    window.clearTimeout(captureAlertTimerRef.current)
    captureAlertTimerRef.current = window.setTimeout(() => setCaptureAlert(false), 4000)
  }, [])

  useEffect(() => {
    function handleKeyUp(event: KeyboardEvent) {
      if (event.key !== "PrintScreen") return
      showCaptureAlert()
      void navigator.clipboard
        ?.writeText("ForenShield AI: 증거 화면 캡처가 감지되어 열람 기록이 남습니다.")
        .catch(() => undefined)
    }

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      const isMacScreenshotShortcut =
        event.metaKey && event.shiftKey && (key === "3" || key === "4" || key === "5")
      const isBrowserScreenshotShortcut = event.ctrlKey && event.shiftKey && key === "s"

      if (isMacScreenshotShortcut || isBrowserScreenshotShortcut) {
        showCaptureAlert()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.clearTimeout(captureAlertTimerRef.current)
    }
  }, [showCaptureAlert])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  function seekTo(value: string) {
    const video = videoRef.current
    if (!video) return

    const nextTime = Number(value)
    video.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  function toggleMuted() {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setMuted(video.muted)
  }

  return (
    <div ref={playerRef} className={cn("relative min-w-0 overflow-hidden rounded-lg bg-slate-950", className)}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className="absolute inset-0 size-full object-contain"
        onClick={togglePlay}
        onDoubleClick={() => requestCompareFullscreen(playerRef.current)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      />
      <CompareEvidenceWatermark evidence={evidence} compact={false} />
      {captureAlert ? (
        <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-red-600/90 px-4 py-2 text-xs font-bold text-white shadow-lg">
          <AlertCircle className="size-4" aria-hidden="true" />
          화면 캡처가 감지되었습니다 · 열람 기록이 남습니다
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2.5 pb-2 pt-10 text-white">
        <div className="relative mb-1 h-3.5">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.05"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seekTo(event.currentTarget.value)}
            className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 cursor-pointer appearance-none rounded-full bg-transparent accent-red-700 [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
            style={{
              background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${progress}%, rgba(255,255,255,0.32) ${progress}%, rgba(255,255,255,0.32) 100%)`,
            }}
            aria-label="재생 위치"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-0.5 rounded-full bg-black/55 px-1 py-0.5 shadow-lg backdrop-blur-md">
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm transition-transform hover:scale-105 active:scale-95"
              aria-label={playing ? "일시정지" : "재생"}
              onClick={togglePlay}
            >
              {playing ? (
                <Pause className="size-3.5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-3.5 fill-current" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={compareControlButtonClassName}
              aria-label={muted ? "음소거 해제" : "음소거"}
              onClick={toggleMuted}
            >
              {muted ? (
                <VolumeX className="size-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="size-3.5" aria-hidden="true" />
              )}
            </button>
            <span className="whitespace-nowrap rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white shadow-inner">
              {formatCompareVideoClock(currentTime)} / {formatCompareVideoClock(duration)}
            </span>
          </div>
          <div className="flex shrink-0 items-center rounded-full bg-black/55 px-1 py-0.5 shadow-lg backdrop-blur-md">
            <button
              type="button"
              className={compareControlButtonClassName}
              aria-label="워터마크 포함 확대"
              onClick={() => requestCompareFullscreen(playerRef.current)}
            >
              <Maximize2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompareEvidenceWatermark({
  evidence,
  compact,
}: {
  evidence: SourceEvidence
  compact: boolean
}) {
  const [timestamp, setTimestamp] = useState("열람 시간 확인 중")
  const [session, setSession] = useState<AuthSession | null>(() => getSession())
  const evidenceLabel = `EVD-${evidence.id}`
  const viewerLabel = [session?.name, session?.loginId].filter(Boolean).join(" / ") || "열람자 미확인"
  const primaryText = `${evidenceLabel} · ${viewerLabel} · ${timestamp}`
  const centerText = evidence.caseId ? `${primaryText} · CASE ${evidence.caseId}` : primaryText

  useEffect(() => {
    setTimestamp(formatDateTimeWithSeconds(new Date()))

    function syncSession() {
      setSession(getSession())
    }

    window.addEventListener("auth-change", syncSession)
    return () => window.removeEventListener("auth-change", syncSession)
  }, [])

  return (
    <span className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "-rotate-[18deg] whitespace-nowrap font-mono font-bold tracking-wider text-white/[0.14]",
            compact ? "text-[9px]" : "text-xs sm:text-sm"
          )}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
        >
          {centerText}
        </span>
      </span>
      {!compact ? (
        <span className="absolute bottom-24 left-4 rounded-lg bg-black/45 px-2.5 py-1.5 font-mono text-[10px] font-bold text-white/65 backdrop-blur-md">
          {primaryText}
        </span>
      ) : null}
    </span>
  )
}

const compareControlButtonClassName =
  "flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 active:bg-white/20"

function requestCompareFullscreen(element: HTMLElement | null) {
  if (!element) return

  const fullscreenDocument = document as Document & {
    webkitFullscreenElement?: Element | null
    webkitExitFullscreen?: () => Promise<void> | void
  }
  const fullscreenElement = document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement
  if (fullscreenElement === element) {
    const exitFullscreen = document.exitFullscreen ?? fullscreenDocument.webkitExitFullscreen
    void exitFullscreen?.call(fullscreenDocument)
    return
  }

  const fullscreenTarget = element as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
  }
  const requestFullscreen = fullscreenTarget.requestFullscreen ?? fullscreenTarget.webkitRequestFullscreen
  void requestFullscreen?.call(fullscreenTarget)
}

function formatCompareVideoClock(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00"

  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
