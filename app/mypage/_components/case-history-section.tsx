"use client"

import { useMemo } from "react"
import type { CaseSummary } from "@/app/mypage/_types/case"
import { sortCases } from "@/app/mypage/_lib/sort-cases"
import { CaseHistoryList } from "@/app/mypage/_components/case-history-list"
import { useUserSettings } from "@/hooks/use-user-settings"

export function CaseHistorySection({
  cases,
  page = 1,
  pageSize = 10,
}: {
  cases: CaseSummary[]
  page?: number
  pageSize?: number
}) {
  const { settings } = useUserSettings()

  const visibleCases = useMemo(() => {
    const sorted = sortCases(cases, settings.listSort)
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [cases, page, pageSize, settings.listSort])

  return (
    <CaseHistoryList cases={visibleCases} dateFormat={settings.dateFormat} />
  )
}
