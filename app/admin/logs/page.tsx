"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import type { AdminLog, LogCategory } from "@/app/admin/_types/admin"
import { exportAdminLogsCsv, fetchAdminDashboardStats, fetchAdminLogs } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import { useAdminToast } from "@/app/admin/_components/admin-toast-provider"

const PAGE_SIZE = 8

const categoryLabels: Record<LogCategory, string> = {
  AUTH: "인증",
  ANALYSIS: "분석",
  ADMIN: "관리",
  COC: "CoC",
}

function getCategoryBadge(category: LogCategory) {
  const styles: Record<LogCategory, string> = {
    AUTH: "border-chart-5/40 bg-chart-5/10 text-chart-5",
    ANALYSIS: "border-primary/40 bg-primary/10 text-primary",
    ADMIN: "border-chart-3/40 bg-chart-3/10 text-chart-3",
    COC: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  }
  return (
    <Badge variant="outline" className={styles[category]}>
      {categoryLabels[category]}
    </Badge>
  )
}

export default function AdminLogsPage() {
  const [tab, setTab] = useState<"ALL" | "COC">("ALL")
  const [departmentFilter, setDepartmentFilter] = useState("ALL")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [cocCount, setCocCount] = useState(0)
  const [totalLogCount, setTotalLogCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const { toast } = useAdminToast()

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchAdminLogs({
        category: tab === "COC" ? "COC" : "ALL",
        department: departmentFilter,
        search,
        page,
        size: PAGE_SIZE,
      })
      setLogs(response.items)
      setTotal(response.total)
      setDepartments(response.departments)
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "로그 목록을 불러오지 못했습니다."
      toast({ title: "조회 실패", description: message })
    } finally {
      setLoading(false)
    }
  }, [departmentFilter, page, search, tab, toast])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  useEffect(() => {
    async function loadSummary() {
      try {
        const stats = await fetchAdminDashboardStats()
        setTodayCount(stats.todayLogs)
        setCocCount(stats.cocLogs)
        const allLogs = await fetchAdminLogs({ page: 0, size: 1 })
        setTotalLogCount(allLogs.total)
      } catch {
        // summary cards are optional if logs fail
      }
    }

    void loadSummary()
  }, [])

  const departmentStats = useMemo(() => {
    return departments
      .map((department) => ({
        department,
        count: logs.filter((log) => log.department === department).length,
      }))
      .filter((item) => item.count > 0)
  }, [departments, logs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handleExportCsv() {
    setExporting(true)
    try {
      const blob = await exportAdminLogsCsv({
        category: tab === "COC" ? "COC" : "ALL",
        department: departmentFilter,
        search,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast({
        title: "CSV 내보내기 완료",
        description: "현재 필터 조건의 로그가 다운로드되었습니다.",
      })
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "CSV 내보내기에 실패했습니다."
      toast({ title: "내보내기 실패", description: message })
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          로그 대시보드
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          시스템 로그와 CoC 로그를 부서별로 조회합니다.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">전체 로그</p>
          <p className="mt-1 text-2xl font-semibold">{totalLogCount}건</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">오늘 로그</p>
          <p className="mt-1 text-2xl font-semibold">{todayCount}건</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">CoC 로그</p>
          <p className="mt-1 text-2xl font-semibold">{cocCount}건</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={tab === "ALL" ? "default" : "outline"}
          onClick={() => {
            setTab("ALL")
            setPage(0)
          }}
        >
          전체 로그
        </Button>
        <Button
          size="sm"
          variant={tab === "COC" ? "default" : "outline"}
          onClick={() => {
            setTab("COC")
            setPage(0)
          }}
        >
          CoC 로그
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          disabled={exporting || loading}
          onClick={() => void handleExportCsv()}
        >
          {exporting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Download className="size-3" />
          )}
          CSV 내보내기
        </Button>
      </div>

      {departmentStats.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {departmentStats.map((item) => (
            <button
              key={item.department}
              type="button"
              onClick={() => {
                setDepartmentFilter(item.department)
                setPage(0)
              }}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                departmentFilter === item.department
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent/30"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{item.department}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.count}건</p>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          placeholder="행위, 부서, 사용자, 상세 검색"
          className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value)
            setPage(0)
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="ALL">전체 부서</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>시간</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead>행위</TableHead>
              <TableHead>상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  조건에 맞는 로그가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => <LogRow key={log.id} log={log} />)
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          총 {total}건 · {page + 1}/{totalPages} 페이지
          {departmentFilter !== "ALL" && ` · ${departmentFilter}`}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 0 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      </div>
    </main>
  )
}

function LogRow({ log }: { log: AdminLog }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {log.timestamp}
      </TableCell>
      <TableCell>{getCategoryBadge(log.category)}</TableCell>
      <TableCell className="font-medium text-foreground">{log.department}</TableCell>
      <TableCell className="text-primary">{log.actor}</TableCell>
      <TableCell>{log.action}</TableCell>
      <TableCell className="text-muted-foreground">{log.detail ?? "-"}</TableCell>
    </TableRow>
  )
}
