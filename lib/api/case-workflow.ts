import type { AnalysisType, CaseDetailData, EvidenceRole } from "@/lib/api/evidence-detail"
import {
  mockCreateCase,
  mockCancelAnalysis,
  mockMarkEvidenceExcluded,
  mockReplaceEvidence,
  mockSetEvidenceRole,
  mockSetRepresentativeEvidence,
  mockStartCaseAnalysis,
  mockUploadEvidenceToCase,
} from "@/lib/mock/forensic-api"
import {
  cancelAnalysis,
  startEvidenceAnalysis,
  uploadEvidence,
  type StartAnalysisResponse,
  type UploadResult,
} from "@/lib/evidence-api"
import { features } from "@/lib/features"

export type StartCaseAnalysisPayload = {
  caseId: string
  caseName: string
  analysisType: AnalysisType
  evidenceIds: number[]
  baseEvidenceId?: number | null
  targetEvidenceId?: number | null
}

export async function createCase(caseName: string): Promise<CaseDetailData> {
  if (features.mockApi) {
    return mockCreateCase(caseName)
  }

  return {
    caseId: caseName.trim(),
    caseName: caseName.trim(),
    status: "PENDING",
    createdAt: new Date().toISOString(),
    representativeEvidenceId: null,
    evidences: [],
  }
}

export async function uploadEvidenceToCase(
  caseId: string,
  caseName: string,
  file: File
): Promise<UploadResult> {
  if (features.mockApi) {
    return mockUploadEvidenceToCase(caseId, file)
  }

  return uploadEvidence(file, caseName)
}

export async function markEvidenceExcluded(evidenceId: number, reason: string): Promise<void> {
  if (features.mockApi) {
    return mockMarkEvidenceExcluded(evidenceId, reason)
  }

  throw new Error("사용 제외 기능은 백엔드 API 계약 후 사용할 수 있습니다.")
}

export async function replaceEvidenceInCase(
  caseId: string,
  oldEvidenceId: number,
  file: File,
  reason: string
): Promise<UploadResult> {
  if (features.mockApi) {
    return mockReplaceEvidence(caseId, oldEvidenceId, file, reason)
  }

  throw new Error("대체 증거 등록 기능은 백엔드 API 계약 후 사용할 수 있습니다.")
}

export async function setRepresentativeEvidence(caseId: string, evidenceId: number): Promise<void> {
  if (features.mockApi) {
    return mockSetRepresentativeEvidence(caseId, evidenceId)
  }

  throw new Error("대표 증거 지정 기능은 백엔드 API 계약 후 사용할 수 있습니다.")
}

export async function setEvidenceRole(evidenceId: number, role: EvidenceRole): Promise<void> {
  if (features.mockApi) {
    return mockSetEvidenceRole(evidenceId, role)
  }

  throw new Error("증거 역할 변경 기능은 백엔드 API 계약 후 사용할 수 있습니다.")
}

export async function startCaseAnalysis(
  payload: StartCaseAnalysisPayload
): Promise<StartAnalysisResponse> {
  if (features.mockApi) {
    return mockStartCaseAnalysis(payload)
  }

  return startEvidenceAnalysis(payload.evidenceIds, payload.caseName)
}

export async function cancelCaseAnalysis(evidenceId: number): Promise<void> {
  if (features.mockApi) {
    return mockCancelAnalysis(evidenceId)
  }

  return cancelAnalysis(evidenceId)
}
