"use client"

import { useEffect, useState } from "react"
import { Play } from "lucide-react"

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
  const mediaPreviewUrl = evidence.previewUrl ?? evidence.videoUrl ?? evidence.fileUrl
  const thumbnailUrl = evidence.thumbnailUrl

  return (
    <span className={cn("relative block min-w-0 overflow-hidden rounded-lg bg-slate-950", className)}>
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={`EVD-${evidence.id} 썸네일`}
          className="absolute inset-0 size-full object-cover"
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
    </span>
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
        <span className="absolute bottom-2 left-2 rounded-md bg-black/45 px-2 py-1 font-mono text-[10px] font-bold text-white/65 backdrop-blur-md">
          {primaryText}
        </span>
      ) : null}
    </span>
  )
}
