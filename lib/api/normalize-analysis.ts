import type { EvidenceDetailData, FrameScore } from "@/lib/api/evidence-detail"

type UiFlags = {
  useMockFrames: boolean
  useMockDetectionSignals: boolean
  useMockModelInsights: boolean
}

export type NormalizedEvidenceDetail = EvidenceDetailData & {
  ui: UiFlags
}

function mapFrameRisksToFrameScores(detail: EvidenceDetailData): FrameScore[] {
  // Backend: analysisInfo.frameRisks[] = { timestampSec, riskScore } (0~1)
  const risks = detail.analysisInfo.frameRisks ?? []
  if (!Array.isArray(risks) || risks.length === 0) return detail.analysisInfo.frameScores ?? []

  return risks.map((r) => ({
    timeSec: r.timestampSec,
    score: r.riskScore,
  }))
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

