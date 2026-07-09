import { apiDownload, apiRequest } from "@/lib/api/client"
import { features } from "@/lib/features"

export type ReportType = "ANALYSIS" | "COMPARE" | string

export type ReportSummary = {
  reportId: number
  reportType: ReportType
  evidenceId: number | null
  compareId?: number | null
  caseId?: string | null
  caseName?: string | null
  reportFileName: string
  verdictLabel?: string | null
  createdAt: string
  reportHash: string
  downloadPath: string
}

export type ReportListPage = {
  content: ReportSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export async function fetchReports(page = 0, size = 10): Promise<ReportListPage> {
  if (features.mockApi) {
    await delay(350)
    return buildMockReports(page, size)
  }

  const params = new URLSearchParams({ page: String(page), size: String(size) })
  return apiRequest<ReportListPage>(`/api/v1/reports?${params.toString()}`)
}

export async function downloadReportPdf(report: ReportSummary): Promise<Blob> {
  if (features.mockApi) {
    const response = await fetch("/mock/report-sample.pdf")
    if (!response.ok) {
      throw new Error("샘플 PDF를 불러오지 못했습니다.")
    }
    return response.blob()
  }

  return apiDownload(report.downloadPath)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildMockReports(page: number, size: number): ReportListPage {
  const reports: ReportSummary[] = [
    {
      reportId: 12,
      reportType: "ANALYSIS",
      evidenceId: 2024062716,
      compareId: null,
      caseId: "CASE-20240627",
      caseName: "협박 메시지 영상 분석",
      reportFileName: "ForenShield_Report_EVD-2024062716.pdf",
      verdictLabel: "위험",
      createdAt: "2026-07-03T13:28:00+09:00",
      reportHash: "a3f81c09d2e47b16f8c05a913e2d84c7715f0b6a8d94e21c3b7f6a0d5e8c92d4",
      downloadPath: "/api/v1/evidences/2024062716/reports/pdf",
    },
    {
      reportId: 18,
      reportType: "COMPARE",
      evidenceId: 2024062718,
      compareId: 8802,
      caseId: "CASE-20240628",
      caseName: "원본 비교검증",
      reportFileName: "ForenShield_Compare_Report_8802.pdf",
      verdictLabel: "원본 일치",
      createdAt: "2026-07-04T09:45:00+09:00",
      reportHash: "c4d81c09d2e47b16f8c05a913e2d84c7715f0b6a8d94e21c3b7f6a0d5e8c12a",
      downloadPath: "/api/v1/compare/8802/reports/pdf",
    },
  ]
  const start = page * size
  const content = reports.slice(start, start + size)
  return {
    content,
    page,
    size,
    totalElements: reports.length,
    totalPages: Math.max(1, Math.ceil(reports.length / size)),
  }
}
