export type CaseStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export interface CaseSummary {
  caseId: string
  caseName: string
  status: CaseStatus
  createdAt: string
  evidenceCount: number
  representativeFileName?: string
  riskScore?: number | null
}
