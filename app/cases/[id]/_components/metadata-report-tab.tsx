"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import {
  AlertCircle,
  Check,
  Download,
  ExternalLink,
  FileBadge,
  FileText,
  FileVideo,
  Loader2,
  QrCode,
  RefreshCw,
} from "lucide-react"

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

type PdfStatus = "NOT_CREATED" | "GENERATING" | "CREATED" | "FAILED"

// PDF 보고서에 포함할 섹션(선택용). 상세 데이터가 아니라 "포함 여부"만 고른다.
const REPORT_SECTIONS = [
  "사건 정보",
  "파일 기본정보",
  "분석 요약",
  "딥페이크 탐지 결과",
  "위변조 흔적 분석",
  "메타데이터 분석 결과",
  "무결성 검증 요약",
  "모델 정보 요약",
  "검증번호 및 QR 정보",
] as const

const STATUS_META: Record<PdfStatus, { label: string; badge: string }> = {
  NOT_CREATED: { label: "미생성", badge: "bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground" },
  GENERATING: { label: "생성 중", badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300" },
  CREATED: { label: "생성 완료", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300" },
  FAILED: { label: "생성 실패", badge: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300" },
}

export function MetadataReportTab({
  data,
  extension,
  reportReady,
  verificationCode,
}: MetadataReportTabProps) {
  const { evidenceInfo, analysisInfo } = data
  const metadata = evidenceInfo.technicalMetadata
  const analysisDone = analysisInfo.status === "COMPLETED"

  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("NOT_CREATED")
  const [includes, setIncludes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(REPORT_SECTIONS.map((section) => [section, true]))
  )
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)

  const fileName = `report_EVD-${evidenceInfo.evidenceId}.pdf`
  // 원본 증거 SHA-256과 구분되는 "보고서 파일 해시". 데모용 결정적 생성값.
  const reportHash = makeReportHash(`${fileName}:${verificationCode}`)
  const selected = REPORT_SECTIONS.filter((section) => includes[section])
  const isCreated = pdfStatus === "CREATED"
  const sectionsLocked = pdfStatus === "GENERATING" || pdfStatus === "CREATED"

  function handleGenerate() {
    if (!analysisDone) return
    setFailureReason(null)
    setPdfStatus("GENERATING")
    window.setTimeout(() => {
      setGeneratedAt(new Date().toISOString())
      setPdfStatus("CREATED")
    }, 1600)
  }

  function handleRegenerate() {
    // 재생성 시 포함 항목을 다시 고를 수 있도록 미생성 상태로 되돌린다.
    setGeneratedAt(null)
    setFailureReason(null)
    setPdfStatus("NOT_CREATED")
  }

  const history = isCreated && generatedAt ? buildHistory(generatedAt, fileName, verificationCode) : []

  return (
    <div className="space-y-5">
      {/* 메타데이터 요약 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
          <FileVideo className="size-5 text-blue-500" aria-hidden="true" />
          메타데이터 요약
        </h3>
        <MetaTable
          rows={[
            ["해상도", formatResolution(data)],
            ["영상 길이", metadata.durationSec != null ? formatDuration(metadata.durationSec) : "확인되지 않음"],
            ["비디오 코덱", metadata.codec || "확인되지 않음"],
            ["FPS", metadata.fps != null ? `${metadata.fps} fps` : "확인되지 않음"],
            ["오디오 포함", metadata.channels ? "포함" : "확인되지 않음"],
            ["컨테이너", extension || "확인되지 않음"],
            ["생성일", formatDateTimeWithSeconds(evidenceInfo.uploadedAt)],
            ["촬영기기", metadata.deviceInfo || "확인되지 않음"],
            ["EXIF 존재 여부", metadata.capturedAt ? "존재" : "확인되지 않음"],
          ]}
        />
      </section>

      {/* 1. 보고서 생성 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
            <FileBadge className="size-5 text-teal-600" aria-hidden="true" />
            보고서 생성
          </h3>
          <StatusBadge status={pdfStatus} />
        </div>

        {pdfStatus === "NOT_CREATED" ? (
          <div className="mt-5 flex flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/20 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">아직 생성된 PDF 보고서가 없습니다.</p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {analysisDone
                  ? "아래 포함 항목을 선택한 뒤 보고서를 생성할 수 있습니다."
                  : "분석이 완료되면 보고서를 생성할 수 있습니다."}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!analysisDone}
              className="h-11 shrink-0 bg-teal-600 font-black hover:bg-teal-700"
            >
              <FileBadge className="size-4" aria-hidden="true" />
              PDF 보고서 생성
            </Button>
          </div>
        ) : null}

        {pdfStatus === "GENERATING" ? (
          <div className="mt-5 rounded-lg border border-border bg-muted/20 px-5 py-6">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-300">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              PDF 보고서를 생성 중입니다.
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500" />
            </div>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">선택 항목으로 PDF를 구성하고 reportHash·검증번호를 생성하는 중...</p>
            <Button type="button" disabled className="mt-5 h-11 bg-teal-600 font-black">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              생성 중...
            </Button>
          </div>
        ) : null}

        {pdfStatus === "CREATED" ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">PDF 보고서 생성이 완료되었습니다.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="h-11 bg-teal-600 font-black hover:bg-teal-700">
                <Download className="size-4" aria-hidden="true" />
                PDF 리포트 다운로드
              </Button>
              <Button type="button" variant="outline" className="h-11 font-bold">
                <ExternalLink className="size-4" aria-hidden="true" />
                검증 페이지 열기
              </Button>
              <Button type="button" variant="outline" onClick={handleRegenerate} className="h-11 font-bold text-muted-foreground">
                <RefreshCw className="size-4" aria-hidden="true" />
                보고서 재생성
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton label="reportHash 복사" text={reportHash} />
              <CopyButton label="검증번호 복사" text={verificationCode} />
            </div>
          </div>
        ) : null}

        {pdfStatus === "FAILED" ? (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-5 py-5 dark:border-red-900/60 dark:bg-red-950/20">
            <p className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
              <AlertCircle className="size-4" aria-hidden="true" />
              PDF 보고서 생성에 실패했습니다.
            </p>
            <p className="mt-1 text-xs font-semibold text-red-600/90 dark:text-red-300/80">
              {failureReason || "보고서 생성 중 오류가 발생했습니다."}
            </p>
            <Button type="button" onClick={handleGenerate} className="mt-4 h-11 bg-teal-600 font-black hover:bg-teal-700">
              <RefreshCw className="size-4" aria-hidden="true" />
              다시 생성
            </Button>
          </div>
        ) : null}
      </section>

      {/* 2. 보고서 포함 항목 선택 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">보고서 포함 항목 선택</h3>
          <span className="text-xs font-bold text-muted-foreground">{selected.length} / {REPORT_SECTIONS.length} 선택</span>
        </div>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">PDF 보고서에 포함할 섹션을 선택합니다.</p>
        {sectionsLocked ? (
          <p className="mt-3 rounded-lg bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
            보고서 재생성 시 항목을 다시 선택할 수 있습니다.
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_SECTIONS.map((section) => {
            const on = includes[section]
            return (
              <button
                key={section}
                type="button"
                aria-pressed={on}
                disabled={sectionsLocked}
                onClick={() => setIncludes((prev) => ({ ...prev, [section]: !prev[section] }))}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
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
                {section}
              </button>
            )
          })}
        </div>
      </section>

      {/* 3 + 4: 보고서 상태 / QR 검증 정보 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 3. 보고서 상태 */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">보고서 상태</h3>
            <StatusBadge status={pdfStatus} />
          </div>
          <div className="mt-4">
            {isCreated ? (
              <>
                <InfoRow label="PDF 생성 상태">생성 완료</InfoRow>
                <InfoRow label="보고서 생성 시각">{formatDateTime(generatedAt)}</InfoRow>
                <InfoRow label="보고서 파일명">{fileName}</InfoRow>
                <InfoRow label="보고서 해시(reportHash)" mono>{shorten(reportHash)}</InfoRow>
                <InfoRow label="검증번호">{verificationCode}</InfoRow>
              </>
            ) : pdfStatus === "GENERATING" ? (
              <>
                <InfoRow label="PDF 생성 상태">생성 중</InfoRow>
                <InfoRow label="요청 시각">{formatDateTime(new Date().toISOString())}</InfoRow>
                <InfoRow label="현재 단계">PDF 구성 · 해시 생성</InfoRow>
                <p className="pt-3 text-xs font-semibold text-muted-foreground">잠시 후 생성이 완료됩니다.</p>
              </>
            ) : pdfStatus === "FAILED" ? (
              <>
                <InfoRow label="PDF 생성 상태">생성 실패</InfoRow>
                <InfoRow label="실패 사유">{failureReason || "오류 발생"}</InfoRow>
                <InfoRow label="재시도">가능</InfoRow>
              </>
            ) : (
              <>
                <InfoRow label="PDF 생성 상태">미생성</InfoRow>
                <p className="pt-3 text-xs font-semibold text-muted-foreground">
                  보고서를 생성하면 다운로드와 검증번호를 확인할 수 있습니다.
                </p>
              </>
            )}
          </div>
        </section>

        {/* 4. QR 검증 정보 */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-black text-foreground">QR 검증 정보</h3>
          {isCreated ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              <QrPlaceholder seed={reportHash} muted={false} />
              <p className="font-mono text-sm font-bold text-foreground">{verificationCode}</p>
              <div className="flex gap-2">
                <CopyButton label="검증번호 복사" text={verificationCode} />
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 font-semibold">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  검증 페이지 열기
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-3 py-4">
              <QrPlaceholder seed="" muted />
              <p className="text-center text-xs font-semibold text-muted-foreground">
                보고서 생성 후 QR 검증 정보가 표시됩니다.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 5. 보고서 무결성 정보 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-black text-foreground">보고서 무결성 정보</h3>
        {isCreated ? (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 border-b border-border py-3">
              <span className="shrink-0 text-sm font-bold text-muted-foreground">보고서 해시(reportHash)</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-xs font-semibold text-foreground">{shorten(reportHash)}</span>
                <CopyButton label="복사" text={reportHash} />
              </span>
            </div>
            <InfoRow label="Hash 알고리즘">SHA-256</InfoRow>
            <InfoRow label="보고서 파일명">{fileName}</InfoRow>
            <InfoRow label="보고서 생성 시각">{formatDateTime(generatedAt)}</InfoRow>
            <InfoRow label="검증 상태">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
                <Check className="size-4" aria-hidden="true" />
                확인 가능
              </span>
            </InfoRow>
            <p className="pt-3 text-xs font-semibold text-muted-foreground">
              이 해시는 PDF 보고서 파일의 해시입니다. 원본 증거 파일 SHA-256 검증은 “위변조·무결성 검증” 탭에서 확인하세요.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
            보고서 생성 후 reportHash가 표시됩니다.
          </p>
        )}
      </section>

      {/* 6. 보고서 생성 이력 */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
          <FileText className="size-5 text-teal-600" aria-hidden="true" />
          보고서 생성 이력
        </h3>
        {history.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.2fr_1.4fr_0.7fr_0.7fr_1.6fr] bg-muted/30 px-4 py-3 text-xs font-bold text-muted-foreground">
              <span>시각</span>
              <span>이벤트</span>
              <span>상태</span>
              <span>처리자</span>
              <span>설명</span>
            </div>
            <div className="divide-y divide-border">
              {history.map((row, index) => (
                <div key={index} className="grid grid-cols-[1.2fr_1.4fr_0.7fr_0.7fr_1.6fr] items-center px-4 py-3 text-sm">
                  <span className="font-semibold text-muted-foreground">{row.time}</span>
                  <span className="font-semibold text-foreground">{row.event}</span>
                  <span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                      {row.status}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{row.actor}</span>
                  <span className="font-semibold text-muted-foreground">{row.description}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm font-bold text-muted-foreground">
            보고서 생성 이력이 없습니다.
          </p>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: PdfStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold", meta.badge)}>
      {meta.label}
    </span>
  )
}

function InfoRow({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <span className="shrink-0 text-sm font-bold text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-all text-right text-sm font-semibold text-foreground", mono && "font-mono text-xs")}>
        {children}
      </span>
    </div>
  )
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          window.setTimeout(() => setDone(false), 1200)
        } catch {
          setDone(false)
        }
      }}
      className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/40"
    >
      {done ? "복사됨" : label}
    </button>
  )
}

function QrPlaceholder({ seed, muted }: { seed: string; muted: boolean }) {
  const cells = Array.from({ length: 121 }, (_, index) => {
    const row = Math.floor(index / 11)
    const col = index % 11
    const finder = (row <= 2 && col <= 2) || (row <= 2 && col >= 8) || (row >= 8 && col <= 2)
    if (muted) return finder
    const charCode = seed.charCodeAt(index % Math.max(1, seed.length)) || index
    return finder || (charCode + row * 7 + col * 11) % 3 === 0
  })

  return (
    <div className={cn("rounded-lg border p-3", muted ? "border-dashed border-border bg-muted/20" : "border-border bg-white shadow-sm")}>
      <div className="grid size-32 grid-cols-11 gap-0.5">
        {muted ? (
          <div className="col-span-11 flex size-32 items-center justify-center">
            <QrCode className="size-12 text-muted-foreground/40" aria-hidden="true" />
          </div>
        ) : (
          cells.map((filled, index) => (
            <span key={index} className={cn("rounded-[2px]", filled ? "bg-slate-900" : "bg-slate-100")} />
          ))
        )}
      </div>
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
                <div key={`${rowIndex}-${cellIndex}`} className="min-h-16 border-r border-border px-5 py-3 last:border-r-0">
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

function buildHistory(generatedAt: string, fileName: string, verificationCode: string) {
  const time = formatDateTime(generatedAt)
  return [
    { time, event: "보고서 생성 요청", status: "완료", actor: "system", description: "선택된 항목 기준 PDF 생성 요청" },
    { time, event: "PDF 생성 완료", status: "완료", actor: "system", description: `${fileName} 생성` },
    { time, event: "reportHash 생성", status: "완료", actor: "system", description: "보고서 해시 생성 완료" },
    { time, event: "QR 검증 정보 생성", status: "완료", actor: "system", description: `검증번호 ${verificationCode} 생성` },
  ]
}

// 원본 SHA-256과 구분되는 보고서 파일 해시(데모용 결정적 64자 hex).
function makeReportHash(seed: string): string {
  let hash = 0x811c9dc5
  let out = ""
  for (let i = 0; i < 32; i += 1) {
    hash ^= seed.charCodeAt(i % seed.length) || i + 1
    hash = Math.imul(hash, 0x01000193) >>> 0
    out += (hash & 0xff).toString(16).padStart(2, "0")
  }
  return out
}

function shorten(hash: string) {
  if (hash.length <= 24) return hash
  return `${hash.slice(0, 12)}...${hash.slice(-12)}`
}

function formatResolution(data: EvidenceDetailData) {
  const metadata = data.evidenceInfo.technicalMetadata
  const width = metadata?.width
  const height = metadata?.height
  if (width == null || height == null) return "확인되지 않음"
  return `${width} × ${height}`
}
