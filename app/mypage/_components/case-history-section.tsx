"use client"

import { useMemo } from "react"
import type { CaseSummary } from "@/app/mypage/_types/case"
import { sortCases } from "@/app/mypage/_lib/sort-cases"
import { CaseHistoryList } from "@/app/mypage/_components/case-history-list"
import { useUserSettings } from "@/hooks/use-user-settings"

export function CaseHistorySection({ cases }: { cases: CaseSummary[] }) {
  const { settings } = useUserSettings()

  const visibleCases = useMemo(() => {
    return sortCases(cases, settings.listSort).slice(0, settings.listPageSize)
  }, [cases, settings.listSort, settings.listPageSize])

  return (
    <CaseHistoryList cases={visibleCases} dateFormat={settings.dateFormat} />
  )
}
