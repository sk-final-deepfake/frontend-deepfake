import type { AnalysisStatus } from "@/lib/analysis-status"

export type { AnalysisStatus }
import { apiRequest, apiRequestForm } from "@/lib/api/client"

export type MediaMetadata = {
  type?: string
  duration?: number
  codec?: string
  width?: number
  height?: number
  fps?: number
  sampleRate?: number
  channels?: number
}

export type ReadinessTier = "GOOD" | "CAUTION" | "POOR" | "BLOCK"

export type ReadinessSource = "FFPROBE" | "FRAME_SAMPLE"

export type EvidenceReadinessResponse = {
  evidenceId: number
  source?: ReadinessSource | null
  checkedAt?: string | null
  readinessTier: ReadinessTier
  confidenceCap: number
  reasons: string[]
  requiresAcknowledgement: boolean
  thresholdsVersion?: string | null
  videoMetadata?: {
    width?: number | null
    height?: number | null
    fps?: number | null
    durationSec?: number | null
  } | null
  frameCheckStatus?: string | null
  frameCheckMessage?: string | null
  frameMetrics?: {
    blur?: ReadinessMetricAggregate | null
    blockiness?: ReadinessMetricAggregate | null
    fftPeak?: ReadinessMetricAggregate | null
  } | null
  spatial?: {
    worstRegion?: string | null
    worstRegionScore?: number | null
    spatiallyUniform?: boolean | null
  } | null
}

export type ReadinessMetricAggregate = {
  mean?: number | null
  min?: number | null
  max?: number | null
}

export type FileUploadResponse = {
  success: boolean
  message: string
  evidenceId: number
  fileName: string
  caseName?: string | null
  caseNumber?: string | null
  fileSize: number
  hashAlgorithm: string
  hashValue: string
  metadata: MediaMetadata | string | null
  readiness?: EvidenceReadinessResponse | null
}

export type UploadResult = {
  evidenceId: number
  fileName: string
  caseName?: string | null
  caseNumber?: string | null
  fileSize: number
  hashAlgorithm: string
  hashValue: string
  metadata: MediaMetadata | string | null
  readiness?: EvidenceReadinessResponse | null
  uploadedAt: string
  analysisStatus?: AnalysisStatus
}

/** 백엔드 EvidenceStatsResponse (GET /api/v1/evidences/stats) */
export type EvidenceStatsResponse = {
  totalAnalysisCount: number
  deepfakeDetectedCount: number
  completedCount: number
  inProgressCount: number
}

export async function fetchEvidenceStats(): Promise<EvidenceStatsResponse> {
  return apiRequest<EvidenceStatsResponse>("/api/v1/evidences/stats")
}

export type AnalysisTrendPoint = {
  date: string
  completedCount: number
}

export type AnalysisTrendResponse = {
  days: number
  points: AnalysisTrendPoint[]
}

export async function fetchAnalysisTrend(days = 7): Promise<AnalysisTrendResponse> {
  return apiRequest<AnalysisTrendResponse>(
    `/api/v1/evidences/stats/trend?days=${days}`
  )
}

export type RecentAnalysisItem = {
  evidenceId: number
  caseId?: string | null
  caseName?: string | null
  analysisRequestId: number
  fileName: string
  requestedAt: string
  status: AnalysisStatus
  riskScore: number | null
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null
  verdictIndicator: "NORMAL" | "SUSPICIOUS" | "DANGER" | null
}

export type RecentAnalysisResponse = {
  limit: number
  items: RecentAnalysisItem[]
}

export async function fetchRecentAnalyses(limit = 5): Promise<RecentAnalysisResponse> {
  const safeLimit = Math.min(5, Math.max(3, limit))

  return apiRequest<RecentAnalysisResponse>(
    `/api/v1/evidences/stats/recent?limit=${safeLimit}`
  )
}

export type StartAnalysisResponse = {
  success: boolean
  message: string
  caseName: string
  startedCount: number
  evidenceIds: number[]
}

export type StartAnalysisOptions = {
  acknowledgeQualityWarning?: boolean
}

export async function startEvidenceAnalysis(
  evidenceIds: number[],
  caseName: string,
  options: StartAnalysisOptions = {}
): Promise<StartAnalysisResponse> {
  const body: Record<string, unknown> = { evidenceIds, caseName }

  if (options.acknowledgeQualityWarning === true) {
    body.acknowledgeQualityWarning = true
  }

  return apiRequest<StartAnalysisResponse>("/api/v1/evidences/analyze", {
    method: "POST",
    body,
  })
}

export async function fetchEvidenceReadiness(
  evidenceId: number
): Promise<EvidenceReadinessResponse> {
  return apiRequest<EvidenceReadinessResponse>(
    `/api/v1/evidences/${evidenceId}/readiness`
  )
}

export async function runEvidenceReadinessCheck(
  evidenceId: number
): Promise<EvidenceReadinessResponse> {
  return apiRequest<EvidenceReadinessResponse>(
    `/api/v1/evidences/${evidenceId}/readiness-check`,
    { method: "POST" }
  )
}

export type AnalysisStatusResponse = {
  evidenceId: number
  analysisRequestId: number
  status: AnalysisStatus
  progressPercent: number
}

export async function fetchAnalysisStatus(
  evidenceId: number
): Promise<AnalysisStatusResponse> {
  return apiRequest<AnalysisStatusResponse>(
    `/api/v1/evidences/${evidenceId}/analysis-status`
  )
}

export async function cancelEvidence(evidenceId: number): Promise<void> {
  await apiRequest<void>(`/api/v1/evidences/${evidenceId}`, {
    method: "DELETE",
  })
}

export async function resetEvidence(evidenceId: number): Promise<void> {
  await apiRequest<void>(`/api/v1/evidences/${evidenceId}/reset`, {
    method: "DELETE",
  })
}

export async function cancelAnalysis(evidenceId: number): Promise<void> {
  await apiRequest<void>(`/api/v1/evidences/${evidenceId}/analysis`, {
    method: "DELETE",
  })
}

export async function uploadEvidence(
  file: File,
  caseName?: string,
  caseNumber?: string
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append("file", file)
  const trimmedCaseName = caseName?.trim()
  const trimmedCaseNumber = caseNumber?.trim()
  const query = new URLSearchParams()
  if (trimmedCaseName) {
    query.set("caseName", trimmedCaseName)
  }
  if (trimmedCaseNumber) {
    query.set("caseNumber", trimmedCaseNumber)
  }
  const path = query.size > 0
    ? `/api/v1/evidences/upload?${query.toString()}`
    : "/api/v1/evidences/upload"

  const data = await apiRequestForm<FileUploadResponse>(path, {
    body: formData,
  })

  return {
    evidenceId: data.evidenceId,
    fileName: data.fileName,
    caseName: data.caseName,
    caseNumber: data.caseNumber,
    fileSize: data.fileSize,
    hashAlgorithm: data.hashAlgorithm,
    hashValue: data.hashValue,
    metadata: data.metadata,
    readiness: data.readiness ?? null,
    uploadedAt: new Date().toISOString(),
  }
}
