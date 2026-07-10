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

export type ReadinessCheckPhase = "metadata" | "frameSampling" | null

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

/** CAUTION/POOR 확인, BLOCK 차단, 프레임 검사 실패·SKIPPED 안내 */
export function shouldShowQualityDialog(summaries: ReadinessCheckSummary[]): boolean {
  return summaries.some((item) => {
    const tier = item.readiness.readinessTier
    if (tier === "BLOCK") return true
    if (item.readiness.requiresAcknowledgement) return true
    if (
      isVideoEvidence(item) &&
      item.readiness.frameCheckStatus &&
      ["FAILED", "SKIPPED"].includes(item.readiness.frameCheckStatus)
    ) {
      return true
    }
    return false
  })
}

export function hasBlockingReadiness(summaries: ReadinessCheckSummary[]): boolean {
  return summaries.some((item) => item.readiness.readinessTier === "BLOCK")
}

/** 프레임 샘플링(Blur·Blockiness·FFT)이 아직 없으면 true */
export function needsVideoFrameReadinessRefresh(
  summaries: ReadinessCheckSummary[]
): boolean {
  return summaries.some((item) => {
    if (!isVideoEvidence(item)) return false
    if (item.readiness.frameCheckStatus === "COMPLETED" && item.readiness.frameMetrics) {
      return false
    }
    return true
  })
}

/** 화질 안내 다이얼로그 상단 설명 (등급별) */
export function getQualityDialogSummary(
  worstTier: ReadinessTier,
  blocking: boolean
): string {
  if (blocking) {
    return "이 영상은 분석을 진행할 수 없습니다. 아래 사유를 확인해 주세요."
  }

  switch (worstTier) {
    case "GOOD":
      return "메타데이터·프레임 기준 화질이 양호합니다. 분석을 계속 진행해도 됩니다. 위변조 판별 결과가 아니라 사전 품질 안내입니다."
    case "CAUTION":
      return "일부 화질 지표가 권장 범위를 벗어났습니다. 분석은 가능하나 분석 신뢰도가 제한될 수 있습니다. 위변조 판별 결과가 아니라 사전 품질 안내입니다."
    case "POOR":
      return "화질이 분석에 적합하지 않을 수 있습니다. 분석 신뢰도가 제한될 수 있습니다. 위변조 판별 결과가 아니라 사전 품질 안내입니다."
    case "BLOCK":
      return "이 영상은 분석을 진행할 수 없습니다."
    default:
      return "사전 화질 검사 결과입니다. 위변조 판별 결과가 아니라 품질 안내입니다."
  }
}

export function formatReadinessMetric(
  value: number | null | undefined,
  digits = 1
): string {
  if (value == null || Number.isNaN(value)) return "-"
  return value.toFixed(digits)
}

export type UiReadinessMetricItem = {
  key: "blur" | "blockiness" | "fftPeak"
  label: string
  value: string
  description: string
}

const READINESS_METRIC_DEFINITIONS: Record<
  UiReadinessMetricItem["key"],
  { label: string; description: string; digits: number }
> = {
  blur: {
    label: "Blur (선명도)",
    description: "화질의 흐림(선명도) 정도를 나타냅니다. 값이 높을수록 선명합니다.",
    digits: 1,
  },
  blockiness: {
    label: "Blockiness (압축 손실)",
    description:
      "영상 압축 시 생기는 블록 경계 손실 정도입니다. 값이 높을수록 압축 손실이 큽니다.",
    digits: 1,
  },
  fftPeak: {
    label: "FFT peak (격자 노이즈)",
    description:
      "고주파 격자 노이즈(압축 아티팩트) 정도입니다. 값이 높을수록 격자형 노이즈가 강합니다.",
    digits: 4,
  },
}

export function buildReadinessMetricItems(
  readiness: EvidenceReadinessResponse | null | undefined
): UiReadinessMetricItem[] {
  if (!readiness || readiness.frameCheckStatus !== "COMPLETED") return []

  const metrics = readiness.frameMetrics
  if (!metrics) return []

  const keys: UiReadinessMetricItem["key"][] = ["blur", "blockiness", "fftPeak"]

  return keys.flatMap((key) => {
    const definition = READINESS_METRIC_DEFINITIONS[key]
    const aggregate = metrics[key]
    const mean = aggregate?.mean
    if (mean == null || Number.isNaN(mean)) return []

    return [
      {
        key,
        label: definition.label,
        value: formatReadinessMetric(mean, definition.digits),
        description: definition.description,
      },
    ]
  })
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

/** 분석 시작 직전 1단계: 업로드 시 저장된 ffprobe readiness (즉시) */
export async function fetchStoredReadinessForAnalysis(
  targets: ReadinessCheckTarget[]
): Promise<ReadinessCheckSummary[]> {
  const summaries: ReadinessCheckSummary[] = []

  for (const target of targets) {
    const readiness = await fetchEvidenceReadiness(target.evidenceId)
    summaries.push({ ...target, readiness })
  }

  return summaries
}

/** 확인 다이얼로그 「예」 이후 2단계: 영상 프레임 샘플링 (S3 다운로드·Python, 느릴 수 있음) */
export async function refreshVideoFrameReadiness(
  targets: ReadinessCheckTarget[]
): Promise<ReadinessCheckSummary[]> {
  const summaries: ReadinessCheckSummary[] = []

  for (const target of targets) {
    if (!isVideoEvidence(target)) {
      summaries.push({
        ...target,
        readiness: await fetchEvidenceReadiness(target.evidenceId),
      })
      continue
    }

    try {
      const readiness = await runEvidenceReadinessCheck(target.evidenceId)
      summaries.push({ ...target, readiness })
    } catch (error) {
      if (!shouldFallbackToStoredReadiness(error)) {
        throw error
      }
      summaries.push({
        ...target,
        readiness: await fetchEvidenceReadiness(target.evidenceId),
      })
    }
  }

  return summaries
}

/** @deprecated fetchStoredReadinessForAnalysis 사용 — 하위 호환 */
export async function checkReadinessForAnalysis(
  targets: ReadinessCheckTarget[]
): Promise<ReadinessCheckSummary[]> {
  return fetchStoredReadinessForAnalysis(targets)
}
