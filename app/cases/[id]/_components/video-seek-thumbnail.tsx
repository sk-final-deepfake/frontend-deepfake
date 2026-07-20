"use client"

import Hls from "hls.js"
import { Film, Loader2 } from "lucide-react"
import { useEffect, useState, type RefObject } from "react"

import { API_FETCH_CREDENTIALS } from "@/lib/api/interceptor"
import {
  applyHlsRequestHeaders,
  buildHlsManifestUrl,
  isHlsReady,
  type HlsPlayback,
} from "@/lib/hls-playback"

export type VideoSeekThumbnailStatus = "loading" | "ready" | "unavailable"

type VideoSeekThumbnailProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  timeSec: number
  imageUrl?: string | null
  heatmapImageUrl?: string | null
  label?: string
  hlsPlayback?: HlsPlayback | null
  /** 동시 HLS 캡처 부하 완화용 지연(ms) */
  captureDelayMs?: number
  /** true면 캡처·이미지 모두 실패 시 placeholder 대신 null */
  hideWhenUnavailable?: boolean
  onStatusChange?: (status: VideoSeekThumbnailStatus) => void
}

function captureVideoFrame(video: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, video.videoWidth || 640)
    canvas.height = Math.max(1, video.videoHeight || 360)
    const ctx = canvas.getContext("2d")
    if (!ctx || canvas.width <= 1 || canvas.height <= 1) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.82)
  } catch {
    return null
  }
}

function captureFromDirectSrc(src: string, timeSec: number): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true
    video.preload = "auto"
    video.crossOrigin = "anonymous"

    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      video.pause()
      video.removeAttribute("src")
      video.load()
      resolve(value)
    }

    const timer = window.setTimeout(() => finish(null), 12000)

    video.addEventListener(
      "loadeddata",
      () => {
        const duration = Number.isFinite(video.duration) ? video.duration : timeSec
        const target = Math.max(0, Math.min(timeSec, Math.max(0, duration - 0.05)))
        try {
          video.currentTime = target
        } catch {
          window.clearTimeout(timer)
          finish(null)
        }
      },
      { once: true }
    )
    video.addEventListener(
      "seeked",
      () => {
        window.clearTimeout(timer)
        finish(captureVideoFrame(video))
      },
      { once: true }
    )
    video.addEventListener(
      "error",
      () => {
        window.clearTimeout(timer)
        finish(null)
      },
      { once: true }
    )

    video.src = src
  })
}

function captureFromHls(playback: HlsPlayback, timeSec: number): Promise<string | null> {
  if (!Hls.isSupported()) return Promise.resolve(null)

  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.muted = true
    video.playsInline = true

    let settled = false
    const finish = (value: string | null) => {
      if (settled) return
      settled = true
      hls.destroy()
      video.pause()
      video.removeAttribute("src")
      video.load()
      resolve(value)
    }

    const timer = window.setTimeout(() => finish(null), 15000)

    const hls = new Hls({
      enableWorker: true,
      xhrSetup: (xhr, url) => {
        xhr.withCredentials = API_FETCH_CREDENTIALS === "include"
        applyHlsRequestHeaders(xhr, url)
      },
    })

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const duration = Number.isFinite(video.duration) ? video.duration : timeSec
      const target = Math.max(0, Math.min(timeSec, Math.max(0, duration - 0.05)))
      try {
        video.currentTime = target
      } catch {
        window.clearTimeout(timer)
        finish(null)
      }
    })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        window.clearTimeout(timer)
        finish(null)
      }
    })

    video.addEventListener(
      "seeked",
      () => {
        window.clearTimeout(timer)
        finish(captureVideoFrame(video))
      },
      { once: true }
    )

    hls.attachMedia(video)
    hls.loadSource(buildHlsManifestUrl(playback))
  })
}

/**
 * Prefer server image/heatmap; otherwise capture a frame from the evidence video (MP4 or HLS).
 */
export function VideoSeekThumbnail({
  videoRef,
  timeSec,
  imageUrl,
  heatmapImageUrl,
  label = "대표 프레임",
  hlsPlayback = null,
  captureDelayMs = 0,
  hideWhenUnavailable = false,
  onStatusChange,
}: VideoSeekThumbnailProps) {
  const remoteCandidate = imageUrl?.trim() || heatmapImageUrl?.trim() || null
  const [remoteBroken, setRemoteBroken] = useState(false)
  const [captured, setCaptured] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [captureFailed, setCaptureFailed] = useState(false)

  const remote = remoteCandidate && !remoteBroken ? remoteCandidate : null

  useEffect(() => {
    setRemoteBroken(false)
    setCaptured(null)
    setCaptureFailed(false)
  }, [remoteCandidate, timeSec])

  useEffect(() => {
    if (remote) {
      setCaptured(null)
      setCapturing(false)
      setCaptureFailed(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setCapturing(true)
      setCaptureFailed(false)

      const source = videoRef.current
      const directSrc = source?.currentSrc || source?.src || null
      const canUseDirectSrc =
        directSrc &&
        !directSrc.startsWith("blob:") &&
        !directSrc.includes(".m3u8") &&
        (directSrc.startsWith("http") || directSrc.startsWith("/"))

      let dataUrl: string | null = null

      if (canUseDirectSrc) {
        dataUrl = await captureFromDirectSrc(directSrc, timeSec)
      } else if (isHlsReady(hlsPlayback)) {
        dataUrl = await captureFromHls(hlsPlayback, timeSec)
      } else if (canUseDirectSrc === false && directSrc?.startsWith("blob:") && source && source.readyState >= 2) {
        dataUrl = captureVideoFrame(source)
      }

      if (cancelled) return
      setCapturing(false)
      if (dataUrl) {
        setCaptured(dataUrl)
        setCaptureFailed(false)
      } else {
        setCaptureFailed(true)
      }
    }, captureDelayMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [remote, timeSec, videoRef, hlsPlayback, captureDelayMs])

  const src = remote || captured
  const unavailable = captureFailed || (Boolean(remoteCandidate) && remoteBroken && !captured)

  useEffect(() => {
    if (src) {
      onStatusChange?.("ready")
      return
    }
    if (capturing) {
      onStatusChange?.("loading")
      return
    }
    if (unavailable) {
      onStatusChange?.("unavailable")
    }
  }, [src, capturing, unavailable, onStatusChange])

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        className="size-full object-cover"
        onError={() => {
          if (remote) {
            setRemoteBroken(true)
          }
        }}
      />
    )
  }

  if (capturing || (!src && !unavailable)) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-slate-900">
        <Loader2 className="size-4 animate-spin text-slate-400" aria-hidden="true" />
        <span className="sr-only">프레임 미리보기 생성 중</span>
      </div>
    )
  }

  if (hideWhenUnavailable && unavailable) {
    return null
  }

  return (
    <div
      className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950"
      aria-hidden="true"
    >
      <Film className="size-4 text-slate-500/90" />
      <span className="mt-1 px-1 text-center text-[8px] font-semibold leading-tight text-slate-500">
        {captureFailed ? "미리보기 불가" : "미리보기"}
      </span>
    </div>
  )
}
