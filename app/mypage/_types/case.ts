export type CaseStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export interface CaseSummary {
  caseId: string
  caseName: string
  status: CaseStatus
  createdAt: string
  evidenceCount: number
  representativeFileName?: string
  representativeEvidenceId?: number | null
  representativeEvidenceLabel?: string | null
  riskScore?: number | null
}
