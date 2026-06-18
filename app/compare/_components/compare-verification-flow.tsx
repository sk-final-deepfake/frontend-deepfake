"use client"

import { useEffect, useRef, useState, type DragEvent, type RefObject } from "react"
import {
  AlertTriangle,
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
import { cn } from "@/lib/utils"

type CompareStep = "source" | "upload" | "processing" | "result"

type SourceEvidence = {
  id: string
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
  name: string
  sizeLabel: string
}

type CompareResultRow = {
  label: string
  sourceValue: string
  targetValue: string
  matched: boolean
}

const SOURCE_CASES: SourceCase[] = [
  {
    id: "CASE-2024-0612",
    title: "강남구 인터뷰 영상 위변조 의심",
    department: "디지털포렌식 2팀",
    updatedAtLabel: "2024-06-12 11:20",
    evidences: [
      {
        id: "EVD-2024-0184",
        name: "interview_record.mp4",
        dateLabel: "2024-06-12",
        sizeLabel: "445 MB",
        codecLabel: "H.264 / AAC",
        durationLabel: "00:31:42",
        hashLabel: "a4f3b2c1d9e8f7a6...",
      },
      {
        id: "EVD-2024-0182",
        name: "scene_reference_clip.mp4",
        dateLabel: "2024-06-12",
        sizeLabel: "224 MB",
        codecLabel: "H.264 / AAC",
        durationLabel: "00:08:16",
        hashLabel: "2a8f71d4c0be93f1...",
      },
    ],
  },
  {
    id: "CASE-2024-0610",
    title: "잠실 현장 바디캠 증거 검증",
    department: "현장수사 지원팀",
    updatedAtLabel: "2024-06-10 18:45",
    evidences: [
      {
        id: "EVD-2024-0180",
        name: "bodycam_reference.mp4",
        dateLabel: "2024-06-10",
        sizeLabel: "1.8 GB",
        codecLabel: "H.265 / AAC",
        durationLabel: "00:42:18",
        hashLabel: "9d2f5a0c8b1e43d7...",
      },
      {
        id: "EVD-2024-0179",
        name: "bodycam_side_angle.mp4",
        dateLabel: "2024-06-10",
        sizeLabel: "1.2 GB",
        codecLabel: "H.265 / AAC",
        durationLabel: "00:39:08",
        hashLabel: "4cf840d91a2e67b5...",
      },
    ],
  },
  {
    id: "CASE-2024-0608",
    title: "법원 출입구 CCTV 원본성 확인",
    department: "영상증거 분석팀",
    updatedAtLabel: "2024-06-08 16:10",
    evidences: [
      {
        id: "EVD-2024-0174",
        name: "cctv_court_entry.mp4",
        dateLabel: "2024-06-08",
        sizeLabel: "2.1 GB",
        codecLabel: "H.264 / AAC",
        durationLabel: "01:12:04",
        hashLabel: "6a0d7c2e41bf883c...",
      },
      {
        id: "EVD-2024-0173",
        name: "cctv_lobby_backup.mp4",
        dateLabel: "2024-06-08",
        sizeLabel: "1.6 GB",
        codecLabel: "H.264 / AAC",
        durationLabel: "00:57:22",
        hashLabel: "fc2a1973d0be68aa...",
      },
    ],
  },
]

const DEFAULT_CASE = SOURCE_CASES[0]
const DEFAULT_SOURCE_EVIDENCE = DEFAULT_CASE.evidences[0]

const RESULT_ROWS: CompareResultRow[] = [
  {
    label: "SHA-256 해시",
    sourceValue: "a4f3b2c1d9e8f7a6...",
    targetValue: "a4f3b2c1d9e8f7a6...",
    matched: true,
  },
  {
    label: "파일 크기",
    sourceValue: "445 MB",
    targetValue: "445 MB",
    matched: true,
  },
  {
    label: "영상 길이",
    sourceValue: "00:31:42",
    targetValue: "00:31:42",
    matched: true,
  },
  {
    label: "코덱 정보",
    sourceValue: "H.264 / AAC",
    targetValue: "H.264 / AAC",
    matched: true,
  },
  {
    label: "메타데이터 타임스탬프",
    sourceValue: "2024-06-12 09:14",
    targetValue: "2024-06-12 09:14",
    matched: true,
  },
  {
    label: "GOP 구조",
    sourceValue: "I,P,B 정상",
    targetValue: "I,P,P 변형",
    matched: false,
  },
  {
    label: "스트림 체크섬",
    sourceValue: "3f9a2b...",
    targetValue: "7c1d8e...",
    matched: false,
  },
]

const DEFAULT_COMPARE_FILE: UploadedCompareFile = {
  name: "0301.mp4",
  sizeLabel: "445 MB",
}

const MAX_COMPARE_SIZE_BYTES = 2 * 1024 * 1024 * 1024

export function CompareVerificationFlow() {
  const [step, setStep] = useState<CompareStep>("source")
  const [selectedCaseId, setSelectedCaseId] = useState(DEFAULT_CASE.id)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(DEFAULT_SOURCE_EVIDENCE.id)
  const [caseQuery, setCaseQuery] = useState("")
  const [evidenceQuery, setEvidenceQuery] = useState("")
  const [compareFile, setCompareFile] = useState<UploadedCompareFile | null>(DEFAULT_COMPARE_FILE)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step !== "processing") return

    setProgress(12)
    const interval = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + 8))
    }, 260)

    return () => window.clearInterval(interval)
  }, [step])

  useEffect(() => {
    if (step !== "processing" || progress < 100) return

    const timeout = window.setTimeout(() => setStep("result"), 300)

    return () => window.clearTimeout(timeout)
  }, [progress, step])

  function handleFileChange(files: FileList | null) {
    const file = files?.item(0)
    if (!file) return

    if (file.size > MAX_COMPARE_SIZE_BYTES) {
      setCompareFile(null)
      return
    }

    setCompareFile({
      name: file.name,
      sizeLabel: formatFileSize(file.size),
    })
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    handleFileChange(event.dataTransfer.files)
  }

  function startCompare() {
    if (!compareFile) return
    setProgress(0)
    setStep("processing")
  }

  function resetCompare() {
    setStep("source")
    setProgress(0)
    setSelectedCaseId(DEFAULT_CASE.id)
    setSelectedEvidenceId(DEFAULT_SOURCE_EVIDENCE.id)
    setCaseQuery("")
    setEvidenceQuery("")
    setCompareFile(DEFAULT_COMPARE_FILE)
  }

  function selectCase(caseId: string) {
    const nextCase = SOURCE_CASES.find((sourceCase) => sourceCase.id === caseId)
    if (!nextCase) return

    setSelectedCaseId(caseId)
    setSelectedEvidenceId(nextCase.evidences[0]?.id ?? "")
    setEvidenceQuery("")
  }

  const selectedCase =
    SOURCE_CASES.find((sourceCase) => sourceCase.id === selectedCaseId) ?? DEFAULT_CASE
  const selectedEvidence =
    selectedCase.evidences.find((evidence) => evidence.id === selectedEvidenceId) ??
    selectedCase.evidences[0] ??
    DEFAULT_SOURCE_EVIDENCE
  const filteredCases = SOURCE_CASES.filter((sourceCase) => {
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
        />
      ) : step === "processing" ? (
        <ProcessingStep sourceEvidence={selectedEvidence} compareFile={compareFile} progress={progress} />
      ) : (
        <ResultStep onReset={resetCompare} />
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
  selectedEvidenceId: string
  selectedCase: SourceCase
  cases: SourceCase[]
  evidences: SourceEvidence[]
  onCaseQueryChange: (value: string) => void
  onEvidenceQueryChange: (value: string) => void
  onSelectCase: (id: string) => void
  onSelectEvidence: (id: string) => void
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
            {cases.length > 0 ? (
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
            {evidences.length > 0 ? (
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
          disabled={!selectedEvidenceId}
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
              파일당 최대 2GB · MP4, MOV 권장
            </p>
          </>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        비교 파일은 복사본으로 처리되며 원본 파일은 변경되지 않습니다.
      </div>

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
}: {
  sourceEvidence: SourceEvidence
  compareFile: UploadedCompareFile | null
  progress: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
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

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <CompareFileSummary label="원본" name={sourceEvidence.name} detail={sourceEvidence.id} />
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

function ResultStep({ onReset }: { onReset: () => void }) {
  const matchedCount = RESULT_ROWS.filter((row) => row.matched).length
  const mismatchCount = RESULT_ROWS.length - matchedCount

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-7 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 size-7 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-black">위변조 감지 - 일부 불일치</h1>
            <p className="mt-2 text-sm font-bold">
              {mismatchCount}개 항목에서 원본과 차이가 확인되었습니다. 해당 파일은 저장 후 수정된 것으로 판단됩니다.
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
              일치 {matchedCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-500 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              불일치 {mismatchCount}
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
              {RESULT_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-slate-100 last:border-0 dark:border-border",
                    !row.matched && "bg-red-50/70 dark:bg-red-500/10"
                  )}
                >
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-foreground">{row.label}</td>
                  <td className="px-6 py-4 font-semibold text-slate-500 dark:text-muted-foreground">
                    {row.sourceValue}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 font-semibold",
                      row.matched
                        ? "text-slate-500 dark:text-muted-foreground"
                        : "text-red-500 dark:text-red-300"
                    )}
                  >
                    {row.targetValue}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 font-black",
                      row.matched ? "text-emerald-600 dark:text-emerald-300" : "text-red-500 dark:text-red-300"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {row.matched ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="size-4" aria-hidden="true" />
                      )}
                      {row.matched ? "일치" : "불일치"}
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
        <Button className="h-11 rounded-md bg-teal-600 px-5 text-sm font-black hover:bg-teal-700">
          <FileCheck2 className="size-4" aria-hidden="true" />
          PDF 리포트 다운로드
        </Button>
      </div>
    </div>
  )
}

function getEvidenceMediaLabel(_evidence: SourceEvidence) {
  return "영상 미리보기"
}

function getEvidencePreviewTone(evidenceId: string) {
  if (evidenceId.endsWith("184") || evidenceId.endsWith("180")) {
    return "bg-[linear-gradient(135deg,#0f766e,#0f172a_58%,#111827)]"
  }
  if (evidenceId.endsWith("182") || evidenceId.endsWith("179")) {
    return "bg-[linear-gradient(135deg,#1d4ed8,#0f766e_52%,#111827)]"
  }
  if (evidenceId.endsWith("174") || evidenceId.endsWith("173")) {
    return "bg-[linear-gradient(135deg,#334155,#0284c7_48%,#111827)]"
  }

  return "bg-[linear-gradient(135deg,#475569,#14b8a6_48%,#111827)]"
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
