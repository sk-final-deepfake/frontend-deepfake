import { apiFetch, apiFetchForm } from "@/lib/api-client"

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
}

export type EvidenceStatsResponse = {
  imageCount: number
  videoCount: number
  audioCount: number
}

export async function fetchEvidenceStats(): Promise<EvidenceStatsResponse> {
  return apiFetch<EvidenceStatsResponse>("/api/evidences/stats")
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

  const data = await apiFetchForm<FileUploadResponse>("/api/evidences/upload", formData)

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
