"use client"

import { useState } from "react"
import { Check, Download, Eye, FileBadge, FileText, FileVideo } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime, formatDateTimeWithSeconds, formatDuration } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type MetadataReportTabProps = {
  data: EvidenceDetailData
  extension: string
  reportReady: boolean
  verificationCode: string
}

// 보고서 유형(세그먼트)
const REPORT_TYPES = [
  { id: "full", label: "전체" },
  { id: "deepfake", label: "딥페이크" },
  { id: "integrity", label: "위변조·무결성" },
  { id: "metadata", label: "메타데이터" },
] as const

// 보고서 포함 항목(토글)
const INCLUDE_ITEMS = [
  { id: "caseInfo", label: "사건 기본정보" },
  { id: "fileInfo", label: "파일 기본정보" },
  { id: "deepfake", label: "딥페이크 분석 결과" },
  { id: "integrity", label: "위변조·무결성 검증 결과" },
  { id: "metadata", label: "메타데이터 요약" },
  { id: "coc", label: "Chain of Custody 요약" },
  { id: "signature", label: "전자서명 / 블록체인 검증 결과" },
] as const

export function MetadataReportTab({
  data,
  extension,
  reportReady,
  verificationCode,
}: MetadataReportTabProps) {
  const { evidenceInfo, analysisInfo } = data
  const metadata = evidenceInfo.technicalMetadata
  const durationSeconds = metadata.durationSec
  const frameRate = metadata.fps

  const [reportType, setReportType] = useState<string>("full")
  const [includes, setIncludes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INCLUDE_ITEMS.map((item) => [item.id, true]))
  )
  const selectedCount = Object.values(includes).filter(Boolean).length
  const reportHash = `sha256:${data.integrityInfo.originalHash.slice(0, 24)}`
  const reportTypeLabel = REPORT_TYPES.find((t) => t.id === reportType)?.label ?? "전체"

  return (
    <div className="space-y-5">
      {/* ① 메타데이터 요약 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
          <FileVideo className="size-5 text-blue-500" aria-hidden="true" />
          메타데이터 요약
        </h3>
        <MetaTable
          rows={[
            ["해상도", formatResolution(data)],
            ["영상 길이", durationSeconds != null ? formatDuration(durationSeconds) : "확인되지 않음"],
            ["비디오 코덱", metadata.codec || "확인되지 않음"],
            ["FPS", frameRate != null ? `${frameRate} fps` : "확인되지 않음"],
            ["오디오 포함", metadata.channels ? "포함" : "확인되지 않음"],
            ["컨테이너", extension || "확인되지 않음"],
            ["생성일", formatDateTimeWithSeconds(evidenceInfo.uploadedAt)],
            ["촬영기기", metadata.deviceInfo || "확인되지 않음"],
            ["EXIF 존재 여부", metadata.capturedAt ? "존재" : "확인되지 않음"],
          ]}
        />
      </section>

      {/* ② 보고서 생성 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
          <FileBadge className="size-5 text-teal-600" aria-hidden="true" />
          보고서 생성
        </h3>

        {/* 유형 선택 */}
        <p className="mt-5 text-sm font-bold text-muted-foreground">보고서 유형</p>
        <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {REPORT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              aria-pressed={reportType === type.id}
              onClick={() => setReportType(type.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                reportType === type.id
                  ? "bg-card text-blue-600 shadow-sm dark:text-blue-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* 포함 항목 */}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">포함 항목</p>
          <span className="text-xs font-bold text-muted-foreground">
            {selectedCount} / {INCLUDE_ITEMS.length} 선택
          </span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {INCLUDE_ITEMS.map((item) => {
            const on = includes[item.id]
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setIncludes((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                  on
                    ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    on ? "border-teal-500 bg-teal-500 text-white" : "border-muted-foreground/40"
                  )}
                >
                  {on ? <Check className="size-3" aria-hidden="true" /> : null}
                </span>
                {item.label}
              </button>
            )
          })}
        </div>

        {/* 상태 + 다운로드 */}
        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-muted-foreground">생성 상태</span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                reportReady
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"
              )}
            >
              {reportReady ? "생성 완료" : "분석 완료 후 생성 가능"}
            </span>
            {reportReady ? (
              <span className="font-mono text-xs text-muted-foreground">{reportHash}</span>
            ) : null}
          </div>
          <Button
            type="button"
            disabled={!reportReady}
            className="h-11 bg-teal-600 font-black hover:bg-teal-700"
          >
            <Download className="size-4" aria-hidden="true" />
            {reportReady ? "PDF 보고서 다운로드" : "생성 전 · 다운로드 불가"}
          </Button>
        </div>
      </section>

      {/* ③ 생성 이력 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
          <FileText className="size-5 text-teal-600" aria-hidden="true" />
          생성 이력
        </h3>

        {reportReady ? (
          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1fr_1.4fr_0.8fr_auto] bg-muted/30 px-4 py-3 text-xs font-bold text-muted-foreground">
              <span>보고서 유형</span>
              <span>생성 시각</span>
              <span>상태</span>
              <span className="text-right">작업</span>
            </div>
            <div className="grid grid-cols-[1fr_1.4fr_0.8fr_auto] items-center px-4 py-3 text-sm">
              <span className="font-semibold text-foreground">{reportTypeLabel}</span>
              <span className="font-semibold text-foreground">{formatDateTime(analysisInfo.completedAt)}</span>
              <span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                  생성 완료
                </span>
              </span>
              <span className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 font-semibold">
                  <Eye className="size-4" aria-hidden="true" />
                  보기
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 font-semibold text-teal-700">
                  <Download className="size-4" aria-hidden="true" />
                  다운로드
                </Button>
              </span>
            </div>
            <p className="border-t border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
              검증번호 {verificationCode}
            </p>
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
            <FileText className="size-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-bold text-muted-foreground">아직 생성된 보고서가 없습니다.</p>
            <p className="text-xs font-semibold text-muted-foreground/80">
              분석이 완료되면 보고서를 생성하고 이력이 여기에 표시됩니다.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function MetaTable({ rows }: { rows: Array<[string, string]> }) {
  const groupedRows = Array.from({ length: Math.ceil(rows.length / 3) }, (_, index) =>
    rows.slice(index * 3, index * 3 + 3)
  )

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-3 bg-muted/30 text-xs font-bold text-muted-foreground">
        {["미디어", "기록 정보", "추출 정보"].map((title) => (
          <div key={title} className="border-r border-border px-5 py-3 last:border-r-0">
            {title}
          </div>
        ))}
      </div>
      <div className="divide-y divide-border">
        {groupedRows.map((group, rowIndex) => (
          <div key={`metadata-row-${rowIndex}`} className="grid grid-cols-3 text-sm">
            {Array.from({ length: 3 }, (_, cellIndex) => {
              const item = group[cellIndex]

              return (
                <div
                  key={`${rowIndex}-${cellIndex}`}
                  className="min-h-16 border-r border-border px-5 py-3 last:border-r-0"
                >
                  {item ? (
                    <>
                      <dt className="text-xs font-semibold text-muted-foreground">{item[0]}</dt>
                      <dd className="mt-1 min-w-0 break-words font-semibold text-foreground">{item[1]}</dd>
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatResolution(data: EvidenceDetailData) {
  const metadata = data.evidenceInfo.technicalMetadata
  const width = metadata?.width
  const height = metadata?.height
  if (width == null || height == null) return "확인되지 않음"
  return `${width} × ${height}`
}
