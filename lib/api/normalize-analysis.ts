import type { EvidenceDetailData, FrameScore, ModuleResult } from "@/lib/api/evidence-detail"

const VIDEO_TIMELINE_MODULE = "video_timeline"

type UiFlags = {
  useMockFrames: boolean
  useMockDetectionSignals: boolean
  useMockModelInsights: boolean
}

export type NormalizedEvidenceDetail = EvidenceDetailData & {
  ui: UiFlags
}

function readFrameRisksFromTimelineModule(modules: ModuleResult[]): FrameScore[] {
  const timeline = modules.find((module) => module.moduleName.toLowerCase() === VIDEO_TIMELINE_MODULE)
  if (!timeline?.details?.trim()) return []

  try {
    const parsed = JSON.parse(timeline.details) as { frameRisks?: Array<Record<string, unknown>> }
    const risks = parsed.frameRisks ?? []
    if (!Array.isArray(risks) || risks.length === 0) return []

    return risks.map((risk, index) => ({
      timeSec: typeof risk.timestampSec === "number" ? risk.timestampSec : index,
      score: typeof risk.riskScore === "number" ? risk.riskScore : 0,
    }))
  } catch {
    return []
  }
}

function mapFrameRisksToFrameScores(detail: EvidenceDetailData): FrameScore[] {
  // Backend: analysisInfo.frameRisks[] = { timestampSec, riskScore } (0~1)
  const risks = detail.analysisInfo.frameRisks ?? []
  if (Array.isArray(risks) && risks.length > 0) {
    return risks.map((r) => ({
      timeSec: r.timestampSec,
      score: r.riskScore,
    }))
  }

  const fromTimeline = readFrameRisksFromTimelineModule(detail.analysisInfo.moduleResults ?? [])
  if (fromTimeline.length > 0) return fromTimeline

  return detail.analysisInfo.frameScores ?? []
}

export function normalizeEvidenceDetailForUi(detail: EvidenceDetailData): NormalizedEvidenceDetail {
  const frameScores = mapFrameRisksToFrameScores(detail)
  const moduleResults = detail.analysisInfo.moduleResults ?? []
  const modelScores = detail.analysisInfo.modelScores ?? []

  const useMockFrames = frameScores.length === 0
  const useMockDetectionSignals = moduleResults.length === 0
  const useMockModelInsights = modelScores.length === 0

  return {
    ...detail,
    analysisInfo: {
      ...detail.analysisInfo,
      frameScores,
    },
    ui: {
      useMockFrames,
      useMockDetectionSignals,
      useMockModelInsights,
    },
  }
}

