import type { CompareResult, CompareVerdict } from "@/lib/api/compare"

const STORAGE_KEY = "forenshield-compare-results"

export type StoredCompareResultSummary = {
  compareId: number
  originalEvidenceId: number
  verdict: CompareVerdict
  verdictLabel: string
  matchCount: number
  mismatchCount: number
  createdAt: string
}

function readCompareSummaries(): StoredCompareResultSummary[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCompareSummaries(summaries: StoredCompareResultSummary[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries.slice(0, 30)))
}

export function saveCompareResultSummary(result: CompareResult) {
  const summary: StoredCompareResultSummary = {
    compareId: result.compareId,
    originalEvidenceId: result.originalEvidenceId,
    verdict: result.verdict,
    verdictLabel: result.summary.verdictLabel,
    matchCount: result.summary.matchCount,
    mismatchCount: result.summary.mismatchCount,
    createdAt: result.createdAt,
  }
  const existing = readCompareSummaries().filter(
    (item) => item.compareId !== result.compareId,
  )

  writeCompareSummaries([summary, ...existing])
}

export function getLatestCompareResultSummary(evidenceId: number) {
  return readCompareSummaries()
    .filter((item) => item.originalEvidenceId === evidenceId)
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    )[0] ?? null
}
