import { ApiError } from "@/lib/api/client"
import type { CaseEvidenceSummary } from "@/lib/api/evidence-detail"
import type { MediaMetadata, UploadResult } from "@/lib/evidence-api"
import {
  fetchEvidenceReadiness,
  runEvidenceReadinessCheck,
  type EvidenceReadinessResponse,
  type ReadinessTier,
} from "@/lib/evidence-api"

export type { EvidenceReadinessResponse, ReadinessTier }

export type ReadinessCheckTarget = {
  evidenceId: number
  fileName: string
  metadata: MediaMetadata | string | null
}

export type ReadinessCheckSummary = ReadinessCheckTarget & {
  readiness: EvidenceReadinessResponse
}

const TIER_RANK: Record<ReadinessTier, number> = {
  GOOD: 0,
  CAUTION: 1,
  POOR: 2,
  BLOCK: 3,
}

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v"])

export function isVideoEvidence(target: ReadinessCheckTarget): boolean {
  if (target.metadata && typeof target.metadata === "object") {
    const type = target.metadata.type?.toLowerCase()
    if (type === "video") return true
    if (type === "image" || type === "audio") return false
  }

  const extension = target.fileName.split(".").pop()?.toLowerCase()
  return extension ? VIDEO_EXTENSIONS.has(extension) : false
}

export function compareReadinessTier(a: ReadinessTier, b: ReadinessTier): number {
  return TIER_RANK[a] - TIER_RANK[b]
}

export function worstReadinessTier(summaries: ReadinessCheckSummary[]): ReadinessTier {
  if (summaries.length === 0) return "GOOD"

  return summaries.reduce<ReadinessTier>(
    (worst, item) =>
      compareReadinessTier(item.readiness.readinessTier, worst) > 0
        ? item.readiness.readinessTier
        : worst,
    "GOOD"
  )
}

export function needsQualityAcknowledgement(summaries: ReadinessCheckSummary[]): boolean {
  return summaries.some((item) => item.readiness.requiresAcknowledgement)
}

export function readinessTierLabel(tier: ReadinessTier): string {
  switch (tier) {
    case "GOOD":
      return "양호"
    case "CAUTION":
      return "주의"
    case "POOR":
      return "낮음"
    case "BLOCK":
      return "불가"
    default:
      return tier
  }
}

export function readinessTierBadgeClass(tier: ReadinessTier): string {
  switch (tier) {
    case "GOOD":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "CAUTION":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
    case "POOR":
      return "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200"
    case "BLOCK":
      return "border-destructive/30 bg-destructive/10 text-destructive"
    default:
      return ""
  }
}

function shouldFallbackToStoredReadiness(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true
  return error.status >= 500 || error.status === 404 || error.errorCode === "READINESS_VIDEO_ONLY"
}

export function readinessTargetFromUpload(result: UploadResult): ReadinessCheckTarget {
  return {
    evidenceId: result.evidenceId,
    fileName: result.fileName,
    metadata: result.metadata,
  }
}

export function readinessTargetFromCaseEvidence(
  evidence: CaseEvidenceSummary
): ReadinessCheckTarget {
  const mediaType = evidence.mediaType?.toLowerCase()
  const metadata: MediaMetadata | null =
    mediaType === "video" || mediaType === "audio" || mediaType === "image"
      ? { type: mediaType }
      : null

  return {
    evidenceId: evidence.evidenceId,
    fileName: evidence.fileName,
    metadata,
  }
}

async function resolveReadiness(target: ReadinessCheckTarget): Promise<EvidenceReadinessResponse> {
  if (isVideoEvidence(target)) {
    try {
      return await runEvidenceReadinessCheck(target.evidenceId)
    } catch (error) {
      if (!shouldFallbackToStoredReadiness(error)) {
        throw error
      }
      return fetchEvidenceReadiness(target.evidenceId)
    }
  }

  return fetchEvidenceReadiness(target.evidenceId)
}

/** 분석 시작 직전: 영상은 프레임 검사, 그 외는 저장된 readiness 조회 */
export async function checkReadinessForAnalysis(
  targets: ReadinessCheckTarget[]
): Promise<ReadinessCheckSummary[]> {
  const summaries: ReadinessCheckSummary[] = []

  for (const target of targets) {
    const readiness = await resolveReadiness(target)
    summaries.push({ ...target, readiness })
  }

  return summaries
}
