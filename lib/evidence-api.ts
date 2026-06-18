import type { AnalysisStatus } from "@/lib/analysis-status"

export type { AnalysisStatus }
import { apiFetch, apiFetchForm } from "@/lib/api-client"
import {
  mockCancelAnalysis,
  mockFetchAnalysisStatus,
  mockFetchEvidenceStats,
  mockStartEvidenceAnalysis,
  mockUploadEvidence,
} from "@/lib/mock-forensic-api"

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false"

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

export type EvidenceStatsResponse = {
  imageCount: number
  videoCount: number
  audioCount: number
}

export async function fetchEvidenceStats(): Promise<EvidenceStatsResponse> {
  if (USE_MOCK_API) {
    return mockFetchEvidenceStats()
  }

  return apiFetch<EvidenceStatsResponse>("/api/v1/evidences/stats")
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
  if (USE_MOCK_API) {
    return mockStartEvidenceAnalysis(evidenceIds, caseName)
  }

  return apiFetch<StartAnalysisResponse>("/api/v1/evidences/analyze", {
    method: "POST",
    body: JSON.stringify({ evidenceIds, caseName }),
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
  if (USE_MOCK_API) {
    return mockFetchAnalysisStatus(evidenceId)
  }

  return apiFetch<AnalysisStatusResponse>(
    `/api/v1/evidences/${evidenceId}/analysis-status`
  )
}

export async function cancelEvidence(evidenceId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/evidences/${evidenceId}`, {
    method: "DELETE",
  })
}

export async function resetEvidence(evidenceId: number): Promise<void> {
  await apiFetch<void>(`/api/v1/evidences/${evidenceId}/reset`, {
    method: "DELETE",
  })
}

export async function cancelAnalysis(evidenceId: number): Promise<void> {
  if (USE_MOCK_API) {
    return mockCancelAnalysis(evidenceId)
  }

  await apiFetch<void>(`/api/v1/evidences/${evidenceId}/analysis`, {
    method: "DELETE",
  })
}

export async function uploadEvidence(
  file: File,
  caseName?: string
): Promise<UploadResult> {
  if (USE_MOCK_API) {
    return mockUploadEvidence(file, caseName)
  }

  const formData = new FormData()
  formData.append("file", file)
  if (caseName?.trim()) {
    formData.append("caseName", caseName.trim())
  }

  const data = await apiFetchForm<FileUploadResponse>("/api/v1/evidences/upload", formData)

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
