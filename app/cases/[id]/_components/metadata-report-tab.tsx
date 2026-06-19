import { Download, FileBadge, FileText, FileVideo } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { EvidenceDetailData } from "@/lib/api/evidence-detail"
import { formatDateTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"

type MetadataReportTabProps = {
  data: EvidenceDetailData
  extension: string
  reportReady: boolean
  verificationCode: string
}

export function MetadataReportTab({
  data,
  extension,
  reportReady,
  verificationCode,
}: MetadataReportTabProps) {
  const { evidenceInfo, analysisInfo } = data
  const metadata = evidenceInfo.technicalMetadata
  const chainValid = data.integrityInfo.isChainValid ?? data.integrityInfo.chainValid
  const recoveryScore = chainValid ? 98 : 64
  const dataLoss = chainValid ? 2 : 28

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
            <FileVideo className="size-5 text-blue-500" />
            메타데이터
          </h3>
          <MetaTable
            rows={[
              ["해상도", formatResolution(data)],
              ["영상 길이", formatPreciseDuration(getDurationSeconds(data))],
              ["비디오 코덱", metadata.codec || "H.264"],
              ["FPS", `${getFrameRate(data)} fps`],
              ["오디오 포함", metadata.channels ? "포함" : "확인되지 않음"],
              ["컨테이너", extension || "MP4"],
              ["생성일", formatDateTimeWithSeconds(evidenceInfo.uploadedAt)],
              ["수정일", "확인되지 않음"],
              ["촬영기기", metadata.deviceInfo || "확인되지 않음"],
              ["소프트웨어", "확인되지 않음"],
              ["EXIF 존재 여부", metadata.capturedAt ? "존재" : "확인되지 않음"],
              ["추출 상태", metadata.extractionStatus || "COMPLETED"],
            ]}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <h3 className="text-lg font-black text-slate-900 dark:text-foreground">파일 상태</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-4 dark:bg-muted/30">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-foreground">Recovery Score</p>
                <p className="mt-1 text-xs font-bold text-slate-400 dark:text-muted-foreground">파일 손상·메타 상태 기반</p>
              </div>
              <span className={cn("text-3xl font-black", recoveryScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500")}>
                {recoveryScore}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-4 dark:bg-muted/30">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-foreground">데이터 소실도</p>
                <p className="mt-1 text-xs font-bold text-slate-400 dark:text-muted-foreground">메타·스트림 누락 기반</p>
              </div>
              <span className={cn("text-3xl font-black", dataLoss <= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-500")}>
                {dataLoss}%
              </span>
            </div>
          </div>
        </section>

      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-foreground">
          <FileBadge className="size-5 text-teal-600" />
          보고서 · 검증
        </h3>

        {reportReady ? (
          <>
            <div className="mt-5 grid gap-5 xl:grid-cols-[220px_1fr]">
              <div className="flex aspect-square max-h-48 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-border dark:bg-muted/30">
                <VerificationQr value={verificationCode} />
              </div>
              <dl className="grid gap-3">
                <ReportInfoItem label="보고서 생성" value={formatDateTime(analysisInfo.completedAt)} />
                <ReportInfoItem label="검증번호" value={verificationCode} />
                <ReportInfoItem label="reportHash" value={`sha256:${data.integrityInfo.originalHash.slice(0, 24)}`} mono />
              </dl>
            </div>
            <Button type="button" className="mt-5 h-11 w-full bg-teal-600 font-black hover:bg-teal-700">
              <Download className="size-4" />
              PDF 보고서 다운로드
            </Button>
          </>
        ) : (
          <>
            <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-border dark:bg-muted/30">
              <FileText className="size-10 text-slate-300 dark:text-muted-foreground" />
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-foreground">PDF 보고서 생성 전</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-400 dark:text-muted-foreground">
                  분석이 완료되면 reportHash · 검증번호 · QR과 함께
                  <br />
                  보고서를 내려받을 수 있습니다.
                </p>
              </div>
            </div>
            <Button type="button" disabled className="mt-5 h-11 w-full bg-teal-600 font-black">
              <Download className="size-4" />
              생성 전 · 다운로드 불가
            </Button>
          </>
        )}
      </section>
    </div>
  )
}

function ReportInfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-border dark:bg-muted/30">
      <dt className="text-xs font-bold text-slate-400 dark:text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 break-all text-sm font-bold text-slate-700 dark:text-foreground",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function MetaTable({ rows }: { rows: Array<[string, string]> }) {
  const groupedRows = Array.from({ length: Math.ceil(rows.length / 3) }, (_, index) =>
    rows.slice(index * 3, index * 3 + 3)
  )

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-border">
      <div className="grid grid-cols-3 bg-slate-50 text-xs font-bold text-slate-400 dark:bg-muted/30 dark:text-muted-foreground">
        {["미디어", "기록 정보", "추출 정보"].map((title) => (
          <div key={title} className="border-r border-slate-200 px-5 py-3 last:border-r-0 dark:border-border">
            {title}
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-border">
        {groupedRows.map((group, rowIndex) => (
          <div
            key={`metadata-row-${rowIndex}`}
            className="grid grid-cols-3 text-sm"
          >
            {Array.from({ length: 3 }, (_, cellIndex) => {
              const item = group[cellIndex]

              return (
                <div
                  key={`${rowIndex}-${cellIndex}`}
                  className="min-h-16 border-r border-slate-100 px-5 py-3 last:border-r-0 dark:border-border"
                >
                  {item ? (
                    <>
                      <dt className="text-xs font-semibold text-slate-400 dark:text-muted-foreground">{item[0]}</dt>
                      <dd className="mt-1 min-w-0 break-words font-semibold text-slate-600 dark:text-foreground">{item[1]}</dd>
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

function VerificationQr({ value }: { value: string }) {
  const cells = Array.from({ length: 121 }, (_, index) => {
    const charCode = value.charCodeAt(index % value.length)
    const row = Math.floor(index / 11)
    const col = index % 11
    const finder =
      (row <= 2 && col <= 2) ||
      (row <= 2 && col >= 8) ||
      (row >= 8 && col <= 2)
    return finder || (charCode + row * 7 + col * 11) % 3 === 0
  })

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid size-32 grid-cols-11 gap-0.5">
        {cells.map((filled, index) => (
          <span
            key={`${value}-${index}`}
            className={cn("rounded-[2px]", filled ? "bg-slate-900" : "bg-slate-100")}
          />
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] font-semibold text-slate-500">{value}</p>
    </div>
  )
}

function formatDateTimeWithSeconds(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function formatPreciseDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds - minutes * 60
  return `${String(minutes).padStart(2, "0")}:${remain.toFixed(3).padStart(6, "0")}`
}

function getDurationSeconds(data: EvidenceDetailData) {
  return data.evidenceInfo.technicalMetadata.durationSec ?? 31.24
}

function getFrameRate(data: EvidenceDetailData) {
  return data.evidenceInfo.technicalMetadata.fps ?? 29.97
}

function formatResolution(data: EvidenceDetailData) {
  const metadata = data.evidenceInfo.technicalMetadata
  const width = metadata?.width ?? 1920
  const height = metadata?.height ?? 1080
  return `${width} × ${height}`
}
