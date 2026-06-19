import { apiDownload, apiRequest, apiRequestForm } from "@/lib/api/client"

export type CompareVerdict = "ORIGINAL_MATCH" | "TAMPERED" | "INCONCLUSIVE"
export type CompareItemResult = "MATCH" | "MISMATCH" | "SKIPPED"

export type CompareSummary = {
  matchCount: number
  mismatchCount: number
  skippedCount: number
  verdictLabel: string
}

export type CompareItem = {
  itemKey: string
  label: string
  originalValue: string
  candidateValue: string
  result: CompareItemResult
}

export type CompareResult = {
  compareId: number
  originalEvidenceId: number
  candidateFileName: string
  verdict: CompareVerdict
  summary: CompareSummary
  items: CompareItem[]
  createdAt: string
}

export async function verifyCompare(evidenceId: number, file: File, requestId?: string): Promise<CompareResult> {
  const formData = new FormData()
  formData.append("file", file)

  const query = new URLSearchParams({ evidenceId: String(evidenceId) })
  if (requestId) {
    query.set("requestId", requestId)
  }

  return apiRequestForm<CompareResult>(
    `/api/v1/compare/verify?${query.toString()}`,
    {
      body: formData,
    }
  )
}

export async function cancelCompareVerification(requestId: string): Promise<void> {
  return apiRequest<void>(
    `/api/v1/compare/cancel?requestId=${encodeURIComponent(requestId)}`,
    {
      method: "POST",
    }
  )
}

export async function fetchCompareResult(compareId: number): Promise<CompareResult> {
  return apiRequest<CompareResult>(`/api/v1/compare/${compareId}`)
}

export async function downloadCompareReport(compareId: number): Promise<Blob> {
  return apiDownload(`/api/v1/compare/${compareId}/reports/pdf`)
}
