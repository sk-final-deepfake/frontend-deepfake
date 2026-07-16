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

export type ReadinessCheckPhase = "metadata" | "frameSampling" | "aiAnalysis" | null

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
  thresholdLabel: string
  verdict: ReadinessMetricVerdict
  verdictLabel: string
  verdictExplanation: string
}

/** backend `video_readiness.py` ReadinessThresholds (`notebook-ui-v1`) 와 동일 */
export const READINESS_THRESHOLDS_VERSION = "notebook-ui-v1"

export const READINESS_THRESHOLDS = {
  blurRecommendGte: 100,
  blurPoorLt: 80,
  blurCautionLt: 100,
  blockinessHighGt: 30,
  fftPeakHighGt: 0.4,
} as const

/** backend `video_readiness.py` `_effective_blur_gates` 와 동일 */
export function resolveBlurThresholds(
  width?: number | null,
  height?: number | null
): { poorLt: number; cautionLt: number; recommendGte: number } {
  const pixels = (width ?? 0) * (height ?? 0)
  if (pixels >= 7680 * 4320) {
    return { poorLt: 20, cautionLt: 35, recommendGte: 35 }
  }
  if (pixels >= 3840 * 2160) {
    return { poorLt: 40, cautionLt: 60, recommendGte: 60 }
  }
  return {
    poorLt: READINESS_THRESHOLDS.blurPoorLt,
    cautionLt: READINESS_THRESHOLDS.blurCautionLt,
    recommendGte: READINESS_THRESHOLDS.blurRecommendGte,
  }
}

const CAUTION_MIN_PIXELS = 640 * 480
const POOR_MIN_PIXELS = 426 * 240
const MIN_DURATION_SEC = 3
const MIN_FPS = 15

function maxReadinessTier(current: ReadinessTier, candidate: ReadinessTier): ReadinessTier {
  return compareReadinessTier(current, candidate) >= 0 ? current : candidate
}

/**
 * 저장된 readinessTier가 구버전 blur 게이트로 POOR여도,
 * frameMetrics + videoMetadata가 있으면 해상도 보정 기준으로 다시 판정한다.
 * (분석 조회 안쪽 Blur 카드 판정과 바깥 배지를 맞추기 위함)
 */
export function resolveDisplayReadinessTier(
  readiness: EvidenceReadinessResponse | null | undefined
): ReadinessTier | null {
  if (!readiness) return null
  if (readiness.readinessTier === "BLOCK") return "BLOCK"

  const blurMean = readiness.frameMetrics?.blur?.mean
  const blockinessMax = readiness.frameMetrics?.blockiness?.max
  const fftPeakMax = readiness.frameMetrics?.fftPeak?.max
  const hasFrameMetrics =
    (blurMean != null && !Number.isNaN(blurMean)) ||
    (blockinessMax != null && !Number.isNaN(blockinessMax)) ||
    (fftPeakMax != null && !Number.isNaN(fftPeakMax))

  if (!hasFrameMetrics) return readiness.readinessTier

  const width = readiness.videoMetadata?.width ?? null
  const height = readiness.videoMetadata?.height ?? null
  const fps = readiness.videoMetadata?.fps ?? null
  const durationSec = readiness.videoMetadata?.durationSec ?? null

  let tier: ReadinessTier = "GOOD"
  const pixels = (width ?? 0) * (height ?? 0)

  if (width != null && height != null) {
    if (pixels < POOR_MIN_PIXELS) tier = "POOR"
    else if (pixels < CAUTION_MIN_PIXELS) tier = maxReadinessTier(tier, "CAUTION")
  }

  if (durationSec != null && durationSec < MIN_DURATION_SEC) tier = "POOR"

  if (fps != null && fps > 0 && fps < MIN_FPS) tier = maxReadinessTier(tier, "CAUTION")

  const blurGates = resolveBlurThresholds(width, height)
  if (blurMean != null && !Number.isNaN(blurMean)) {
    if (blurMean < blurGates.poorLt) tier = "POOR"
    else if (blurMean < blurGates.cautionLt) tier = maxReadinessTier(tier, "CAUTION")
  }

  if (blockinessMax != null && blockinessMax > READINESS_THRESHOLDS.blockinessHighGt) {
    tier = maxReadinessTier(tier, "CAUTION")
  }

  if (fftPeakMax != null && fftPeakMax > READINESS_THRESHOLDS.fftPeakHighGt) {
    tier = maxReadinessTier(tier, "CAUTION")
  }

  return tier
}

export type ReadinessMetricVerdict = "good" | "caution" | "poor" | "unknown"

const READINESS_VERDICT_LABELS: Record<ReadinessMetricVerdict, string> = {
  good: "양호",
  caution: "주의",
  poor: "낮음",
  unknown: "미측정",
}

function evaluateBlurVerdict(
  value: number | null | undefined,
  gates: { poorLt: number; cautionLt: number }
): ReadinessMetricVerdict {
  if (value == null || Number.isNaN(value)) return "unknown"
  if (value < gates.poorLt) return "poor"
  if (value < gates.cautionLt) return "caution"
  return "good"
}

function evaluateUpperBoundVerdict(
  value: number | null | undefined,
  threshold: number
): ReadinessMetricVerdict {
  if (value == null || Number.isNaN(value)) return "unknown"
  return value > threshold ? "caution" : "good"
}

function buildBlurVerdictExplanation(
  verdict: ReadinessMetricVerdict,
  evaluatedValue: number | null,
  recommendGte: number,
  poorLt: number
): string {
  switch (verdict) {
    case "good":
      return `평균 선명도가 권장 기준 ${recommendGte} 이상이라 분석에 적합합니다.`
    case "caution":
      return `평균 선명도가 ${recommendGte} 미만입니다. 전반적으로 흐려 분석 신뢰도가 제한될 수 있습니다.`
    case "poor":
      return `평균 선명도가 ${poorLt} 미만입니다. 화질이 분석에 충분히 적합하지 않을 수 있습니다.`
    default:
      return evaluatedValue == null
        ? "선명도 측정값이 없습니다."
        : `권장 기준은 ${recommendGte} 이상입니다.`
  }
}

function buildBlockinessVerdictExplanation(verdict: ReadinessMetricVerdict): string {
  const threshold = READINESS_THRESHOLDS.blockinessHighGt
  if (verdict === "good") {
    return `최고 압축 손실이 참고 기준 ${threshold} 이하라 양호합니다.`
  }
  if (verdict === "caution") {
    return `최고 압축 손실이 참고 기준 ${threshold}을(를) 넘습니다. 재압축·SNS 업로드 흔적이 있을 수 있습니다.`
  }
  return `참고 기준은 ${threshold} 이하입니다.`
}

function buildFftPeakVerdictExplanation(verdict: ReadinessMetricVerdict): string {
  const threshold = READINESS_THRESHOLDS.fftPeakHighGt
  if (verdict === "good") {
    return `최고 FFT peak가 참고 기준 ${threshold} 이하라 양호합니다.`
  }
  if (verdict === "caution") {
    return `최고 FFT peak가 참고 기준 ${threshold}을(를) 넘습니다. 격자형 압축 노이즈가 강할 수 있습니다.`
  }
  return `참고 기준은 ${threshold} 이하입니다.`
}

function buildMetricItem(
  key: UiReadinessMetricItem["key"],
  aggregate: { mean?: number | null; min?: number | null; max?: number | null } | null | undefined,
  resolution?: { width?: number | null; height?: number | null }
): UiReadinessMetricItem {
  const definition = READINESS_METRIC_DEFINITIONS[key]
  const mean = aggregate?.mean

  let verdict: ReadinessMetricVerdict = "unknown"
  let thresholdLabel = ""
  let verdictExplanation = ""

  if (key === "blur") {
    const evaluatedValue = mean ?? null
    const blurGates = resolveBlurThresholds(resolution?.width, resolution?.height)
    verdict = evaluateBlurVerdict(evaluatedValue, blurGates)
    thresholdLabel = `권장 ${blurGates.recommendGte} 이상`
    verdictExplanation = buildBlurVerdictExplanation(
      verdict,
      evaluatedValue,
      blurGates.recommendGte,
      blurGates.poorLt
    )
  } else if (key === "blockiness") {
    const evaluatedValue = aggregate?.max ?? mean ?? null
    verdict = evaluateUpperBoundVerdict(evaluatedValue, READINESS_THRESHOLDS.blockinessHighGt)
    thresholdLabel = `참고 ${READINESS_THRESHOLDS.blockinessHighGt} 이하`
    verdictExplanation = buildBlockinessVerdictExplanation(verdict)
  } else {
    const evaluatedValue = aggregate?.max ?? mean ?? null
    verdict = evaluateUpperBoundVerdict(evaluatedValue, READINESS_THRESHOLDS.fftPeakHighGt)
    thresholdLabel = `참고 ${READINESS_THRESHOLDS.fftPeakHighGt} 이하`
    verdictExplanation = buildFftPeakVerdictExplanation(verdict)
  }

  return {
    key,
    label: definition.label,
    value:
      mean != null && !Number.isNaN(mean)
        ? formatReadinessMetric(mean, definition.digits)
        : "-",
    description: definition.description,
    thresholdLabel,
    verdict,
    verdictLabel: READINESS_VERDICT_LABELS[verdict],
    verdictExplanation,
  }
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

const READINESS_METRIC_KEYS: UiReadinessMetricItem["key"][] = [
  "blur",
  "blockiness",
  "fftPeak",
]

export function buildDefaultReadinessMetricItems(): UiReadinessMetricItem[] {
  return READINESS_METRIC_KEYS.map((key) => buildMetricItem(key, null))
}

export function buildReadinessMetricItems(
  readiness: EvidenceReadinessResponse | null | undefined
): UiReadinessMetricItem[] {
  if (!readiness) return []

  const metrics = readiness.frameMetrics
  const resolution = {
    width: readiness.videoMetadata?.width,
    height: readiness.videoMetadata?.height,
  }

  return READINESS_METRIC_KEYS.map((key) => buildMetricItem(key, metrics?.[key], resolution))
}

export function getReadinessFrameCheckNote(
  readiness: EvidenceReadinessResponse | null | undefined
): string | null {
  if (!readiness) return null

  const hasValues = READINESS_METRIC_KEYS.some((key) => {
    const mean = readiness.frameMetrics?.[key]?.mean
    return mean != null && !Number.isNaN(mean)
  })

  if (hasValues) return null

  switch (readiness.frameCheckStatus) {
    case "SKIPPED":
      return (
        readiness.frameCheckMessage ??
        "프레임 화질 검사가 실행되지 않았습니다. 서버 readiness 설정을 확인해 주세요."
      )
    case "FAILED":
      return readiness.frameCheckMessage ?? "프레임 화질 검사에 실패했습니다."
    case "COMPLETED":
      return "프레임 화질 검사는 완료되었으나 측정값을 불러오지 못했습니다."
    default:
      return "분석 시작 시 수행한 Blur·Blockiness·FFT Peak 검사 결과를 불러오는 중입니다."
  }
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
