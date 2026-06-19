"use client"

import { useEffect, useRef, useState, type DragEvent, type RefObject } from "react"
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Files,
  FolderOpen,
  GitCompare,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  cancelCompareVerification,
  downloadCompareReport,
  verifyCompare,
  type CompareResult,
  type CompareVerdict,
} from "@/lib/api/compare"
import { getApiErrorMessage } from "@/lib/api/errors"
import { fetchCaseDetail, type CaseDetailData } from "@/lib/api/evidence-detail"
import { fetchMyAnalysisHistory } from "@/lib/api/mypage"
import { formatFileSize as formatSharedFileSize } from "@/lib/formatters"
import { getAnalysisStatusLabel } from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type CompareStep = "source" | "upload" | "processing" | "result"

type SourceEvidence = {
  id: number
  name: string
  dateLabel: string
  sizeLabel: string
  codecLabel: string
  durationLabel: string
  hashLabel: string
}

type SourceCase = {
  id: string
  title: string
  department: string
  updatedAtLabel: string
  evidences: SourceEvidence[]
}

type UploadedCompareFile = {
  file: File
  name: string
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
  name: "원본 증거를 선택하세요",
  dateLabel: "-",
  sizeLabel: "-",
  codecLabel: "-",
  durationLabel: "-",
  hashLabel: "-",
}

export function CompareVerificationFlow() {
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

        const firstCaseId = cases[0]?.id ?? ""
        setSourceCases(cases)
        setSelectedCaseId(firstCaseId)

        if (firstCaseId) {
          const detail = await fetchCaseDetail(firstCaseId)
          if (cancelled) return

          const hydratedCase = mapCaseDetailToSourceCase(detail)
          setSourceCases((current) =>
            current.map((sourceCase) =>
              sourceCase.id === hydratedCase.id ? hydratedCase : sourceCase
            )
          )
          setSelectedEvidenceId(hydratedCase.evidences[0]?.id ?? null)
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
  }, [])

  useEffect(() => {
    if (step !== "processing") return

    setProgress(12)
    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + 8))
    }, 260)

    return () => window.clearInterval(interval)
  }, [step])

  function handleFileChange(files: FileList | null) {
    const file = files?.item(0)
    if (!file) return

    setCompareFile({
      file,
      name: file.name,
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
      setCompareResult(result)
      setProgress(100)
      window.setTimeout(() => setStep("result"), 250)
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
    setCompareFile(null)
    setCompareResult(null)
    setCompareError(null)
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
    const searchValue = `${evidence.id} ${evidence.name} ${evidence.codecLabel}`.toLowerCase()
    return searchValue.includes(evidenceQuery.toLowerCase())
  })

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <Breadcrumb />
      <StepIndicator currentStep={step} />

      {step === "source" ? (
        <SourceSelectStep
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
        <UploadCompareStep
          sourceEvidence={selectedEvidence}
          compareFile={compareFile}
          fileInputRef={fileInputRef}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          onRemoveFile={() => setCompareFile(null)}
          onBack={() => setStep("source")}
          onStart={startCompare}
          compareError={compareError}
        />
      ) : step === "processing" ? (
        <ProcessingStep
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

function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-muted-foreground">
      <span>메인</span>
      <span className="text-slate-300 dark:text-muted-foreground">›</span>
      <span className="text-slate-800 dark:text-foreground">비교 검증</span>
    </div>
  )
}

function StepIndicator({ currentStep }: { currentStep: CompareStep }) {
  const steps = [
    { key: "source", label: "원본 선택" },
    { key: "upload", label: "파일 업로드" },
    { key: "processing", label: "비교 처리" },
    { key: "result", label: "검증 결과" },
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
                "flex h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition-colors",
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

type SourceSelectStepProps = {
  caseQuery: string
  evidenceQuery: string
  selectedCaseId: string
  selectedEvidenceId: number | null
  selectedCase: SourceCase
  cases: SourceCase[]
  evidences: SourceEvidence[]
  isLoadingCases: boolean
  isLoadingEvidences: boolean
  sourceError: string | null
  onCaseQueryChange: (value: string) => void
  onEvidenceQueryChange: (value: string) => void
  onSelectCase: (id: string) => void
  onSelectEvidence: (id: number) => void
  onNext: () => void
}

function SourceSelectStep({
  caseQuery,
  evidenceQuery,
  selectedCaseId,
  selectedEvidenceId,
  selectedCase,
  cases,
  evidences,
  isLoadingCases,
  isLoadingEvidences,
  sourceError,
  onCaseQueryChange,
  onEvidenceQueryChange,
  onSelectCase,
  onSelectEvidence,
  onNext,
}: SourceSelectStepProps) {
  const selectedEvidence = selectedCase.evidences.find(
    (evidence) => evidence.id === selectedEvidenceId
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
      <div>
        <h1 className="text-xl font-black text-slate-950 dark:text-foreground">원본 증거 선택</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
          사건을 먼저 선택한 뒤 비교 기준이 될 원본 파일을 선택하세요.
        </p>
      </div>

      {sourceError ? (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {sourceError}
        </div>
      ) : null}

      <div className="mt-7 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-foreground">
              <FolderOpen className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
              사건 목록
            </h2>
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
              {cases.length}건
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <label className="relative block min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={caseQuery}
                onChange={(event) => onCaseQueryChange(event.target.value)}
                placeholder="사건명 또는 번호 검색..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition-colors hover:border-teal-200 hover:bg-teal-50/50 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
            >
              최신순
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid max-h-[430px] gap-2 overflow-y-auto pr-1">
            {isLoadingCases ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs font-bold text-slate-400 dark:border-border dark:bg-card dark:text-muted-foreground">
                사건 목록을 불러오는 중입니다.
              </div>
            ) : cases.length > 0 ? (
              cases.map((sourceCase) => {
                const isSelected = sourceCase.id === selectedCaseId

                return (
                  <button
                    key={sourceCase.id}
                    type="button"
                    onClick={() => onSelectCase(sourceCase.id)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "border-teal-500 bg-white ring-1 ring-teal-500 dark:border-teal-500/60 dark:bg-teal-500/10"
                        : "border-slate-200 bg-white hover:border-teal-200 dark:border-border dark:bg-card dark:hover:bg-muted/30"
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black text-teal-700 dark:text-teal-300">
                          {sourceCase.id}
                        </span>
                        <span className="mt-1 block text-sm font-black leading-5 text-slate-900 dark:text-foreground">
                          {sourceCase.title}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border",
                          isSelected
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 text-transparent dark:border-border"
                        )}
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Files className="size-3.5" aria-hidden="true" />
                        증거 {sourceCase.evidences.length}개
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {sourceCase.updatedAtLabel}
                      </span>
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs font-bold text-slate-400 dark:border-border dark:bg-card dark:text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-border dark:bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black text-teal-700 dark:text-teal-300">
                {selectedCase.id}
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-foreground">
                {selectedCase.title}
              </h2>
              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-muted-foreground">
                {selectedCase.department} · 원본 후보 {selectedCase.evidences.length}개
              </p>
            </div>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              해시 검증 완료
            </span>
          </div>

          <label className="relative mt-5 block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={evidenceQuery}
              onChange={(event) => onEvidenceQueryChange(event.target.value)}
              placeholder="선택 사건 내 파일명 또는 ID 검색..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-muted/30 dark:text-foreground dark:placeholder:text-muted-foreground"
            />
          </label>

          <div className="mt-4 grid gap-3">
            {isLoadingEvidences ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm font-bold text-slate-400 dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                증거 목록을 불러오는 중입니다.
              </div>
            ) : evidences.length > 0 ? (
              evidences.map((evidence) => {
                const isSelected = evidence.id === selectedEvidenceId

                return (
                  <button
                    key={evidence.id}
                    type="button"
                    onClick={() => onSelectEvidence(evidence.id)}
                    className={cn(
                      "relative grid min-h-[112px] grid-cols-[104px_1fr_auto] items-center gap-4 rounded-lg border p-3 text-left transition-colors max-sm:grid-cols-1",
                      isSelected
                        ? "border-teal-500 bg-teal-50/60 ring-1 ring-teal-500 dark:border-teal-500/60 dark:bg-teal-500/10"
                        : "border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50/70 dark:border-border dark:bg-card dark:hover:bg-muted/30"
                    )}
                  >
                    <EvidencePreview evidence={evidence} isSelected={isSelected} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-black text-teal-700 dark:text-teal-300">
                        {evidence.id}
                        <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
                      </span>
                      <span className="mt-1 block truncate text-base font-bold text-slate-900 dark:text-foreground">
                        {evidence.name}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-muted-foreground">
                        {evidence.dateLabel} · {evidence.sizeLabel} · {evidence.codecLabel}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-muted dark:text-muted-foreground">
                        {getEvidenceMediaLabel(evidence)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 justify-self-end max-sm:absolute max-sm:right-5 max-sm:top-5",
                        isSelected
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 text-transparent dark:border-border"
                      )}
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm font-bold text-slate-400 dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                선택한 사건에서 일치하는 증거가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-border">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
            선택된 원본 증거
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-foreground">
            {selectedEvidence ? `${selectedEvidence.id} · ${selectedEvidence.name}` : "원본 증거를 선택하세요"}
          </p>
        </div>
        <Button
          onClick={onNext}
          disabled={selectedEvidenceId === null}
          className="h-11 rounded-md bg-teal-600 px-6 text-sm font-black hover:bg-teal-700 sm:w-auto"
        >
          다음: 비교 파일 업로드
        </Button>
      </div>
    </div>
  )
}

function EvidencePreview({
  evidence,
  isSelected,
}: {
  evidence: SourceEvidence
  isSelected: boolean
}) {
  const toneClassName = getEvidencePreviewTone(evidence.id)

  return (
    <span
      className={cn(
        "relative h-20 w-full min-w-0 overflow-hidden rounded-lg border bg-slate-950 shadow-sm",
        isSelected ? "border-teal-400" : "border-slate-200 dark:border-border"
      )}
    >
      <span className={cn("absolute inset-0", toneClassName)} />
      <span className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-slate-950/70 to-transparent" />
      <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-teal-700 shadow-sm">
        <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-black text-white">
        {evidence.durationLabel}
      </span>
    </span>
  )
}

type UploadCompareStepProps = {
  sourceEvidence: SourceEvidence
  compareFile: UploadedCompareFile | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onFileChange: (files: FileList | null) => void
  onRemoveFile: () => void
  onBack: () => void
  onStart: () => void
  compareError: string | null
}

function UploadCompareStep({
  sourceEvidence,
  compareFile,
  fileInputRef,
  onDrop,
  onFileChange,
  onRemoveFile,
  onBack,
  onStart,
  compareError,
}: UploadCompareStepProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-950 dark:text-foreground">
            비교 대상 파일 업로드
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
            검증할 파일을 업로드하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          재선택
        </button>
      </div>

      <div className="mt-7 flex items-center gap-4 rounded-lg border border-teal-200 bg-teal-50/60 px-5 py-4 dark:border-teal-500/30 dark:bg-teal-500/10">
        <ShieldCheck className="size-5 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">원본 기준 파일</p>
          <p className="mt-1 truncate text-base font-black text-slate-900 dark:text-foreground">
            {sourceEvidence.name}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-muted-foreground">
            {sourceEvidence.id}
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click()
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/25 px-6 py-8 text-center transition-colors hover:border-teal-500 hover:bg-teal-50/50 dark:border-teal-500/40 dark:bg-teal-500/10 dark:hover:bg-teal-500/15"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files)}
        />

        {compareFile ? (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-white text-teal-600 ring-1 ring-teal-200 dark:bg-background dark:text-teal-300 dark:ring-teal-500/30">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-base font-black text-slate-900 dark:text-foreground">
              {compareFile.name}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemoveFile()
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-red-500 dark:text-muted-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
              제거
            </button>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-white text-teal-600 ring-1 ring-teal-200 dark:bg-background dark:text-teal-300 dark:ring-teal-500/30">
              <UploadCloud className="size-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-700 dark:text-foreground">
              파일을 이곳에 드래그하거나 클릭하여 선택하세요
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400 dark:text-muted-foreground">
              용량 제한 없음 · MP4, MOV 권장
            </p>
          </>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        비교 파일은 복사본으로 처리되며 원본 파일은 변경되지 않습니다.
      </div>

      {compareError ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {compareError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-border">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
            업로드된 비교 파일
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-foreground">
            {compareFile ? `${compareFile.name} · ${compareFile.sizeLabel}` : "비교 파일을 업로드하세요"}
          </p>
        </div>
        <Button
          onClick={onStart}
          disabled={!compareFile}
          className="h-11 rounded-md bg-teal-600 px-6 text-sm font-black hover:bg-teal-700 sm:w-auto"
        >
          <GitCompare className="size-4" aria-hidden="true" />
          비교 검증 시작
        </Button>
      </div>
    </div>
  )
}

function ProcessingStep({
  sourceEvidence,
  compareFile,
  progress,
  onCancel,
}: {
  sourceEvidence: SourceEvidence
  compareFile: UploadedCompareFile | null
  progress: number
  onCancel: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
            <GitCompare className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-950 dark:text-foreground">비교 처리 중</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
              원본과 대상 파일의 해시, 메타데이터, 스트림 구조를 비교하고 있습니다.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10 rounded-md border-red-200 px-4 text-xs font-black text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          <Ban className="size-4" aria-hidden="true" />
          검증 중지
        </Button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <CompareFileSummary label="원본" name={sourceEvidence.name} detail={String(sourceEvidence.id)} />
        <CompareFileSummary label="대상" name={compareFile?.name ?? "비교 파일"} detail={compareFile?.sizeLabel ?? "-"} />
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-muted-foreground">
          <span>검증 진행률</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
          <div
            className="h-full rounded-full bg-teal-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function CompareFileSummary({ label, name, detail }: { label: string; name: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/30">
      <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-sm font-black text-slate-900 dark:text-foreground">{name}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-muted-foreground">{detail}</p>
    </div>
  )
}

function ResultStep({ result, onReset }: { result: CompareResult | null; onReset: () => void }) {
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  if (!result) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-border dark:bg-card">
        <h1 className="text-xl font-black text-slate-950 dark:text-foreground">검증 결과가 없습니다</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
          비교 검증을 다시 실행해 주세요.
        </p>
        <Button
          variant="outline"
          onClick={onReset}
          className="mt-5 h-11 rounded-md border-slate-200 px-5 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        >
          새 검증 시작
        </Button>
      </div>
    )
  }

  const verdict = getVerdictDisplay(result.verdict, result.summary.verdictLabel)

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
    <div className="space-y-6">
      <div className={cn("rounded-xl border p-7", verdict.containerClassName)}>
        <div className="flex items-start gap-4">
          {verdict.icon}
          <div>
            <h1 className="text-xl font-black">{verdict.title}</h1>
            <p className="mt-2 text-sm font-bold">
              {result.summary.verdictLabel || verdict.description}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-border">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-foreground">
            <GitCompare className="size-5 text-teal-600 dark:text-teal-300" aria-hidden="true" />
            비교 결과
          </h2>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              일치 {result.summary.matchCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-500 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              불일치 {result.summary.mismatchCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-muted dark:text-muted-foreground">
              제외 {result.summary.skippedCount}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-500 dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                <th className="px-6 py-4">항목</th>
                <th className="px-6 py-4">원본</th>
                <th className="px-6 py-4">대상</th>
                <th className="px-6 py-4">결과</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((row) => (
                <tr
                  key={row.itemKey}
                  className={cn(
                    "border-b border-slate-100 last:border-0 dark:border-border",
                    row.result === "MISMATCH" && "bg-red-50/70 dark:bg-red-500/10"
                  )}
                >
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-foreground">{row.label}</td>
                  <td className="px-6 py-4 font-semibold text-slate-500 dark:text-muted-foreground">
                    {row.originalValue || "-"}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 font-semibold",
                      row.result === "MATCH"
                        ? "text-slate-500 dark:text-muted-foreground"
                        : row.result === "MISMATCH"
                          ? "text-red-500 dark:text-red-300"
                          : "text-slate-400 dark:text-muted-foreground"
                    )}
                  >
                    {row.candidateValue || "-"}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 font-black",
                      row.result === "MATCH"
                        ? "text-emerald-600 dark:text-emerald-300"
                        : row.result === "MISMATCH"
                          ? "text-red-500 dark:text-red-300"
                          : "text-slate-400 dark:text-muted-foreground"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {row.result === "MATCH" ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      ) : row.result === "MISMATCH" ? (
                        <AlertTriangle className="size-4" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="size-4" aria-hidden="true" />
                      )}
                      {getCompareItemResultLabel(row.result)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={onReset}
          className="h-11 rounded-md border-slate-200 px-5 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        >
          새 검증 시작
        </Button>
        <Button
          onClick={handleDownloadReport}
          disabled={isDownloading}
          className="h-11 rounded-md bg-teal-600 px-5 text-sm font-black hover:bg-teal-700"
        >
          <FileCheck2 className="size-4" aria-hidden="true" />
          {isDownloading ? "다운로드 중" : "PDF 리포트 다운로드"}
        </Button>
      </div>

      {downloadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          {downloadError}
        </div>
      ) : null}
    </div>
  )
}

function getEvidenceMediaLabel(_evidence: SourceEvidence) {
  return "영상 미리보기"
}

function getEvidencePreviewTone(evidenceId: number) {
  const id = String(evidenceId)

  if (id.endsWith("184") || id.endsWith("180")) {
    return "bg-[linear-gradient(135deg,#0f766e,#0f172a_58%,#111827)]"
  }
  if (id.endsWith("182") || id.endsWith("179")) {
    return "bg-[linear-gradient(135deg,#1d4ed8,#0f766e_52%,#111827)]"
  }
  if (id.endsWith("174") || id.endsWith("173")) {
    return "bg-[linear-gradient(135deg,#334155,#0284c7_48%,#111827)]"
  }

  return "bg-[linear-gradient(135deg,#475569,#14b8a6_48%,#111827)]"
}

function mapCaseDetailToSourceCase(caseDetail: CaseDetailData): SourceCase {
  return {
    id: caseDetail.caseId,
    title: caseDetail.caseName,
    department: getCaseStatusLabel(caseDetail.status),
    updatedAtLabel: formatDateTimeLabel(caseDetail.createdAt),
    evidences: caseDetail.evidences.map((evidence) => ({
      id: evidence.evidenceId,
      name: evidence.fileName,
      dateLabel: getCaseStatusLabel(evidence.analysisStatus),
      sizeLabel: "-",
      codecLabel: getMediaTypeLabel(evidence.mediaType),
      durationLabel: "-",
      hashLabel: "-",
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

function getCompareItemResultLabel(result: string) {
  const labels: Record<string, string> = {
    MATCH: "일치",
    MISMATCH: "불일치",
    SKIPPED: "제외",
  }

  return labels[result] ?? result
}

function getVerdictDisplay(verdict: CompareVerdict, verdictLabel: string) {
  if (verdict === "ORIGINAL_MATCH") {
    return {
      title: verdictLabel || "원본 일치",
      description: "원본과 비교 대상 파일이 일치합니다.",
      containerClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
      icon: <CheckCircle2 className="mt-1 size-7 shrink-0" aria-hidden="true" />,
    }
  }

  if (verdict === "TAMPERED") {
    return {
      title: verdictLabel || "위변조 감지",
      description: "원본과 비교 대상 파일 사이에 불일치 항목이 확인되었습니다.",
      containerClassName:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
      icon: <AlertTriangle className="mt-1 size-7 shrink-0" aria-hidden="true" />,
    }
  }

  return {
    title: verdictLabel || "판정 보류",
    description: "일부 항목만 비교되어 최종 판정을 보류했습니다.",
    containerClassName:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-border dark:bg-muted/30 dark:text-muted-foreground",
    icon: <AlertTriangle className="mt-1 size-7 shrink-0" aria-hidden="true" />,
  }
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
