import { apiRequest } from "@/lib/api/client"

export type TechnicalMetadata = {
  // Common
  extractionStatus: string
  
  // Video
  width?: number
  height?: number
  durationSec?: number
  fps?: number
  codec?: string
  
  // Audio
  sampleRate?: number
  channels?: number
  
  // Image
  deviceInfo?: string
  capturedAt?: string
}

export type EvidenceInfo = {
  evidenceId: number
  fileName: string
  caseName: string
  fileSize: number
  uploadedAt: string
  mediaType: string // Added mediaType
  technicalMetadata: TechnicalMetadata
}

export type IntegrityInfo = {
  hashAlgorithm: string
  originalHash: string
  chainValid: boolean
  verificationStatus: string
}

export type ModuleResult = {
  moduleName: string
  detected: boolean
  score: number
  details: string
}

export type AnalysisInfo = {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  requestedAt: string | null
  completedAt: string | null
  riskScore: number | null
  confidenceScore: number | null
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null
  summary: string
  moduleResults: ModuleResult[]
}

export type CocLog = {
  logId: number
  eventType: string
  userId: string
  description: string
  createdAt: string
  currentLogHash: string
}

export type EvidenceDetailData = {
  evidenceInfo: EvidenceInfo
  integrityInfo: IntegrityInfo
  analysisInfo: AnalysisInfo
  cocLogs: CocLog[]
}

export type CaseEvidenceSummary = {
  evidenceId: number
  fileName: string
  mediaType: string
  analysisStatus: string
}

export type CaseDetailData = {
  caseId: string
  caseName: string
  status: string
  createdAt: string
  evidences: CaseEvidenceSummary[]
}

export async function fetchEvidenceDetail(evidenceId: number): Promise<EvidenceDetailData> {
  return apiRequest<EvidenceDetailData>(`/api/evidences/${evidenceId}/detail`)
}

export async function fetchCaseDetail(caseId: string): Promise<CaseDetailData> {
  return apiRequest<CaseDetailData>(`/api/v1/cases/${encodeURIComponent(caseId)}`)
}
