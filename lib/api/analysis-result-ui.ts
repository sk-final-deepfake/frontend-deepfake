import type {
  EvidenceDetailData,
  FrameScore,
  ModelScore,
  ModuleResult,
  SuspiciousSegment,
} from "@/lib/api/evidence-detail"
import { formatDuration } from "@/lib/formatters"

const TIMELINE_MODULE = "video_timeline"
const HIGH_RISK_THRESHOLD = 0.6
const REVIEW_THRESHOLD = 0.3
/** GPU placeholder로 흔히 들어오는 미실행 모듈 점수 상한 (예: frame_edit 0.05) */
const MIN_EXECUTED_MODULE_SCORE = 0.1

export type UiRiskSignal = {
  label: string
  badge: string
  score: number
  description: string
  basis: string
  interval: string
  tone: "danger" | "warning" | "neutral"
}

export type UiTopRiskFrame = {
  time: string
  seconds: number
  score: number
  signal: string
}

export type UiModelRow = {
  name: string
  role: string
  score: number
  interpretation: string
  auxiliary?: boolean
}

export type UiModelInsights = {
  ensembleScore: number
  headline: string
  primaryModels: UiModelRow[]
  auxiliaryModels: UiModelRow[]
}

export type UiModelSetting = {
  label: string
  value: string
}

const MODULE_LABELS: Record<string, string> = {
  deepfake: "딥페이크(얼굴 합성)",
  lip_sync: "립싱크 불일치",
  frame_edit: "프레임 편집 흔적",
  splicing: "구간 이어붙이기",
  re_encoding: "재인코딩 흔적",
}

const MODULE_ROLES: Record<string, string> = {
  deepfake: "얼굴 crop 기반 공간적 합성 흔적 분석",
  lip_sync: "음성·입술 움직임 동기화 분석",
  frame_edit: "프레임 단위 편집·합성 흔적 분석",
  splicing: "영상 구간 연결·절단 흔적 분석",
  re_encoding: "재압축·트랜스코딩 흔적 분석",
}

export function isAnalysisModule(moduleName: string) {
  return moduleName.toLowerCase() !== TIMELINE_MODULE
}

type ModuleDetailsMeta = {
  executed?: boolean
}

function parseModuleDetails(details: string | null | undefined): ModuleDetailsMeta {
  if (!details?.trim()) return {}
  try {
    const parsed = JSON.parse(details) as ModuleDetailsMeta
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

/** GPU가 실제 실행·보고한 탐지 모듈만 UI에 노출합니다. */
export function isExecutedDetectionModule(module: ModuleResult) {
  if (!isAnalysisModule(module.moduleName)) return false

  const meta = parseModuleDetails(module.details)
  if (meta.executed === true) return true

  const score = normalizeResultValue(module.score)
  if (module.detected) return true
  if (score >= MIN_EXECUTED_MODULE_SCORE) return true
  return false
}

export function getDetectionModules(modules: ModuleResult[]) {
  return modules.filter((module) => isExecutedDetectionModule(module))
}

export function normalizeResultValue(value: number) {
  if (value > 0 && value <= 1) return value
  return Math.max(0, Math.min(100, value)) / 100
}

export function formatScoreOutOf100(value: number | null | undefined) {
  if (value == null) return "-"
  const normalized = normalizeResultValue(value)
  return `${Math.round(normalized * 100)} / 100`
}

export function formatModuleLabel(moduleName: string) {
  const key = moduleName.toLowerCase()
  if (MODULE_LABELS[key]) return MODULE_LABELS[key]

  const normalized = key
  if (normalized.includes("boundary") || normalized.includes("face")) return "얼굴 경계 불연속"
  if (normalized.includes("timeline") || normalized.includes("temporal")) return "시간축 일관성 저하"
  if (normalized.includes("metadata")) return "메타데이터 기반 이상"
  if (normalized.includes("compression") || normalized.includes("artifact")) return "압축 아티팩트"
  if (normalized.includes("xception")) return "Xception 딥페이크 탐지"
  return moduleName
}

function riskTone(score: number): UiRiskSignal["tone"] {
  if (score >= HIGH_RISK_THRESHOLD) return "danger"
  if (score >= REVIEW_THRESHOLD) return "warning"
  return "neutral"
}

function riskBadge(score: number, detected: boolean) {
  if (score >= HIGH_RISK_THRESHOLD || detected) return "높은 위험 신호"
  if (score >= REVIEW_THRESHOLD) return "검토 필요"
  return "낮음"
}

function formatSegmentRange(segment: SuspiciousSegment) {
  return `${formatDuration(segment.startTime)} ~ ${formatDuration(segment.endTime)}`
}

function primarySuspiciousSegment(data: EvidenceDetailData | null) {
  const segments = data?.analysisInfo.suspiciousSegments ?? []
  if (segments.length === 0) return null
  return [...segments].sort((a, b) => b.maxRiskScore - a.maxRiskScore)[0]
}

function buildSignalInterval(
  data: EvidenceDetailData | null,
  moduleIndex: number,
  frameScores: FrameScore[]
) {
  const segment = data?.analysisInfo.suspiciousSegments?.[moduleIndex]
  if (segment) return formatSegmentRange(segment)

  if (frameScores.length === 0) return "대표 구간 없음"

  const scoredFrames = [...frameScores].sort(
    (a, b) => normalizeResultValue(b.score) - normalizeResultValue(a.score)
  )
  const target = scoredFrames[moduleIndex % scoredFrames.length]
  const timeSec = target.timeSec ?? moduleIndex
  const windowSec = Math.max(0.5, Math.min(4, timeSec / 4 || 1))
  const start = Math.max(0, timeSec - windowSec)
  const end = timeSec + windowSec
  return `${formatDuration(start)} ~ ${formatDuration(end)}`
}

function moduleDescription(module: ModuleResult) {
  const label = formatModuleLabel(module.moduleName)
  const score = normalizeResultValue(module.score)
  const percent = Math.round(score * 100)

  if (module.detected || score >= REVIEW_THRESHOLD) {
    return `${label} 모듈에서 위험 점수 ${percent}점이 측정되었습니다.`
  }
  return `${label} 모듈에서는 뚜렷한 위험 신호가 관찰되지 않았습니다.`
}

function moduleBasis(module: ModuleResult) {
  const label = formatModuleLabel(module.moduleName)
  if (module.detected) return `${label} 탐지 기준을 충족했습니다.`
  const score = normalizeResultValue(module.score)
  if (score >= REVIEW_THRESHOLD) return `${label} 점수가 검토 임계값 이상입니다.`
  return `${label} 점수가 낮아 주요 위험 신호로 분류되지 않았습니다.`
}

export function buildRiskSignals(
  data: EvidenceDetailData | null,
  frameScores: FrameScore[]
): { primary: UiRiskSignal[]; extra: UiRiskSignal[] } {
  const modules = getDetectionModules(data?.analysisInfo.moduleResults ?? [])
    .map((module) => ({
      module,
      score: normalizeResultValue(module.score),
    }))
    .sort((a, b) => b.score - a.score)

  if (modules.length === 0) {
    return { primary: [], extra: [] }
  }

  const signals = modules.map(({ module, score }, index) => ({
    label: formatModuleLabel(module.moduleName),
    badge: riskBadge(score, module.detected),
    score,
    description: moduleDescription(module),
    basis: moduleBasis(module),
    interval: buildSignalInterval(data, index, frameScores),
    tone: riskTone(score),
  }))

  const primary = signals.filter((signal) => signal.score >= REVIEW_THRESHOLD || signal.tone === "danger")
  const extra = signals.filter((signal) => signal.score < REVIEW_THRESHOLD && signal.tone !== "danger")

  return {
    primary: primary.slice(0, 4),
    extra,
  }
}

export function buildTopRiskFrames(
  data: EvidenceDetailData | null,
  frameScores: FrameScore[]
): UiTopRiskFrame[] {
  if (frameScores.length === 0) return []

  const topModule =
    getDetectionModules(data?.analysisInfo.moduleResults ?? []).sort(
      (a, b) => normalizeResultValue(b.score) - normalizeResultValue(a.score)
    )[0]?.moduleName ?? "deepfake"

  return [...frameScores]
    .sort((a, b) => normalizeResultValue(b.score) - normalizeResultValue(a.score))
    .slice(0, 5)
    .map((frame, index) => {
      const seconds = frame.timeSec ?? index
      const score = Math.round(normalizeResultValue(frame.score) * 100)
      return {
        time: frame.timestamp ?? formatDuration(seconds),
        seconds,
        score,
        signal: formatModuleLabel(topModule),
      }
    })
}

export function buildResultSummaryLines(data: EvidenceDetailData | null) {
  const evidenceItems = data?.analysisInfo.evidenceItems ?? []
  if (evidenceItems.length > 0) return evidenceItems

  const summary = data?.analysisInfo.summary?.trim()
  if (summary) {
    const lines = summary
      .split(/[.!?。]\s*/)
      .map((line) => line.trim())
      .filter(Boolean)
    if (lines.length > 0) return lines
  }

  const segment = primarySuspiciousSegment(data)
  if (segment?.reason) {
    return [
      segment.reason,
      `${formatSegmentRange(segment)} 구간에서 최고 위험 점수 ${Math.round(normalizeResultValue(segment.maxRiskScore) * 100)}점이 측정되었습니다.`,
    ]
  }

  const modules = getDetectionModules(data?.analysisInfo.moduleResults ?? [])
  if (modules.length > 0) {
    const top = [...modules].sort((a, b) => normalizeResultValue(b.score) - normalizeResultValue(a.score))[0]
    const label = formatModuleLabel(top.moduleName)
    const percent = Math.round(normalizeResultValue(top.score) * 100)
    return [`${label} 모듈 기준 위험 점수는 ${percent}점이며, GPU 워커 분석 결과를 반영했습니다.`]
  }

  return ["분석이 완료되었으나 표시할 요약 문구가 아직 없습니다."]
}

export function buildSummaryFocusLabels(data: EvidenceDetailData | null) {
  const modules = getDetectionModules(data?.analysisInfo.moduleResults ?? [])
  if (modules.length === 0) {
    return ["딥페이크 탐지", "프레임 위험도", "모델 신뢰도"]
  }
  return modules.slice(0, 3).map((module) => formatModuleLabel(module.moduleName))
}

function modelRowFromModule(module: ModuleResult): UiModelRow {
  const score = normalizeResultValue(module.score)
  const key = module.moduleName.toLowerCase()
  return {
    name: module.modelName?.trim() || formatModuleLabel(module.moduleName),
    role: MODULE_ROLES[key] ?? "영상 딥페이크 탐지 모듈",
    score,
    auxiliary: score < REVIEW_THRESHOLD && !module.detected,
    interpretation:
      module.detected || score >= REVIEW_THRESHOLD
        ? `${formatModuleLabel(module.moduleName)}에서 위험 신호가 확인되었습니다.`
        : `${formatModuleLabel(module.moduleName)}에서는 유의미한 위험 신호가 낮게 측정되었습니다.`,
  }
}

function modelRowFromScore(item: ModelScore): UiModelRow {
  const score = normalizeResultValue(item.score)
  const key = item.moduleName.toLowerCase()
  return {
    name: item.modelName?.trim() || formatModuleLabel(item.moduleName),
    role: MODULE_ROLES[key] ?? "영상 딥페이크 탐지 모듈",
    score,
    interpretation:
      item.detected || score >= REVIEW_THRESHOLD
        ? `${formatModuleLabel(item.moduleName)} 모듈 점수 ${Math.round(score * 100)}점`
        : `${formatModuleLabel(item.moduleName)} 모듈은 보조 참고 수준입니다.`,
    auxiliary: score < REVIEW_THRESHOLD && !item.detected,
  }
}

export function buildModelInsights(
  data: EvidenceDetailData | null,
  frameScores: FrameScore[]
): UiModelInsights {
  const modelScores = data?.analysisInfo.modelScores ?? []
  const moduleRows =
    modelScores.length > 0
      ? modelScores.map(modelRowFromScore)
      : getDetectionModules(data?.analysisInfo.moduleResults ?? []).map(modelRowFromModule)

  const primaryModels = moduleRows.filter((row) => !row.auxiliary)
  const auxiliaryModels = moduleRows.filter((row) => row.auxiliary)

  const riskScore = data?.analysisInfo.riskScore
  const maxModuleScore = moduleRows.reduce((max, row) => Math.max(max, row.score), 0)
  const peakFrameScore =
    frameScores.length > 0
      ? Math.max(...frameScores.map((frame) => normalizeResultValue(frame.score)))
      : 0
  const ensembleScore =
    riskScore != null
      ? normalizeResultValue(riskScore)
      : Math.max(maxModuleScore, peakFrameScore)

  const detectedCount = moduleRows.filter((row) => row.score >= REVIEW_THRESHOLD).length
  const headline =
    detectedCount > 0
      ? `탐지 모듈 ${moduleRows.length}개 중 ${detectedCount}개에서 위험 신호가 확인되었습니다.`
      : `탐지 모듈 ${moduleRows.length}개 모두 낮은 위험 점수를 보였습니다.`

  return {
    ensembleScore,
    headline,
    primaryModels: primaryModels.length > 0 ? primaryModels : moduleRows.slice(0, 2),
    auxiliaryModels,
  }
}

export function buildModelRadarModels(
  insights: UiModelInsights,
  frameScores: FrameScore[],
  peakFrameScore: number | null
) {
  const rows = [...insights.primaryModels, ...insights.auxiliaryModels].slice(0, 4)
  if (rows.length > 0) {
    return rows.map((row) => ({
      label: row.name,
      source: row.role,
      score: row.score,
    }))
  }

  if (peakFrameScore != null) {
    return [{ label: "프레임 위험 집중", source: "Frame score", score: peakFrameScore }]
  }

  return frameScores.length > 0
    ? [{ label: "프레임 평균 위험", source: "Frame score", score: insights.ensembleScore }]
    : []
}

export function buildModelAnalysisSettings(
  data: EvidenceDetailData | null,
  frameScores: FrameScore[]
): UiModelSetting[] {
  const metadata = data?.evidenceInfo.technicalMetadata
  const modules = getDetectionModules(data?.analysisInfo.moduleResults ?? [])
  const modelNames = [
    ...new Set(
      modules
        .map((module) => module.modelName?.trim())
        .filter((name): name is string => Boolean(name))
    ),
  ]
  const modelVersions = [
    ...new Set(
      modules
        .map((module) => module.modelVersion?.trim())
        .filter((version): version is string => Boolean(version))
    ),
  ]
  const parsedFrameCount = parseAnalyzedFrameCount(data)
  const analyzedFrameCount =
    frameScores.length > 0 ? frameScores.length : parsedFrameCount

  return [
    {
      label: "분석 모델",
      value: modelNames.length > 0 ? modelNames.join(" · ") : modules.map((m) => formatModuleLabel(m.moduleName)).join(" · ") || "-",
    },
    {
      label: "모델 버전",
      value: modelVersions.length > 0 ? modelVersions.join(" · ") : "-",
    },
    {
      label: "입력 해상도",
      value:
        metadata?.width && metadata?.height ? `${metadata.width} x ${metadata.height}` : "-",
    },
    {
      label: "분석 프레임 수",
      value: analyzedFrameCount != null ? `${analyzedFrameCount}개` : "-",
    },
    {
      label: "영상 길이",
      value: metadata?.durationSec != null ? formatDuration(metadata.durationSec) : "-",
    },
    {
      label: "프레임레이트",
      value: metadata?.fps != null ? `${metadata.fps} fps` : "-",
    },
    {
      label: "코덱",
      value: metadata?.codec?.trim() || "-",
    },
  ]
}

export function getPriorityReviewRange(data: EvidenceDetailData | null, frameScores: FrameScore[]) {
  const segment = primarySuspiciousSegment(data)
  if (segment) {
    return {
      startSec: segment.startTime,
      endSec: segment.endTime,
      label: formatSegmentRange(segment),
    }
  }

  const highRiskFrames = frameScores
    .filter((frame) => normalizeResultValue(frame.score) >= HIGH_RISK_THRESHOLD)
    .sort((a, b) => (a.timeSec ?? 0) - (b.timeSec ?? 0))

  if (highRiskFrames.length === 0) return null

  const startSec = highRiskFrames[0].timeSec ?? 0
  const endSec = highRiskFrames[highRiskFrames.length - 1].timeSec ?? startSec
  return {
    startSec,
    endSec,
    label: `${formatDuration(startSec)} ~ ${formatDuration(endSec)}`,
  }
}

export function getModelVerdictLabel(score: number, auxiliary = false) {
  if (auxiliary) return { label: "참고", cls: "bg-teal-100 text-teal-700" }
  if (score >= HIGH_RISK_THRESHOLD) return { label: "위험", cls: "bg-red-50 text-red-700" }
  if (score >= REVIEW_THRESHOLD) return { label: "검토", cls: "bg-amber-100 text-amber-700" }
  return { label: "정상", cls: "bg-emerald-100 text-emerald-700" }
}

export function getEnsembleVerdictLabel(score: number) {
  if (score >= HIGH_RISK_THRESHOLD) return { label: "위험 신호 높음", cls: "bg-red-50 text-red-700" }
  if (score >= REVIEW_THRESHOLD) return { label: "검토 필요", cls: "bg-amber-100 text-amber-700" }
  return { label: "위험 신호 낮음", cls: "bg-emerald-100 text-emerald-700" }
}

function parseAnalyzedFrameCount(data: EvidenceDetailData | null): number | null {
  const frameRisks = data?.analysisInfo.frameRisks ?? []
  if (frameRisks.length > 0) return frameRisks.length

  const items = data?.analysisInfo.evidenceItems ?? []
  for (const line of items) {
    const match = line.match(/over\s+(\d+)\s+frames?/i)
    if (match) return Number(match[1])
  }

  const summary = data?.analysisInfo.summary?.trim()
  if (summary) {
    const match = summary.match(/over\s+(\d+)\s+frames?/i)
    if (match) return Number(match[1])
  }

  return null
}
