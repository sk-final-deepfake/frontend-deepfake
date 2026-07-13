import {
  formatScoreOutOf100,
  normalizeResultValue,
  type UiRiskSignal,
} from "@/lib/api/analysis-result-ui"
import type { EvidenceDetailData, ModelScore, ModuleResult, RepresentativeFrame } from "@/lib/api/evidence-detail"
import { formatDuration } from "@/lib/formatters"

import {
  buildForgeryTimelineTabs,
  type ForgeryTimelineTab,
} from "./module-timelines"

export const FORGERY_SPATIAL_MODULE = "forgery_spatial"
export const FORGERY_TEMPORAL_MODULE = "forgery_temporal"

export const DEFAULT_FORGERY_THRESHOLDS = {
  spatial: 0.515,
  temporal: 0.12,
} as const

export type ForgeryModuleKey = typeof FORGERY_SPATIAL_MODULE | typeof FORGERY_TEMPORAL_MODULE

/** moduleName·modelName 조합으로 spatial/temporal 구분 */
export function resolveForgeryModuleKey(
  moduleName: string | null | undefined,
  modelName?: string | null
): ForgeryModuleKey | null {
  const module = (moduleName ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  const model = (modelName ?? "").trim().toLowerCase()

  if (module === FORGERY_SPATIAL_MODULE || module.includes("spatial") || model.includes("trufor")) {
    return FORGERY_SPATIAL_MODULE
  }
  if (
    module === FORGERY_TEMPORAL_MODULE ||
    module.includes("temporal") ||
    model.includes("timesformer")
  ) {
    return FORGERY_TEMPORAL_MODULE
  }
  if (module.includes("forgery") || module.includes("tamper")) {
    if (model.includes("timesformer")) return FORGERY_TEMPORAL_MODULE
    if (model.includes("trufor")) return FORGERY_SPATIAL_MODULE
  }
  return null
}

export function forgeryModuleLabel(key: ForgeryModuleKey) {
  return key === FORGERY_SPATIAL_MODULE ? "TruFor (Spatial)" : "TimeSformer (Temporal)"
}

export function forgeryModuleThreshold(key: ForgeryModuleKey) {
  return key === FORGERY_SPATIAL_MODULE
    ? DEFAULT_FORGERY_THRESHOLDS.spatial
    : DEFAULT_FORGERY_THRESHOLDS.temporal
}

export function getForgerySpatialTimeline(
  data: EvidenceDetailData | null
): ForgeryTimelineTab | null {
  return buildForgeryTimelineTabs(data).find((tab) => tab.key === FORGERY_SPATIAL_MODULE) ?? null
}

export function getForgeryTemporalTimeline(
  data: EvidenceDetailData | null
): ForgeryTimelineTab | null {
  return buildForgeryTimelineTabs(data).find((tab) => tab.key === FORGERY_TEMPORAL_MODULE) ?? null
}

/** 결과보기 > 위변조 탐지: TruFor(spatial)만 */
export function buildForgeryResultTabSignals(
  data: EvidenceDetailData | null,
  fallbackThreshold: number
): UiRiskSignal[] {
  const spatialTab = getForgerySpatialTimeline(data)
  const spatialThreshold = spatialTab?.threshold ?? DEFAULT_FORGERY_THRESHOLDS.spatial

  const modelScores = (data?.analysisInfo.modelScores ?? []).filter((score) => {
    const key = resolveForgeryModuleKey(score.moduleName, score.modelName)
    return key === FORGERY_SPATIAL_MODULE
  })
  const modules = (data?.analysisInfo.moduleResults ?? []).filter((module) => {
    const key = resolveForgeryModuleKey(module.moduleName, module.modelName)
    return key === FORGERY_SPATIAL_MODULE
  })

  const sources: Array<{
    score: number
    detected: boolean
    modelName: string | null
    modelVersion: string | null
    segments: UiRiskSignal["segments"]
  }> =
    modelScores.length > 0
      ? modelScores.map((score) => ({
          score: score.score,
          detected: Boolean(score.detected),
          modelName: score.modelName,
          modelVersion: score.modelVersion ?? null,
          segments: segmentsFromSpatialTab(spatialTab),
        }))
      : modules.length > 0
        ? modules.map((module) => ({
            score: module.score,
            detected: Boolean(module.detected),
            modelName: module.modelName ?? null,
            modelVersion: module.modelVersion ?? null,
            segments: segmentsFromModule(module, spatialTab),
          }))
        : spatialTab
          ? [
              {
                score: spatialTab.videoScore,
                detected: spatialTab.detected,
                modelName: spatialTab.modelName,
                modelVersion: spatialTab.modelVersion,
                segments: spatialTab.segments.map((segment) => ({
                  label: `${formatDuration(segment.startTime)} ~ ${formatDuration(segment.endTime)}`,
                  startSec: segment.startTime,
                })),
              },
            ]
          : []

  return sources.map((source) => {
    const score = normalizeResultValue(source.score)
    const modelLabel =
      source.modelName?.trim()
        ? source.modelVersion?.trim()
          ? `${source.modelName.trim()} ${source.modelVersion.trim()}`
          : source.modelName.trim()
        : null
    return {
      label: "TruFor (Spatial)",
      modelLabel,
      definition: "TruFor가 보고한 국소 위변조(픽셀·객체 단위) 의심 신호입니다.",
      badge: signalBadgeFromScore(score, source.detected, spatialThreshold),
      score,
      thresholdPercent: Math.round(spatialThreshold * 100),
      tone: signalToneFromScore(score, spatialThreshold),
      segments: source.segments,
    }
  })
}

export function getForgeryPriorityReviewRange(data: EvidenceDetailData | null) {
  const spatialTab = getForgerySpatialTimeline(data)
  if (!spatialTab) return null

  const segments = spatialTab.segments
  if (segments.length > 0) {
    const top = [...segments].sort((a, b) => b.maxRiskScore - a.maxRiskScore)[0]
    return {
      startSec: top.startTime,
      endSec: top.endTime,
      label: `${formatDuration(top.startTime)} ~ ${formatDuration(top.endTime)}`,
    }
  }

  const threshold = spatialTab.threshold
  const hotFrames = spatialTab.points
    .filter((point) => normalizeResultValue(point.score) >= threshold)
    .sort((a, b) => (a.timeSec ?? 0) - (b.timeSec ?? 0))

  if (hotFrames.length === 0) return null

  const startSec = hotFrames[0].timeSec ?? 0
  const endSec = hotFrames[hotFrames.length - 1].timeSec ?? startSec
  return {
    startSec,
    endSec,
    label: `${formatDuration(startSec)} ~ ${formatDuration(endSec)}`,
  }
}

/** TruFor frameRisks 상위 프레임 → 대표 프레임 카드 (이미지 URL 없으면 점수·시각만) */
export function buildForgeryRepresentativeFrames(
  data: EvidenceDetailData | null,
  maxFrames = 2
): RepresentativeFrame[] {
  const spatialTab = getForgerySpatialTimeline(data)
  if (!spatialTab || spatialTab.points.length === 0) return []

  const fromApi = (data?.analysisInfo.representativeFrames ?? []).filter((frame) => {
    if (!frame.imageUrl?.trim()) return false
    const mod = String(frame.module ?? "").toLowerCase()
    return mod.includes("forgery") || mod.includes("trufor") || mod.includes("spatial")
  })
  if (fromApi.length > 0) return fromApi.slice(0, maxFrames)

  return [...spatialTab.points]
    .sort((a, b) => normalizeResultValue(b.score) - normalizeResultValue(a.score))
    .slice(0, maxFrames)
    .map((point, index) => ({
      timeSec: point.timeSec ?? 0,
      timestamp: point.timestamp ?? formatDuration(point.timeSec ?? 0),
      frameNumber: index,
      score: normalizeResultValue(point.score),
      imageUrl: null,
    }))
}

function segmentsFromSpatialTab(tab: ForgeryTimelineTab | null): UiRiskSignal["segments"] {
  if (!tab) return []
  return tab.segments.map((segment) => ({
    label: `${formatDuration(segment.startTime)} ~ ${formatDuration(segment.endTime)}`,
    startSec: segment.startTime,
  }))
}

function segmentsFromModule(module: ModuleResult, tab: ForgeryTimelineTab | null): UiRiskSignal["segments"] {
  const fromModule = (module.affectedSegments ?? []).map((segment) => ({
    label: `${formatDuration(segment.startTime)} ~ ${formatDuration(segment.endTime)}`,
    startSec: segment.startTime,
  }))
  if (fromModule.length > 0) return fromModule
  return segmentsFromSpatialTab(tab)
}

function signalToneFromScore(score: number, threshold: number): UiRiskSignal["tone"] {
  if (score >= threshold) return "danger"
  if (score >= threshold * 0.6) return "warning"
  return "neutral"
}

function signalBadgeFromScore(score: number, detected: boolean, threshold: number) {
  if (score >= threshold || detected) return "우선 확인"
  if (score >= threshold * 0.6) return "추가 검토"
  return "낮음"
}

export function formatForgeryThresholdLabel(threshold: number) {
  return `모델 기준 ${Math.round(threshold * 100)}점`
}
