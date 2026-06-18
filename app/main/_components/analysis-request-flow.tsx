"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type DragEvent, type RefObject } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  History,
  FileVideo,
  Info,
  Maximize2,
  MessageSquareText,
  Play,
  ShieldCheck,
  UploadCloud,
  Volume2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { AnalysisProgress } from "@/components/analysis-progress"
import {
  AnalysisResult,
  type AnalysisResultData,
  type AnalysisResultTone,
  type FrameRiskBar,
} from "@/components/analysis-result"
import { cn } from "@/lib/utils"

type AnalysisStep = "upload" | "analyzing" | "result"

export type SelectedEvidence = {
  name: string
  sizeBytes: number
  sizeLabel: string
  extension: string
  mimeType: string
  uploadAtLabel: string
  resolutionLabel: string
  comment: string
}

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024
const SUPPORTED_VIDEO_EXTENSIONS = ["mp4", "mov"]

const DEFAULT_EVIDENCE: SelectedEvidence = {
  name: "0301.mp4",
  sizeBytes: 914_600_000,
  sizeLabel: "914.6 MB",
  extension: "MP4",
  mimeType: "video/mp4",
  uploadAtLabel: "2026.06.18 10:03",
  resolutionLabel: "1,280 x 720",
  comment: "CCTV 원본 영상. 분석 요청 전 무결성 검증 대기 중입니다.",
}

const SAMPLE_EVIDENCES: SelectedEvidence[] = [
  DEFAULT_EVIDENCE,
  {
    name: "cctv_entrance_02.mov",
    sizeBytes: 642_200_000,
    sizeLabel: "642.2 MB",
    extension: "MOV",
    mimeType: "video/quicktime",
    uploadAtLabel: "2026.06.18 10:04",
    resolutionLabel: "1,920 x 1,080",
    comment: "출입구 CCTV 백업 영상입니다.",
  },
  {
    name: "interview_clip_03.mp4",
    sizeBytes: 288_400_000,
    sizeLabel: "288.4 MB",
    extension: "MP4",
    mimeType: "video/mp4",
    uploadAtLabel: "2026.06.18 10:05",
    resolutionLabel: "1,280 x 720",
    comment: "인터뷰 클립 원본. 음성 구간 포함 영상입니다.",
  },
]

const frameRisks = [
  { label: "0:00", value: 14, color: "bg-teal-500" },
  { label: "0:03", value: 22, color: "bg-teal-500" },
  { label: "0:06", value: 35, color: "bg-teal-500" },
  { label: "0:09", value: 95, color: "bg-red-400" },
  { label: "0:12", value: 99, color: "bg-red-400" },
  { label: "0:15", value: 96, color: "bg-red-400" },
  { label: "0:18", value: 74, color: "bg-orange-400" },
  { label: "0:21", value: 45, color: "bg-teal-500" },
  { label: "0:24", value: 24, color: "bg-teal-500" },
  { label: "0:27", value: 14, color: "bg-teal-500" },
  { label: "0:30", value: 9, color: "bg-teal-500" },
]

const suspiciousFrameGroups = [
  {
    level: "HIGH",
    timeRange: "00:09 - 00:18",
    reason: "GAN 아티팩트 / 얼굴 블렌딩 경계 감지",
    score: "94%",
    tone: "red",
    frames: [
      { time: "00:09", risk: 92 },
      { time: "00:12", risk: 98 },
      { time: "00:15", risk: 95 },
    ],
  },
  {
    level: "MEDIUM",
    timeRange: "00:06 - 00:09",
    reason: "조명 불일치 (Shadow inconsistency)",
    score: "63%",
    tone: "amber",
    frames: [
      { time: "00:06", risk: 58 },
      { time: "00:07", risk: 64 },
      { time: "00:08", risk: 67 },
    ],
  },
]

const resultPresets = [
  {
    riskScore: 94,
    riskLabel: "딥페이크 의심 - 위험",
    evidenceId: "EVD-2024-0188",
    tone: "red",
  },
  {
    riskScore: 67,
    riskLabel: "위변조 정황 - 주의",
    evidenceId: "EVD-2024-0189",
    tone: "orange",
  },
  {
    riskScore: 21,
    riskLabel: "위변조 가능성 낮음",
    evidenceId: "EVD-2024-0190",
    tone: "green",
  },
]

export function AnalysisRequestFlow() {
  const [step, setStep] = useState<AnalysisStep>("upload")
  const [evidences, setEvidences] = useState<SelectedEvidence[]>([])
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0)
  const [caseName, setCaseName] = useState("")
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step !== "analyzing") return

    setProgress(8)
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 4)
        return next
      })
    }, 420)

    return () => window.clearInterval(interval)
  }, [step])

  useEffect(() => {
    if (step !== "analyzing" || progress < 100) return

    const timeout = window.setTimeout(() => {
      setStep("result")
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [progress, step])

  useEffect(() => {
    if (activeEvidenceIndex < evidences.length) return
    setActiveEvidenceIndex(Math.max(0, evidences.length - 1))
  }, [activeEvidenceIndex, evidences.length])

  function handleFileChange(files: FileList | null) {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return

    try {
      const nextEvidences = selectedFiles.map(buildEvidenceFromFile)
      setEvidences(nextEvidences)
      setActiveEvidenceIndex(0)
      setUploadMessage({
        type: "success",
        text: `${nextEvidences.length}개 파일 업로드가 완료되었습니다. 사건명을 입력하면 분석 요청을 시작할 수 있습니다.`,
      })
    } catch (error) {
      setEvidences([])
      setActiveEvidenceIndex(0)
      setUploadMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "파일 업로드에 실패했습니다. 다시 시도해 주세요.",
      })
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    handleFileChange(event.dataTransfer.files)
  }

  function startAnalysis() {
    if (evidences.length === 0) return
    setProgress(0)
    setStep("analyzing")
  }

  function startSampleAnalysis() {
    setEvidences(SAMPLE_EVIDENCES)
    setActiveEvidenceIndex(0)
    setCaseName("샘플 영상 분석 테스트")
    setUploadMessage(null)
    setProgress(0)
    setStep("analyzing")
  }

  function fillSampleMetadata() {
    setEvidences(SAMPLE_EVIDENCES)
    setActiveEvidenceIndex(0)
    setCaseName((current) => current || "샘플 영상 분석 테스트")
    setUploadMessage({
      type: "success",
      text: "샘플 영상 3개 업로드가 완료되었습니다. 분석 요청을 시작할 수 있습니다.",
    })
  }

  function removeEvidence(index: number) {
    setEvidences((current) => current.filter((_, currentIndex) => currentIndex !== index))
    setUploadMessage((current) => {
      const nextCount = evidences.length - 1
      if (nextCount <= 0) return null

      return {
        type: current?.type ?? "success",
        text: `${nextCount}개 파일 업로드가 완료되었습니다. 사건명을 입력하면 분석 요청을 시작할 수 있습니다.`,
      }
    })
  }

  function updateEvidenceComment(index: number, comment: string) {
    setEvidences((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, comment } : item
      )
    )
  }

  function resetAnalysis() {
    setStep("upload")
    setProgress(0)
    setEvidences([])
    setActiveEvidenceIndex(0)
    setCaseName("")
    setUploadMessage(null)
  }

  const analysisEvidence = buildAnalysisEvidence(evidences)

  return (
    <section id="new-analysis" className="mx-auto w-full max-w-6xl scroll-mt-28 space-y-5">
      {step === "upload" ? (
        <UploadStep
          evidences={evidences}
          activeEvidenceIndex={activeEvidenceIndex}
          caseName={caseName}
          uploadMessage={uploadMessage}
          fileInputRef={fileInputRef}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          onCaseNameChange={setCaseName}
          onRemoveFile={removeEvidence}
          onSelectEvidence={setActiveEvidenceIndex}
          onCommentChange={updateEvidenceComment}
          onNextMetadata={() =>
            setActiveEvidenceIndex((current) =>
              evidences.length === 0 ? 0 : (current + 1) % evidences.length
            )
          }
          onStart={startAnalysis}
          onSampleStart={startSampleAnalysis}
          onSampleMetadata={fillSampleMetadata}
        />
      ) : step === "analyzing" ? (
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <Breadcrumb />
          <AnalyzingStep evidence={analysisEvidence} progress={progress} onReset={resetAnalysis} />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <Breadcrumb />
          <ResultStep
            evidences={evidences.length > 0 ? evidences : [DEFAULT_EVIDENCE]}
            activeIndex={activeEvidenceIndex}
            onNext={() =>
              setActiveEvidenceIndex((current) =>
                evidences.length === 0 ? 0 : (current + 1) % evidences.length
              )
            }
            onPrevious={() =>
              setActiveEvidenceIndex((current) =>
                evidences.length === 0
                  ? 0
                  : (current - 1 + evidences.length) % evidences.length
              )
            }
            onReset={resetAnalysis}
          />
        </div>
      )}
    </section>
  )
}

function Breadcrumb() {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-muted-foreground">
      <span>메인</span>
      <span className="text-slate-300 dark:text-muted-foreground">›</span>
      <span className="text-slate-800 dark:text-foreground">분석 요청</span>
    </div>
  )
}

type UploadStepProps = {
  evidences: SelectedEvidence[]
  activeEvidenceIndex: number
  caseName: string
  uploadMessage: { type: "success" | "error"; text: string } | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onFileChange: (files: FileList | null) => void
  onCaseNameChange: (value: string) => void
  onRemoveFile: (index: number) => void
  onSelectEvidence: (index: number) => void
  onCommentChange: (index: number, comment: string) => void
  onNextMetadata: () => void
  onStart: () => void
  onSampleStart: () => void
  onSampleMetadata: () => void
}

function UploadStep({
  evidences,
  activeEvidenceIndex,
  caseName,
  uploadMessage,
  fileInputRef,
  onDrop,
  onFileChange,
  onCaseNameChange,
  onRemoveFile,
  onSelectEvidence,
  onCommentChange,
  onNextMetadata,
  onStart,
  onSampleStart,
  onSampleMetadata,
}: UploadStepProps) {
  const hasEvidence = evidences.length > 0
  const totalSizeLabel = formatTotalSizeLabel(evidences)

  return (
    <>
      <div className="pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-300">
          <span className="relative flex size-3 items-center justify-center">
            <span className="absolute size-3 rounded-full bg-cyan-400/30" />
            <span className="size-1.5 rounded-full bg-cyan-600" />
          </span>
          포렌식 분석 시스템 · 정상 운영 중
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-foreground">
          디지털 미디어 위변조 분석 대시보드
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 dark:text-muted-foreground">
          첨단 AI 모델을 활용하여 미디어 증거물의 무결성을 검증합니다. 업로드된 파일은 안전하게 분석되며, 결과 보고서를 즉시 확인할 수 있습니다.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-950 dark:text-foreground">
          <History className="size-5 text-cyan-600" aria-hidden="true" />
          분석 기록 및 새 분석 시작
        </h2>
        <div className="h-px bg-slate-200 dark:bg-border" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
          <div>
            <h3 className="text-xl font-black text-slate-950 dark:text-foreground">증거 파일 업로드</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-muted-foreground">
              분석할 영상 파일을 업로드하면 SHA-256 해시와 메타데이터가 서버에 저장됩니다.
            </p>
          </div>

          <label htmlFor="caseName" className="mt-7 block text-sm font-bold text-slate-600 dark:text-muted-foreground">
            사건명 <span className="text-red-500">*</span>
          </label>
          <input
            id="caseName"
            value={caseName}
            onChange={(event) => onCaseNameChange(event.target.value)}
            placeholder="예: 2026-서울-0123 딥페이크 유포 사건"
            className="mt-2 h-11 w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
          />
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-muted-foreground">
            업로드와 분석 시작에 사건명이 필요하며, 내 분석 기록에 등록됩니다.
          </p>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                fileInputRef.current?.click()
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center transition-colors hover:border-cyan-300 hover:bg-cyan-50/40 dark:border-border dark:bg-muted/40 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*"
              className="sr-only"
              onChange={(event) => onFileChange(event.target.files)}
            />

            <div className="flex size-14 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-500/25">
              <UploadCloud className="size-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-black text-slate-700 dark:text-foreground">
              {hasEvidence ? "파일을 추가로 업로드하려면 클릭하세요" : "파일을 이곳에 드래그하거나 클릭하여 선택하세요"}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400 dark:text-muted-foreground">
              파일당 최대 2GB · MP4, MOV 여러 개 선택 가능
            </p>
          </div>

          <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileVideo className="size-4 text-cyan-600" aria-hidden="true" />
                <h4 className="text-sm font-black text-slate-800 dark:text-foreground">선택된 파일</h4>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
                {hasEvidence ? `${evidences.length}개 · ${totalSizeLabel}` : "0개"}
              </span>
            </div>

            {hasEvidence ? (
              <div className="mt-3 grid gap-2">
                {evidences.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectEvidence(index)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return
                      onSelectEvidence(index)
                    }}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border bg-white dark:bg-card px-3 py-3 text-left transition-colors",
                      index === activeEvidenceIndex
                        ? "border-cyan-300 bg-cyan-50 dark:border-cyan-500/40 dark:bg-cyan-500/10"
                        : "border-slate-200 dark:border-border hover:border-cyan-200 hover:bg-white dark:hover:bg-card"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          index === activeEvidenceIndex
                            ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                            : "bg-slate-100 dark:bg-muted text-slate-500 dark:text-muted-foreground"
                        )}
                      >
                        <FileVideo className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black text-slate-700 dark:text-foreground">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-muted-foreground">
                          {item.sizeLabel} · {item.extension}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemoveFile(index)
                      }}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded text-slate-400 dark:text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label={`${item.name} 제거`}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs font-semibold text-slate-400 dark:border-border dark:bg-card dark:text-muted-foreground">
                아직 선택된 영상 파일이 없습니다.
              </div>
            )}
          </section>

          {uploadMessage ? (
            <div
              className={cn(
                "mt-5 flex items-start gap-2 rounded-lg border px-4 py-3 text-xs font-bold",
                uploadMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400"
              )}
            >
              {uploadMessage.type === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{uploadMessage.text}</span>
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            보안: 모든 데이터는 암호화되어 처리됩니다.
          </div>

          <Button
            onClick={onStart}
            disabled={!hasEvidence || !caseName.trim()}
            title={
              !hasEvidence
                ? "영상 파일 업로드가 완료되면 분석 요청을 시작할 수 있습니다."
                : !caseName.trim()
                  ? "사건명을 입력하면 분석 요청을 시작할 수 있습니다."
                  : undefined
            }
            className="mt-5 h-11 w-full rounded-lg bg-teal-600 text-sm font-black hover:bg-teal-700"
          >
            분석 시작하기
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10 w-full rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
            onClick={onSampleMetadata}
          >
            샘플 메타데이터 채우기
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onSampleStart}
            className="mt-2 h-10 w-full rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
          >
            샘플 영상으로 로딩 화면 보기
          </Button>
        </div>

        <div className="space-y-5">
          <VideoMetadataPreview
            evidences={evidences}
            activeIndex={activeEvidenceIndex}
            onNext={onNextMetadata}
            onCommentChange={(comment) => onCommentChange(activeEvidenceIndex, comment)}
          />
        </div>
      </div>
    </>
  )
}

function VideoMetadataPreview({
  evidences,
  activeIndex,
  onNext,
  onCommentChange,
}: {
  evidences: SelectedEvidence[]
  activeIndex: number
  onNext: () => void
  onCommentChange: (comment: string) => void
}) {
  const [activeTab, setActiveTab] = useState<"metadata" | "comment">("metadata")
  const evidence = evidences[activeIndex] ?? null

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-teal-600" aria-hidden="true" />
          <h2 className="text-base font-black text-slate-900 dark:text-foreground">파일 메타데이터</h2>
        </div>
        {evidences.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground">
              {activeIndex + 1}/{evidences.length}
            </span>
            <button
              type="button"
              onClick={onNext}
              className="flex size-6 items-center justify-center rounded border border-slate-200 text-xs font-black text-slate-500 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-border dark:text-muted-foreground dark:hover:border-teal-500/30 dark:hover:bg-teal-500/10 dark:hover:text-teal-300"
              aria-label="다음 파일 메타데이터 보기"
            >
              &gt;
            </button>
          </div>
        ) : null}
      </div>
      <div className="px-5 py-5 text-sm font-medium text-slate-500 dark:text-muted-foreground">
        {evidence ? (
          <div className="space-y-4">
            <VideoPreview evidence={evidence} activeIndex={activeIndex} />

            <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-border dark:bg-muted/40">
              <button
                type="button"
                onClick={() => setActiveTab("metadata")}
                className={cn(
                  "h-8 rounded-md text-xs font-black transition-colors",
                  activeTab === "metadata"
                    ? "bg-white dark:bg-card text-teal-700 shadow-sm"
                    : "text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:text-foreground"
                )}
              >
                메타데이터
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("comment")}
                className={cn(
                  "h-8 rounded-md text-xs font-black transition-colors",
                  activeTab === "comment"
                    ? "bg-white dark:bg-card text-teal-700 shadow-sm"
                    : "text-slate-500 dark:text-muted-foreground hover:text-slate-800 dark:text-foreground"
                )}
              >
                코멘트
              </button>
            </div>

            {activeTab === "metadata" ? (
              <dl className="space-y-3">
                <MetadataRow label="파일명" value={evidence.name} />
                <MetadataRow label="파일 형식" value={evidence.extension} />
                <MetadataRow label="MIME 타입" value={evidence.mimeType} />
                <MetadataRow label="파일 크기" value={evidence.sizeLabel} />
                <MetadataRow label="해상도" value={evidence.resolutionLabel} />
                <MetadataRow label="업로드 시간" value={evidence.uploadAtLabel} />
                <MetadataRow label="SHA-256" value="분석 시작 시 생성" accent />
                <MetadataRow label="분석 모델" value="DeepScan v2.4.1" />
              </dl>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/40">
                <label
                  htmlFor="evidenceComment"
                  className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-foreground"
                >
                  <MessageSquareText className="size-4 text-teal-600" aria-hidden="true" />
                  파일 코멘트
                </label>
                <textarea
                  id="evidenceComment"
                  value={evidence.comment}
                  onChange={(event) => onCommentChange(event.target.value)}
                  placeholder="파일 확인 내용이나 분석 요청 메모를 입력하세요."
                  className="mt-3 min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
                />
              </div>
            )}
          </div>
        ) : (
          <p>파일을 선택하거나 업로드하면 메타데이터가 여기에 표시됩니다.</p>
        )}
      </div>
    </section>
  )
}

function VideoPreview({
  evidence,
  activeIndex,
}: {
  evidence: SelectedEvidence
  activeIndex: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm dark:border-border">
      <div className="relative aspect-video">
        <div
          className={cn(
            "absolute inset-0",
            activeIndex % 3 === 0 &&
              "bg-[linear-gradient(135deg,#334155_0%,#0f766e_42%,#111827_100%)]",
            activeIndex % 3 === 1 &&
              "bg-[linear-gradient(135deg,#1e293b_0%,#475569_44%,#0f172a_100%)]",
            activeIndex % 3 === 2 &&
              "bg-[linear-gradient(135deg,#0f172a_0%,#164e63_46%,#111827_100%)]"
          )}
        />
        <div className="absolute left-5 top-5 h-16 w-24 rounded-sm border border-white/25 bg-white/10" />
        <div className="absolute right-6 top-6 h-28 w-16 rounded-sm border border-white/20 bg-slate-900/25" />
        <div className="absolute bottom-12 left-6 h-16 w-24 rounded-full border border-white/20 bg-emerald-200/15 blur-[1px]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-black/35 px-3 py-2">
          <span className="truncate text-[11px] font-black text-white/90">{evidence.name}</span>
          <span className="text-[11px] font-bold text-white/75">{evidence.uploadAtLabel}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 px-3 py-2">
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-2/5 rounded-full bg-cyan-400" />
          </div>
          <div className="flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2">
              <Play className="size-4" aria-hidden="true" />
              <span className="text-[10px] font-bold">미리보기</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <Volume2 className="size-4" aria-hidden="true" />
              <span className="text-[10px] font-black">1X</span>
              <Maximize2 className="size-4" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetadataRow({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-xs font-bold text-slate-400 dark:text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "truncate text-right text-xs font-black",
          accent ? "text-teal-600" : "text-slate-800 dark:text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function AnalyzingStep({
  evidence,
  progress,
  onReset,
}: {
  evidence: SelectedEvidence
  progress: number
  onReset: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 shadow-sm dark:border-border dark:bg-card">
      <AnalysisProgress fileName={evidence.name} progress={progress} />

      <div className="mx-auto mt-4 grid max-w-xl gap-2 sm:grid-cols-2">
        <Button
          className="h-10 rounded-lg bg-teal-600 text-sm font-black hover:bg-teal-700"
          render={<Link href="/mypage" />}
          nativeButton={false}
        >
          분석 이력
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-10 rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        >
          새 분석 요청
        </Button>
      </div>
    </div>
  )
}

export function ResultStep({
  evidences,
  activeIndex,
  onNext,
  onPrevious,
  onReset,
}: {
  evidences: SelectedEvidence[]
  activeIndex: number
  onNext: () => void
  onPrevious: () => void
  onReset: () => void
}) {
  const evidence = evidences[activeIndex] ?? DEFAULT_EVIDENCE
  const result = getResultPreset(activeIndex)

  const data: AnalysisResultData = {
    fileName: evidence.name,
    evidenceId: result.evidenceId,
    uploadedAtLabel: evidence.uploadAtLabel,
    riskScore: result.riskScore,
    riskLabel: result.riskLabel,
    tone: result.tone as AnalysisResultTone,
    frameRisks: getFrameRisksForResult(activeIndex),
    reasonGroups: getSuspiciousFrameGroupsForResult(activeIndex),
    integrityRows: [
      ["SHA-256", getMockHash(activeIndex)],
      ["전자서명", "PKI · RSA-4096 적용"],
      ["WORM 저장", "S3 Object Lock"],
      ["블록체인 Tx", getMockTxHash(activeIndex)],
      ["Custody Log", `LOG-2026-${String(488 + activeIndex).padStart(6, "0")}`],
      ["분석 모델", "DeepScan v2.4.1"],
      ["파일 형식", evidence.extension],
    ],
  }

  return (
    <div className="space-y-5">
      {evidences.length > 1 ? (
        <ResultFileNavigator
          evidences={evidences}
          activeIndex={activeIndex}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      ) : null}

      <AnalysisResult data={data} onReset={onReset} />
    </div>
  )
}

function ResultFileNavigator({
  evidences,
  activeIndex,
  onPrevious,
  onNext,
}: {
  evidences: SelectedEvidence[]
  activeIndex: number
  onPrevious: () => void
  onNext: () => void
}) {
  const currentEvidence = evidences[activeIndex] ?? DEFAULT_EVIDENCE

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-border dark:bg-card">
      <div className="grid items-center gap-3 sm:grid-cols-[140px_1fr_140px]">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="h-10 rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        >
          &lt; 이전 파일
        </Button>

        <div className="min-w-0 text-center">
          <p className="text-xs font-black text-teal-600">
            {activeIndex + 1} / {evidences.length}
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-800 dark:text-foreground">
            {currentEvidence.name}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          className="h-10 rounded-lg border-slate-200 text-sm font-bold text-slate-600 dark:border-border dark:text-muted-foreground"
        >
          다음 파일 &gt;
        </Button>
      </div>
    </section>
  )
}

type SuspiciousFrameGroupData = (typeof suspiciousFrameGroups)[number]

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`
}

function getResultPreset(index: number) {
  return resultPresets[index % resultPresets.length]
}

function getFrameRisksForResult(index: number): FrameRiskBar[] {
  if (index % 3 === 1) {
    return frameRisks.map((item, itemIndex) => ({
      ...item,
      value: Math.max(8, Math.round(item.value * 0.72)),
      color: itemIndex >= 3 && itemIndex <= 6 ? "bg-orange-400" : "bg-teal-500",
    }))
  }

  if (index % 3 === 2) {
    return frameRisks.map((item) => ({
      ...item,
      value: Math.max(6, Math.round(item.value * 0.32)),
      color: "bg-teal-500",
    }))
  }

  return frameRisks
}

function getSuspiciousFrameGroupsForResult(index: number): SuspiciousFrameGroupData[] {
  if (index % 3 === 1) {
    return [
      {
        ...suspiciousFrameGroups[0],
        level: "MEDIUM",
        timeRange: "00:12 - 00:18",
        reason: "프레임 간 얼굴 랜드마크 흔들림 감지",
        score: "67%",
        tone: "amber",
        frames: [
          { time: "00:12", risk: 65 },
          { time: "00:15", risk: 68 },
          { time: "00:18", risk: 63 },
        ],
      },
    ]
  }

  if (index % 3 === 2) {
    return [
      {
        ...suspiciousFrameGroups[1],
        level: "LOW",
        timeRange: "00:03 - 00:06",
        reason: "압축 노이즈 편차 낮음",
        score: "21%",
        tone: "amber",
        frames: [
          { time: "00:03", risk: 19 },
          { time: "00:04", risk: 24 },
          { time: "00:06", risk: 20 },
        ],
      },
    ]
  }

  return suspiciousFrameGroups
}

function getMockHash(index: number) {
  const hashes = [
    "a4f3b2c1d9e8f7a6...",
    "b91c7e42aa03f1d9...",
    "7c28e4b3f09a11d0...",
  ]

  return hashes[index % hashes.length]
}

function getMockTxHash(index: number) {
  const hashes = ["0x8f3a...92c", "0x44bd...1af", "0x91e0...7c2"]
  return hashes[index % hashes.length]
}

function buildEvidenceFromFile(file: File): SelectedEvidence {
  validateVideoFile(file)

  return {
    name: file.name,
    sizeBytes: file.size,
    sizeLabel: formatBytes(file.size),
    extension: getFileExtension(file.name),
    mimeType: file.type || "video/*",
    uploadAtLabel: formatDateTimeLabel(Date.now()),
    resolutionLabel: "분석 전",
    comment: "업로드된 영상입니다. 분석 요청 후 코멘트를 남길 수 있습니다.",
  }
}

function buildAnalysisEvidence(evidences: SelectedEvidence[]): SelectedEvidence {
  if (evidences.length === 0) return DEFAULT_EVIDENCE
  if (evidences.length === 1) return evidences[0]

  const first = evidences[0]
  return {
    name: `${first.name} 외 ${evidences.length - 1}개`,
    sizeBytes: evidences.reduce((sum, item) => sum + item.sizeBytes, 0),
    sizeLabel: formatTotalSizeLabel(evidences),
    extension: "MULTI",
    mimeType: "video/*",
    uploadAtLabel: first.uploadAtLabel,
    resolutionLabel: "여러 파일",
    comment: "여러 영상 파일을 묶어 분석합니다.",
  }
}

function formatTotalSizeLabel(evidences: SelectedEvidence[]) {
  return formatBytes(evidences.reduce((sum, item) => sum + item.sizeBytes, 0))
}

function validateVideoFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  const isSupportedExtension = SUPPORTED_VIDEO_EXTENSIONS.includes(extension)
  const isVideoMimeType = file.type.startsWith("video/") || file.type === ""

  if (!isSupportedExtension || !isVideoMimeType) {
    throw new Error("지원하지 않는 파일 형식입니다. MP4 또는 MOV 영상 파일만 업로드할 수 있습니다.")
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("파일 용량이 2GB를 초과했습니다. 2GB 이하의 영상 파일을 업로드해 주세요.")
  }
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()
  return extension ? extension.toUpperCase() : "UNKNOWN"
}

function formatDateTimeLabel(value: number) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}.${month}.${day} ${hours}:${minutes}`
}
