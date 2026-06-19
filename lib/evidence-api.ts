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

export type FileUploadResponse = {
  success: boolean
  message: string
  evidenceId: number
  fileName: string
  caseName?: string | null
  fileSize: number
  hashAlgorithm: string
  hashValue: string
  metadata: MediaMetadata | string | null
}

export type UploadResult = {
  evidenceId: number
  fileName: string
  caseName?: string | null
  fileSize: number
  hashAlgorithm: string
  hashValue: string
  metadata: MediaMetadata | string | null
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

export async function startEvidenceAnalysis(
  evidenceIds: number[],
  caseName: string
): Promise<StartAnalysisResponse> {
  return apiRequest<StartAnalysisResponse>("/api/v1/evidences/analyze", {
    method: "POST",
    body: { evidenceIds, caseName },
  })
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
  caseName?: string
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append("file", file)
  if (caseName?.trim()) {
    formData.append("caseName", caseName.trim())
  }

  const data = await apiRequestForm<FileUploadResponse>("/api/v1/evidences/upload", {
    body: formData,
  })

  return {
    evidenceId: data.evidenceId,
    fileName: data.fileName,
    caseName: data.caseName,
    fileSize: data.fileSize,
    hashAlgorithm: data.hashAlgorithm,
    hashValue: data.hashValue,
    metadata: data.metadata,
    uploadedAt: new Date().toISOString(),
  }
}
