import {
  formatScoreOutOf100,
  getDetectionThreshold,
  normalizeResultValue,
} from "@/lib/api/analysis-result-ui"
import type {
  ClipRisk,
  EvidenceDetailData,
  FrameRisk,
  FrameScore,
  ModelScore,
  ModuleResult,
  ModuleTimeline,
  ModuleTimelineKind,
  PairRisk,
  SuspiciousSegment,
} from "@/lib/api/evidence-detail"

export type DeepfakeTimelineTab = {
  key: ModuleTimelineKind
  label: string
  title: string
  description: string
  modelName: string
  modelVersion: string | null
  videoScore: number | null
  threshold: number
  detected: boolean
  points: FrameScore[]
  segments: SuspiciousSegment[]
  unitLabel: string
}

export type ForgeryTimelineTab = {
  key: string
  label: string
  description: string
  modelName: string | null
  videoScore: number
  threshold: number
  detected: boolean
  points: FrameScore[]
  segments: SuspiciousSegment[]
}

const TIMELINE_DISPLAY: Record<ModuleTimelineKind, { label: string; title: string; description: string; unitLabel: string }> = {
  cnn: {
    label: "Xception",
    title: "프레임별 위험도",
    description: "얼굴 경계·질감 패턴의 프레임 단위 조작 의심 신호입니다.",
    unitLabel: "프레임",
  },
  temporal: {
    label: "TimeSformer",
    title: "클립별 위험도",
    description: "연속 프레임 흐름의 클립 단위 시간 일관성 이상 신호입니다.",
    unitLabel: "클립",
  },
  optical: {
    label: "GMFlow",
    title: "프레임쌍 위험도",
    description: "연속 프레임쌍 움직임 벡터의 불안정 패턴입니다.",
    unitLabel: "프레임쌍",
  },
}

const FORGERY_LABELS: Record<string, string> = {
  frameedit: "Frame Edit",
  frame_edit: "Frame Edit",
  splicing: "Splicing",
  reencoding: "Re-encoding",
  re_encoding: "Re-encoding",
  forgery: "Forgery",
  tamper: "Tamper",
  localization: "Localization",
}

export function buildDeepfakeTimelineTabs(
  data: EvidenceDetailData | null,
  threshold = getDetectionThreshold(data)
): DeepfakeTimelineTab[] {
  if (!data) return []

  const timelines = data.analysisInfo.moduleTimelines ?? []
  const modelScores = data.analysisInfo.modelScores ?? []

  return (["cnn", "temporal", "optical"] as const).map((key) => {
    const timeline = timelines.find((item) => item.module === key)
    const modelScore = findModelScore(modelScores, modelScoreKeyForTimeline(key))
    const display = TIMELINE_DISPLAY[key]
    const moduleThreshold = normalizeThreshold(timeline?.threshold, threshold)
    const videoScore =
      timeline?.videoScore != null
        ? normalizeResultValue(timeline.videoScore)
        : modelScore?.score != null
          ? normalizeResultValue(modelScore.score)
          : null

    return {
      key,
      label: display.label,
      title: display.title,
      description: display.description,
      unitLabel: display.unitLabel,
      modelName: timeline?.modelName?.trim() || modelScore?.modelName?.trim() || display.label,
      modelVersion: timeline?.modelVersion?.trim() || modelScore?.modelVersion?.trim() || null,
      videoScore,
      threshold: moduleThreshold,
      detected:
        timeline?.detected ??
        modelScore?.detected ??
        (videoScore != null ? videoScore >= moduleThreshold : false),
      points: buildDeepfakeTimelinePoints(key, data, timeline),
      segments: buildDeepfakeTimelineSegments(key, data, timeline),
    }
  })
}

export function getXceptionFrameScores(data: EvidenceDetailData | null): FrameScore[] {
  const cnnTab = buildDeepfakeTimelineTabs(data).find((tab) => tab.key === "cnn")
  if (cnnTab && cnnTab.points.length > 0) return cnnTab.points
  if (!data) return []
  return data.analysisInfo.frameScores ?? []
}

export function buildForgeryTimelineTabs(
  data: EvidenceDetailData | null,
  threshold = getDetectionThreshold(data)
): ForgeryTimelineTab[] {
  if (!data) return []

  return (data.analysisInfo.moduleResults ?? [])
    .filter((module) => isForgeryModule(module))
    .map((module) => {
      const segments = module.affectedSegments ?? []
      const points = segmentsToFrameScores(segments)
      const score = normalizeResultValue(module.score)
      const label = formatForgeryModuleLabel(module.moduleName)

      return {
        key: module.moduleName,
        label,
        description: `${label} 모듈이 보고한 구간별 위변조 의심 신호입니다.`,
        modelName: module.modelName?.trim() || null,
        videoScore: score,
        threshold,
        detected: module.detected || score >= threshold,
        points,
        segments,
      }
    })
    .sort((a, b) => b.videoScore - a.videoScore)
}

function buildDeepfakeTimelinePoints(
  key: ModuleTimelineKind,
  data: EvidenceDetailData,
  timeline?: ModuleTimeline
): FrameScore[] {
  if (key === "cnn") {
    const risks = nonEmpty(timeline?.frameRisks) ? timeline?.frameRisks : data.analysisInfo.frameRisks
    const points = frameRisksToFrameScores(risks ?? [])
    return points.length > 0 ? points : data.analysisInfo.frameScores ?? []
  }

  if (key === "temporal") {
    const risks = nonEmpty(timeline?.clipRisks) ? timeline?.clipRisks : data.analysisInfo.clipRisks
    return clipRisksToFrameScores(risks ?? [])
  }

  const risks = nonEmpty(timeline?.pairRisks) ? timeline?.pairRisks : data.analysisInfo.pairRisks
  return pairRisksToFrameScores(risks ?? [])
}

function buildDeepfakeTimelineSegments(
  key: ModuleTimelineKind,
  data: EvidenceDetailData,
  timeline?: ModuleTimeline
): SuspiciousSegment[] {
  if (nonEmpty(timeline?.suspiciousSegments)) return timeline?.suspiciousSegments ?? []
  if (key === "cnn") return data.analysisInfo.suspiciousSegments ?? []
  if (key === "temporal") return data.analysisInfo.temporalSuspiciousSegments ?? []
  return data.analysisInfo.opticalSuspiciousSegments ?? []
}

function segmentsToFrameScores(segments: SuspiciousSegment[]): FrameScore[] {
  return segments.map((segment) => ({
    timeSec: Number(((segment.startTime + segment.endTime) / 2).toFixed(2)),
    timestamp: `${formatSeconds(segment.startTime)}-${formatSeconds(segment.endTime)}`,
    score: segment.maxRiskScore,
  }))
}

function frameRisksToFrameScores(risks: FrameRisk[]): FrameScore[] {
  return risks.map((risk) => ({
    timeSec: risk.timestampSec,
    score: risk.riskScore,
  }))
}

function clipRisksToFrameScores(risks: ClipRisk[]): FrameScore[] {
  return risks.map((risk) => ({
    timeSec: Number(((risk.startTimeSec + risk.endTimeSec) / 2).toFixed(2)),
    timestamp: `${formatSeconds(risk.startTimeSec)}-${formatSeconds(risk.endTimeSec)}`,
    score: risk.riskScore,
  }))
}

function pairRisksToFrameScores(risks: PairRisk[]): FrameScore[] {
  return risks.map((risk) => ({
    timeSec: risk.timestampSec,
    score: risk.riskScore,
  }))
}

function findModelScore(scores: ModelScore[], moduleName: string) {
  const normalized = normalizeModelScoreModuleName(moduleName)
  return scores.find((score) => normalizeModelScoreModuleName(score.moduleName) === normalized)
}

function modelScoreKeyForTimeline(key: ModuleTimelineKind) {
  if (key === "cnn") return "deepfake_cnn"
  if (key === "temporal") return "deepfake_temporal"
  return "deepfake_optical"
}

function normalizeModelScoreModuleName(moduleName: string | null | undefined) {
  const normalized = moduleName?.trim().toLowerCase() ?? ""
  if (["late_fusion", "fusion", "late fusion"].includes(normalized)) return "deepfake"
  if (["cnn", "xception"].includes(normalized)) return "deepfake_cnn"
  if (["temporal", "timesformer"].includes(normalized)) return "deepfake_temporal"
  if (["optical", "gmflow"].includes(normalized)) return "deepfake_optical"
  return normalized
}

function normalizeThreshold(value: number | null | undefined, fallback: number) {
  if (value == null || !Number.isFinite(Number(value))) return fallback
  return normalizeResultValue(Number(value))
}

function nonEmpty<T>(items: T[] | null | undefined): items is T[] {
  return Array.isArray(items) && items.length > 0
}

function isForgeryModule(module: ModuleResult) {
  const name = module.moduleName.toLowerCase()
  return (
    name.includes("forgery") ||
    name.includes("tamper") ||
    name.includes("frameedit") ||
    name.includes("frame_edit") ||
    name.includes("splicing") ||
    name.includes("reencoding") ||
    name.includes("re_encoding") ||
    name.includes("localization") ||
    name.includes("mask")
  )
}

function formatForgeryModuleLabel(moduleName: string) {
  const normalized = moduleName.trim().toLowerCase().replace(/[\s-]+/g, "_")
  for (const [key, label] of Object.entries(FORGERY_LABELS)) {
    if (normalized.includes(key)) return label
  }
  return moduleName
}

function formatSeconds(value: number) {
  const normalized = Math.max(0, Number.isFinite(value) ? value : 0)
  const minutes = Math.floor(normalized / 60)
  const seconds = Math.floor(normalized % 60)
  const tenth = Math.floor((normalized % 1) * 10)
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenth}`
}

export function summarizeFrameScores(scores: FrameScore[], threshold: number) {
  const peak =
    scores.length > 0
      ? scores.reduce((best, frame) => (normalizeResultValue(frame.score) > normalizeResultValue(best.score) ? frame : best))
      : null
  const avg =
    scores.length > 0
      ? scores.reduce((sum, frame) => sum + normalizeResultValue(frame.score), 0) / scores.length
      : null
  const highRiskCount = scores.filter((frame) => normalizeResultValue(frame.score) >= threshold).length

  return {
    peak,
    avg,
    highRiskCount,
    peakLabel:
      peak?.timeSec != null
        ? `${formatSeconds(peak.timeSec)} 지점`
        : peak?.timestamp ?? "-",
    peakValue: peak ? formatScoreOutOf100(peak.score) : "-",
    avgValue: avg != null ? formatScoreOutOf100(avg) : "-",
  }
}
