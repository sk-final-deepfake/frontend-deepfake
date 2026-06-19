import type { AnalysisStatus } from "@/lib/analysis-status"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { getAnalysisStatusLabel, getRiskLabel, getRiskTone } from "@/lib/status-labels"

export type CaseRiskTone = "green" | "orange" | "red"

export function getCaseRiskTone(score: number, failed: boolean): CaseRiskTone {
  if (failed) return "red"
  const tone = getRiskTone(score)
  if (tone === "danger") return "red"
  if (tone === "caution") return "orange"
  return "green"
}

export function getCaseRiskClassName(tone: CaseRiskTone) {
  if (tone === "red") {
    return {
      badge: "border-red-200 bg-red-50 text-red-600",
      text: "text-red-500",
      soft: "bg-red-50 text-red-600",
      bar: "bg-red-500",
    }
  }

  if (tone === "orange") {
    return {
      badge: "border-orange-200 bg-orange-50 text-orange-600",
      text: "text-orange-500",
      soft: "bg-orange-50 text-orange-600",
      bar: "bg-orange-500",
    }
  }

  return {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
    text: "text-emerald-600",
    soft: "bg-emerald-50 text-emerald-600",
    bar: "bg-teal-500",
  }
}

export function getDisplayRiskLabel(data: EvidenceDetailData): string {
  const { analysisInfo } = data

  if (analysisInfo.status === "FAILED") return "분석 실패"
  if (analysisInfo.summary?.trim()) return analysisInfo.summary.trim()
  if (analysisInfo.status !== "COMPLETED") {
    return getAnalysisStatusLabel(analysisInfo.status)
  }

  return getRiskLabel(analysisInfo.riskScore ?? 0)
}

export function getSummaryPlaceholder(status: AnalysisStatus): string {
  if (status === "PENDING") return "분석 대기 중입니다."
  if (status === "PROCESSING") return "분석이 진행 중입니다."
  if (status === "FAILED") return "분석에 실패했습니다."
  return "분석 근거 없음"
}

export function getModuleSummaryValues(data: EvidenceDetailData, riskLabel: string) {
  const { analysisInfo } = data
  const pendingMessage = getAnalysisStatusLabel(analysisInfo.status)

  if (analysisInfo.status !== "COMPLETED") {
    return {
      deepfake: pendingMessage,
      frame: pendingMessage,
      quality: pendingMessage,
    }
  }

  const frameModule = analysisInfo.moduleResults.find((module) => /frame/i.test(module.moduleName))

  return {
    deepfake: riskLabel,
    frame: frameModule ? `${Math.round(frameModule.score * 100)}%` : "분석 근거 없음",
    quality:
      analysisInfo.confidenceScore != null ? `${analysisInfo.confidenceScore}%` : "분석 근거 없음",
  }
}

export function buildProgressSteps(data: EvidenceDetailData) {
  const { evidenceInfo, analysisInfo } = data

  return [
    { title: "파일 업로드", time: evidenceInfo.uploadedAt, done: true },
    { title: "무결성 검증", time: evidenceInfo.uploadedAt, done: true },
    { title: "프레임 분석", time: analysisInfo.requestedAt, done: Boolean(analysisInfo.requestedAt) },
    { title: "위험도 탐지", time: analysisInfo.completedAt, done: analysisInfo.status === "COMPLETED" },
    { title: "품질 평가", time: analysisInfo.completedAt, done: analysisInfo.status === "COMPLETED" },
    { title: "분석 완료", time: analysisInfo.completedAt, done: analysisInfo.status === "COMPLETED" },
  ]
}
