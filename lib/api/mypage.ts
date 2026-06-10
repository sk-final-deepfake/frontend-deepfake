import { apiRequest } from "@/lib/api/client"
import type { CaseSummary } from "@/app/mypage/_types/case"
import type { ListSort, ListPageSize } from "@/lib/user-settings"

type AnalysisHistoryResponse = {
  content: CaseSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export async function fetchMyAnalysisHistory(options?: {
  sort?: ListSort
  page?: number
  size?: ListPageSize
}): Promise<AnalysisHistoryResponse> {
  const sort = options?.sort ?? "newest"
  const page = options?.page ?? 0
  const size = options?.size ?? 10

  const params = new URLSearchParams({
    sort,
    page: String(page),
    size: String(size),
  })

  return apiRequest<AnalysisHistoryResponse>(`/api/v1/mypage/analysis-history?${params}`)
}
