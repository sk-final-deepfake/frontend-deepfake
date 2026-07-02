"use client"

import { useEffect, useRef, useState, type DragEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check } from "lucide-react"

import { CompareFileUploader } from "./compare-file-uploader"
import { CompareProcessingPanel } from "./compare-processing-panel"
import { CompareResultPanel } from "./compare-result-panel"
import { SourceEvidenceSelector } from "./source-evidence-selector"
import {
  cancelCompareVerification,
  downloadCompareReport,
  verifyCompare,
  type CompareResult,
} from "@/lib/api/compare"
import { getApiErrorMessage } from "@/lib/api/errors"
import { saveCompareResultSummary } from "@/lib/compare-history"
import { fetchCaseDetail, type CaseDetailData } from "@/lib/api/evidence-detail"
import { fetchMyAnalysisHistory } from "@/lib/api/mypage"
import { formatFileSize as formatSharedFileSize } from "@/lib/formatters"
import { getAnalysisStatusLabel } from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type CompareStep = "source" | "upload" | "processing" | "result"

export type SourceEvidence = {
  id: number
  displayLabel: string
  name: string
  dateLabel: string
  sizeLabel: string
  codecLabel: string
  durationLabel: string
  hashLabel: string
  thumbnailUrl?: string | null
  previewUrl?: string | null
  videoUrl?: string | null
  fileUrl?: string | null
}

export type SourceCase = {
  id: string
  title: string
  department: string
  updatedAtLabel: string
  evidences: SourceEvidence[]
}

export type UploadedCompareFile = {
  file: File
  name: string
  previewUrl: string
  sizeLabel: string
}

const EMPTY_CASE: SourceCase = {
  id: "",
  title: "사건을 선택하세요",
  department: "-",
  updatedAtLabel: "-",
  evidences: [],
}

const EMPTY_EVIDENCE: SourceEvidence = {
  id: 0,
  displayLabel: "기준 증거",
  name: "기준 증거를 선택하세요",
  dateLabel: "-",
  sizeLabel: "-",
  codecLabel: "-",
  durationLabel: "-",
  hashLabel: "-",
}

export function CompareVerificationFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedCaseId = searchParams.get("caseId") ?? ""
  const preselectedEvidenceParam = searchParams.get("evidenceId")
  const preselectedEvidenceId = preselectedEvidenceParam ? Number(preselectedEvidenceParam) : null
  const hasPreselectedEvidence =
    Boolean(preselectedCaseId) &&
    preselectedEvidenceId != null &&
    Number.isFinite(preselectedEvidenceId) &&
    preselectedEvidenceId > 0
  const [step, setStep] = useState<CompareStep>("source")
  const [sourceCases, setSourceCases] = useState<SourceCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState("")
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null)
  const [caseQuery, setCaseQuery] = useState("")
  const [evidenceQuery, setEvidenceQuery] = useState("")
  const [compareFile, setCompareFile] = useState<UploadedCompareFile | null>(null)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [isLoadingCases, setIsLoadingCases] = useState(true)
  const [isLoadingEvidences, setIsLoadingEvidences] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const compareRequestRef = useRef(0)
  const activeCompareRequestTokenRef = useRef<string | null>(null)
  const comparePreviewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadInitialCases() {
      setIsLoadingCases(true)
      setSourceError(null)

      try {
        const response = await fetchMyAnalysisHistory({ sort: "newest", page: 0, size: 50 })
        if (cancelled) return

        const cases = response.content.map((sourceCase) => ({
          id: sourceCase.caseId,
          title: sourceCase.caseName,
          department: `${getCaseStatusLabel(sourceCase.status)} · 증거 ${sourceCase.evidenceCount}개`,
          updatedAtLabel: formatDateTimeLabel(sourceCase.createdAt),
          evidences: [],
        }))

        const firstCaseId = preselectedCaseId || cases[0]?.id || ""
        setSourceCases(cases)
        setSelectedCaseId(firstCaseId)

        if (firstCaseId) {
          const detail = await fetchCaseDetail(firstCaseId)
          if (cancelled) return

          const hydratedCase = mapCaseDetailToSourceCase(detail)
          setSourceCases((current) =>
            current.some((sourceCase) => sourceCase.id === hydratedCase.id)
              ? current.map((sourceCase) =>
                  sourceCase.id === hydratedCase.id ? hydratedCase : sourceCase
                )
              : [hydratedCase, ...current]
          )
          const preferredEvidenceId =
            hasPreselectedEvidence &&
            hydratedCase.evidences.some((evidence) => evidence.id === preselectedEvidenceId)
              ? preselectedEvidenceId
              : hydratedCase.evidences[0]?.id ?? null

          setSelectedEvidenceId(preferredEvidenceId)

          if (hasPreselectedEvidence && preferredEvidenceId === preselectedEvidenceId) {
            setStep("upload")
          } else if (hasPreselectedEvidence) {
            setSourceError("선택한 사건에서 해당 기준 증거를 찾지 못했습니다. 기준 증거를 다시 선택해 주세요.")
          }
        }
      } catch (error) {
        if (cancelled) return
        setSourceCases([])
        setSelectedCaseId("")
        setSelectedEvidenceId(null)
        setSourceError(getApiErrorMessage(error, "사건 목록을 불러오지 못했습니다. 로그인 상태와 백엔드 연결을 확인해 주세요."))
      } finally {
        if (!cancelled) setIsLoadingCases(false)
      }
    }

    loadInitialCases()

    return () => {
      cancelled = true
    }
  }, [hasPreselectedEvidence, preselectedCaseId, preselectedEvidenceId])

  useEffect(() => {
    if (step !== "processing") return

    setProgress(12)
    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + 8))
    }, 260)

    return () => window.clearInterval(interval)
  }, [step])

  useEffect(() => {
    return () => {
      if (!comparePreviewUrlRef.current) return

      URL.revokeObjectURL(comparePreviewUrlRef.current)
      comparePreviewUrlRef.current = null
    }
  }, [])

  function handleFileChange(files: FileList | null) {
    const file = files?.item(0)
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    revokeComparePreviewUrl()
    comparePreviewUrlRef.current = previewUrl

    setCompareFile({
      file,
      name: file.name,
      previewUrl,
      sizeLabel: formatFileSize(file.size),
    })
    setCompareError(null)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    handleFileChange(event.dataTransfer.files)
  }

  async function startCompare() {
    if (!compareFile || selectedEvidenceId === null) return

    const requestId = compareRequestRef.current + 1
    const requestToken =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    compareRequestRef.current = requestId
    activeCompareRequestTokenRef.current = requestToken
    setProgress(0)
    setCompareError(null)
    setCompareResult(null)
    setStep("processing")

    try {
      const result = await verifyCompare(selectedEvidenceId, compareFile.file, requestToken)
      if (compareRequestRef.current !== requestId) return
      saveCompareResultSummary(result)
      setCompareResult(result)
      setProgress(100)
      window.setTimeout(() => router.push(`/compare/${result.compareId}`), 250)
    } catch (error) {
      if (compareRequestRef.current !== requestId) return
      setStep("upload")
      setCompareError(getApiErrorMessage(error, "비교 검증 요청에 실패했습니다."))
    } finally {
      if (compareRequestRef.current === requestId) {
        activeCompareRequestTokenRef.current = null
      }
    }
  }

  function cancelCompare() {
    const requestToken = activeCompareRequestTokenRef.current
    if (requestToken) {
      void cancelCompareVerification(requestToken).catch(() => undefined)
    }

    compareRequestRef.current += 1
    activeCompareRequestTokenRef.current = null
    setProgress(0)
    setStep("upload")
    setCompareError("비교 검증이 중단되었습니다.")
  }

  function resetCompare() {
    compareRequestRef.current += 1
    activeCompareRequestTokenRef.current = null
    setStep("source")
    setProgress(0)
    setSelectedCaseId(sourceCases[0]?.id ?? "")
    setSelectedEvidenceId(sourceCases[0]?.evidences[0]?.id ?? null)
    setCaseQuery("")
    setEvidenceQuery("")
    clearCompareFile()
    setCompareResult(null)
    setCompareError(null)
  }

  function clearCompareFile() {
    revokeComparePreviewUrl()
    setCompareFile(null)
  }

  function revokeComparePreviewUrl() {
    if (!comparePreviewUrlRef.current) return

    URL.revokeObjectURL(comparePreviewUrlRef.current)
    comparePreviewUrlRef.current = null
  }

  async function selectCase(caseId: string) {
    const nextCase = sourceCases.find((sourceCase) => sourceCase.id === caseId)
    if (!nextCase) return

    setSelectedCaseId(caseId)
    setSelectedEvidenceId(nextCase.evidences[0]?.id ?? null)
    setEvidenceQuery("")

    if (nextCase.evidences.length > 0) return

    setIsLoadingEvidences(true)
    setSourceError(null)

    try {
      const detail = await fetchCaseDetail(caseId)
      const hydratedCase = mapCaseDetailToSourceCase(detail)
      setSourceCases((current) =>
        current.map((sourceCase) =>
          sourceCase.id === hydratedCase.id ? hydratedCase : sourceCase
        )
      )
      setSelectedEvidenceId(hydratedCase.evidences[0]?.id ?? null)
    } catch (error) {
      setSourceError(getApiErrorMessage(error, "선택한 사건의 증거 목록을 불러오지 못했습니다."))
    } finally {
      setIsLoadingEvidences(false)
    }
  }

  const selectedCase =
    sourceCases.find((sourceCase) => sourceCase.id === selectedCaseId) ?? sourceCases[0] ?? EMPTY_CASE
  const selectedEvidence =
    selectedCase.evidences.find((evidence) => evidence.id === selectedEvidenceId) ??
    selectedCase.evidences[0] ??
    EMPTY_EVIDENCE
  const filteredCases = sourceCases.filter((sourceCase) => {
    const searchValue =
      `${sourceCase.id} ${sourceCase.title} ${sourceCase.department}`.toLowerCase()
    return searchValue.includes(caseQuery.toLowerCase())
  })
  const filteredEvidences = selectedCase.evidences.filter((evidence) => {
    const searchValue = `${evidence.id} ${evidence.displayLabel} ${evidence.dateLabel}`.toLowerCase()
    return searchValue.includes(evidenceQuery.toLowerCase())
  })

  return (
    <section className="w-full space-y-6">
      <StepIndicator currentStep={step} />

      {step === "source" ? (
        <SourceEvidenceSelector
          caseQuery={caseQuery}
          evidenceQuery={evidenceQuery}
          selectedCaseId={selectedCaseId}
          selectedEvidenceId={selectedEvidenceId}
          selectedCase={selectedCase}
          cases={filteredCases}
          evidences={filteredEvidences}
          isLoadingCases={isLoadingCases}
          isLoadingEvidences={isLoadingEvidences}
          sourceError={sourceError}
          onCaseQueryChange={setCaseQuery}
          onEvidenceQueryChange={setEvidenceQuery}
          onSelectCase={selectCase}
          onSelectEvidence={setSelectedEvidenceId}
          onNext={() => setStep("upload")}
        />
      ) : step === "upload" ? (
        <CompareFileUploader
          sourceEvidence={selectedEvidence}
          compareFile={compareFile}
          fileInputRef={fileInputRef}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          onRemoveFile={clearCompareFile}
          onBack={() => setStep("source")}
          onStart={startCompare}
          compareError={compareError}
        />
      ) : step === "processing" ? (
        <CompareProcessingPanel
          sourceEvidence={selectedEvidence}
          compareFile={compareFile}
          progress={progress}
          onCancel={cancelCompare}
        />
      ) : (
        <ResultStep result={compareResult} onReset={resetCompare} />
      )}
    </section>
  )
}

function StepIndicator({ currentStep }: { currentStep: CompareStep }) {
  const steps = [
    { key: "source", label: "기준 증거" },
    { key: "upload", label: "파일 업로드" },
    { key: "processing", label: "비교 처리" },
    { key: "result", label: "리포트" },
  ] satisfies { key: CompareStep; label: string }[]
  const currentIndex = steps.findIndex((step) => step.key === currentStep)

  return (
    <ol className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep
        const isDone = index < currentIndex

        return (
          <li key={step.key} className={cn(index < steps.length - 1 && "contents")}>
            <div
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors",
                isActive
                  ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                  : isDone
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-500 dark:border-border dark:bg-card dark:text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isActive
                    ? "bg-white/20 text-white"
                    : isDone
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-400 dark:bg-muted dark:text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>
              {step.label}
            </div>
            {index < steps.length - 1 && (
              <div className="hidden h-px w-9 self-center bg-slate-200 md:block dark:bg-border" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function ResultStep({ result, onReset }: { result: CompareResult | null; onReset: () => void }) {
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownloadReport() {
    if (!result) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      const blob = await downloadCompareReport(result.compareId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `compare-report-${result.compareId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(getApiErrorMessage(error, "PDF 리포트 다운로드에 실패했습니다."))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <CompareResultPanel
      result={result}
      downloadError={downloadError}
      isDownloading={isDownloading}
      onReset={onReset}
      onDownloadReport={handleDownloadReport}
    />
  )
}

function mapCaseDetailToSourceCase(caseDetail: CaseDetailData): SourceCase {
  return {
    id: caseDetail.caseId,
    title: caseDetail.caseName,
    department: getCaseStatusLabel(caseDetail.status),
    updatedAtLabel: formatDateTimeLabel(caseDetail.createdAt),
    evidences: caseDetail.evidences.map((evidence, index) => ({
      id: evidence.evidenceId,
      displayLabel: evidence.displayLabel || `기준 증거 ${index + 1}`,
      name: evidence.fileName,
      dateLabel: getCaseStatusLabel(evidence.analysisStatus),
      sizeLabel: "-",
      codecLabel: getMediaTypeLabel(evidence.mediaType),
      durationLabel: "-",
      hashLabel: "-",
      thumbnailUrl: evidence.thumbnailUrl,
      previewUrl: evidence.previewUrl,
      videoUrl: evidence.videoUrl,
      fileUrl: evidence.fileUrl,
    })),
  }
}

function getCaseStatusLabel(status: string) {
  if (status === "PENDING") return "대기"
  if (status === "PROCESSING" || status === "COMPLETED" || status === "FAILED") {
    return getAnalysisStatusLabel(status)
  }
  return status
}

function getMediaTypeLabel(mediaType: string) {
  const labels: Record<string, string> = {
    VIDEO: "영상",
    AUDIO: "음성",
    IMAGE: "이미지",
    UNKNOWN: "알 수 없음",
  }

  return labels[mediaType] ?? mediaType
}

function formatDateTimeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatFileSize(size: number) {
  return formatSharedFileSize(size, {
    minUnit: "MB",
    maxUnit: "GB",
  })
}
