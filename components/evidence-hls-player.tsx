"use client"

import Hls from "hls.js"
import { FileVideo, Loader2 } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"

import {
  applyHlsRequestHeaders,
  buildHlsManifestUrl,
  getHlsStatusMessage,
  type HlsPlayback,
} from "@/lib/hls-playback"
import { API_FETCH_CREDENTIALS } from "@/lib/api/interceptor"
import { cn } from "@/lib/utils"

type EvidenceHlsPlayerProps = {
  playback: HlsPlayback | null | undefined
  objectFit?: "cover" | "contain"
  className?: string
  videoRef?: { current: HTMLVideoElement | null }
  /** false면 컨트롤 없이 미니 프리뷰용 */
  showControls?: boolean
  onError?: () => void
  children?: ReactNode
}

export function EvidenceHlsPlayer({
  playback,
  objectFit = "contain",
  className,
  videoRef,
  showControls = true,
  onError,
  children,
}: EvidenceHlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const internalVideoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(false)

  const ready =
    playback?.hlsStatus === "READY" &&
    Boolean(playback.streamToken) &&
    Boolean(playback.manifestPath)

  const statusMessage = ready ? null : getHlsStatusMessage(playback?.hlsStatus)

  useEffect(() => {
    if (!ready || !playback) {
      hlsRef.current?.destroy()
      hlsRef.current = null
      return
    }

    const video = internalVideoRef.current
    if (!video) return

    const manifestUrl = buildHlsManifestUrl(playback)
    let cancelled = false

    function handleFailure() {
      if (cancelled) return
      setLoading(false)
      setLoadFailed(true)
      onError?.()
    }

    hlsRef.current?.destroy()
    hlsRef.current = null
    setLoadFailed(false)
    setLoading(true)

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        xhrSetup: (xhr, url) => {
          xhr.withCredentials = API_FETCH_CREDENTIALS === "include"
          applyHlsRequestHeaders(xhr, url)
        },
      })

      hlsRef.current = hls
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) setLoading(false)
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled || !data.fatal) return
        handleFailure()
      })
      hls.loadSource(manifestUrl)

      return () => {
        cancelled = true
        hls.destroy()
        if (hlsRef.current === hls) {
          hlsRef.current = null
        }
      }
    }

    handleFailure()
    return undefined
  }, [ready, playback, onError])

  function setVideoElement(element: HTMLVideoElement | null) {
    internalVideoRef.current = element
    if (videoRef) {
      videoRef.current = element
    }
  }

  if (!ready) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex size-full flex-col items-center justify-center bg-slate-950 px-4 text-center text-sm font-medium text-white/70",
          className
        )}
      >
        <FileVideo className="mb-3 size-8 text-white/40" aria-hidden="true" />
        <p>{statusMessage}</p>
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex size-full flex-col items-center justify-center bg-slate-950 px-4 text-center text-sm font-bold text-white/60",
          className
        )}
      >
        <FileVideo className="mb-3 size-8" aria-hidden="true" />
        {typeof window !== "undefined" && !Hls.isSupported()
          ? "이 브라우저에서는 보안 HLS 재생을 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요."
          : "재생할 수 없습니다. step-up 인증이 만료되었거나 stream token이 유효하지 않습니다."}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn("relative size-full overflow-hidden bg-slate-950", className)}>
      <video
        ref={setVideoElement}
        playsInline
        preload="metadata"
        controls={showControls}
        controlsList="nodownload"
        disablePictureInPicture
        className={cn(
          "absolute inset-0 size-full",
          objectFit === "cover" ? "object-cover" : "object-contain"
        )}
      />
      {loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
          <Loader2 className="size-8 animate-spin text-white/80" aria-hidden="true" />
        </div>
      ) : null}
      {children}
    </div>
  )
}
