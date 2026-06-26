"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type DragEvent } from "react"

import { AnalysisCancelledPanel } from "./analysis-cancelled-panel"
import { AnalysisProgressPanel } from "./analysis-progress-panel"
import { MediaMetadataPreviewContent } from "./media-metadata-preview"
import { UploadStep } from "./upload-step"
import { getApiErrorMessage } from "@/lib/api/errors"
import {
  fetchAnalysisStatus,
  startEvidenceAnalysis,
  uploadEvidence,
} from "@/lib/evidence-api"
import { features } from "@/lib/features"
import { formatDateTime, formatFileSize } from "@/lib/formatters"
import { buildCaseDetailPath } from "@/lib/route-params"

type AnalysisStep = "upload" | "analyzing" | "cancelled"

export type SelectedEvidence = {
  name: string
  sizeBytes: number
  sizeLabel: string
  extension: string
  mimeType: string
  previewUrl?: string
  uploadAtLabel: string
  resolutionLabel: string
  comment: string
  evidenceId?: number
  hashValue?: string
}

type UploadItem = {
  file: File
  display: SelectedEvidence
  evidenceId?: number
}

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

export function AnalysisRequestFlow() {
  const router = useRouter()
  const [step, setStep] = useState<AnalysisStep>("upload")
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0)
  const [caseName, setCaseName] = useState("")
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [progress, setProgress] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadItemsRef = useRef<UploadItem[]>([])

  const evidences = uploadItems.map((item) => item.display)

  useEffect(() => {
    uploadItemsRef.current = uploadItems
  }, [uploadItems])

  useEffect(() => {
    return () => {
      revokeEvidencePreviewUrls(uploadItemsRef.current)
    }
  }, [])

  useEffect(() => {
    if (step !== "analyzing") return

    const evidenceIds = uploadItems
      .map((item) => item.evidenceId)
      .filter((id): id is number => typeof id === "number")

    if (evidenceIds.length === 0) return

    let cancelled = false

    const pollStatuses = async () => {
      const statuses = await Promise.all(
        evidenceIds.map((id) => fetchAnalysisStatus(id).catch(() => null))
      )

      if (cancelled) return

      const valid = statuses.filter(
        (status): status is NonNullable<typeof status> => status !== null
      )

      if (valid.length === 0) {
        setAnalysisError("분석 상태를 확인하지 못했습니다.")
        return
      }

      const avgProgress =
        valid.reduce((sum, status) => sum + status.progressPercent, 0) / valid.length
      setProgress(45 + Math.round(avgProgress * 0.55))

      if (valid.some((status) => status.status === "FAILED")) {
        setAnalysisError("분석 중 오류가 발생했습니다. 다시 시도해 주세요.")
        setStep("upload")
        return
      }

      if (valid.every((status) => status.status === "COMPLETED")) {
        setProgress(100)
        const firstEvidenceId = valid[0]?.evidenceId
        if (firstEvidenceId) {
          // 사건명 인코딩 이슈를 피하기 위해 증거 ID로 먼저 이동한 뒤 사건 상세로 리다이렉트한다.
          router.push(`/evidences/${encodeURIComponent(String(firstEvidenceId))}`)
        }
      }
    }

    void pollStatuses()

    // 분 단위 작업이라 4초 간격으로 폴링하고, 탭이 숨겨지면 요청을 멈춘다.
    const interval = window.setInterval(() => {
      if (document.hidden) return
      void pollStatuses()
    }, 4000)

    // 탭이 다시 보이면 즉시 한 번 최신 상태를 받아온다.
    function handleVisibilityChange() {
      if (!document.hidden) void pollStatuses()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router, step, uploadItems, caseName])

  useEffect(() => {
    if (activeEvidenceIndex < evidences.length) return
    setActiveEvidenceIndex(Math.max(0, evidences.length - 1))
  }, [activeEvidenceIndex, evidences.length])

  function handleFileChange(files: FileList | null) {
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return
    const nextItems: UploadItem[] = []

    try {
      for (const file of selectedFiles) {
        nextItems.push({
          file,
          display: buildEvidenceFromFile(file),
        })
      }
      setUploadItems((current) => {
        revokeEvidencePreviewUrls(current)
        return nextItems
      })
      setActiveEvidenceIndex(0)
      setUploadMessage({
        type: "success",
        text: `${nextItems.length}개 파일이 선택되었습니다. 사건명을 입력한 뒤 분석을 시작하세요.`,
      })
    } catch (error) {
      revokeEvidencePreviewUrls(nextItems)
      setUploadItems((current) => {
        revokeEvidencePreviewUrls(current)
        return []
      })
      setActiveEvidenceIndex(0)
      setUploadMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "파일 선택에 실패했습니다. 다시 시도해 주세요.",
      })
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    handleFileChange(event.dataTransfer.files)
  }

  async function startAnalysis() {
    if (uploadItems.length === 0 || !caseName.trim()) return

    setAnalysisError(null)
    setUploadMessage(null)
    setStep("analyzing")
    setProgress(8)

    try {
      const uploadedItems: UploadItem[] = []

      for (let index = 0; index < uploadItems.length; index += 1) {
        const item = uploadItems[index]
        const result = await uploadEvidence(item.file, caseName.trim())
        uploadedItems.push({
          file: item.file,
          evidenceId: result.evidenceId,
          display: {
            ...item.display,
            evidenceId: result.evidenceId,
            hashValue: result.hashValue,
            uploadAtLabel: formatDateTimeLabel(Date.now()),
            resolutionLabel: formatMetadataResolution(result.metadata),
          },
        })
        setProgress(10 + Math.round(((index + 1) / uploadItems.length) * 30))
      }

      const evidenceIds = uploadedItems
        .map((item) => item.evidenceId)
        .filter((id): id is number => typeof id === "number")

      if (features.uploadOnlyMode) {
        setUploadItems(uploadedItems)
        setProgress(100)
        const firstEvidenceId = evidenceIds[0]
        if (firstEvidenceId) {
          window.setTimeout(() => router.push(buildCaseDetailPath(caseName, firstEvidenceId)), 350)
        } else {
          setStep("upload")
          setUploadMessage({
            type: "success",
            text: `${uploadedItems.length}개 파일 업로드 확인 완료. 로컬 업로드 전용 모드라 분석 요청은 보내지 않았습니다.`,
          })
        }
        return
      }

      await startEvidenceAnalysis(evidenceIds, caseName.trim())
      setUploadItems(uploadedItems)
      setProgress(42)
    } catch (error) {
      const message = getApiErrorMessage(error, "분석 요청에 실패했습니다.")

      setStep("upload")
      setUploadMessage({ type: "error", text: message })
    }
  }

  function removeEvidence(index: number) {
    setUploadItems((current) => {
      revokeEvidencePreviewUrls(current.filter((_, currentIndex) => currentIndex === index))
      const next = current.filter((_, currentIndex) => currentIndex !== index)
      if (next.length === 0) {
        setUploadMessage(null)
      } else {
        setUploadMessage({
          type: "success",
          text: `${next.length}개 파일이 선택되었습니다. 사건명을 입력한 뒤 분석을 시작하세요.`,
        })
      }
      return next
    })
  }

  function updateEvidenceComment(index: number, comment: string) {
    setUploadItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? { ...item, display: { ...item.display, comment } }
          : item
      )
    )
  }

  function resetAnalysis() {
    setStep("upload")
    setProgress(0)
    setUploadItems((current) => {
      revokeEvidencePreviewUrls(current)
      return []
    })
    setActiveEvidenceIndex(0)
    setCaseName("")
    setUploadMessage(null)
    setAnalysisError(null)
  }

  function cancelAnalysis() {
    setStep("cancelled")
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
          totalSizeLabel={formatTotalSizeLabel(evidences)}
          metadataPreview={
            <MediaMetadataPreview
              evidences={evidences}
              activeIndex={activeEvidenceIndex}
              onNext={() =>
                setActiveEvidenceIndex((current) =>
                  evidences.length === 0 ? 0 : (current + 1) % evidences.length
                )
              }
              onCommentChange={(comment) => updateEvidenceComment(activeEvidenceIndex, comment)}
            />
          }
          fileInputRef={fileInputRef}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
          onCaseNameChange={setCaseName}
          onRemoveFile={removeEvidence}
          onSelectEvidence={setActiveEvidenceIndex}
          onStart={startAnalysis}
        />
      ) : step === "analyzing" ? (
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <Breadcrumb />
          <AnalysisProgressPanel
            evidence={analysisEvidence}
            progress={progress}
            errorMessage={analysisError}
            onCancel={cancelAnalysis}
          />
        </div>
      ) : step === "cancelled" ? (
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <Breadcrumb />
          <AnalysisCancelledPanel
            evidence={analysisEvidence}
            progress={progress}
            onRestart={startAnalysis}
          />
        </div>
      ) : null}
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

function MediaMetadataPreview({
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
  const [previewEvidence, setPreviewEvidence] = useState<SelectedEvidence | null>(null)

  return (
    <MediaMetadataPreviewContent
      evidences={evidences}
      activeIndex={activeIndex}
      activeTab={activeTab}
      previewEvidence={previewEvidence}
      onNext={onNext}
      onCommentChange={onCommentChange}
      onTabChange={setActiveTab}
      onOpenPreview={setPreviewEvidence}
      onClosePreview={() => setPreviewEvidence(null)}
    />
  )
}

function formatBytes(bytes: number) {
  return formatFileSize(bytes, {
    zeroLabel: "0 B",
    maxUnit: "GB",
  })
}

function buildEvidenceFromFile(file: File): SelectedEvidence {
  validateVideoFile(file)

  return {
    name: file.name,
    sizeBytes: file.size,
    sizeLabel: formatBytes(file.size),
    extension: getFileExtension(file.name),
    mimeType: file.type || "video/*",
    previewUrl: URL.createObjectURL(file),
    uploadAtLabel: formatDateTimeLabel(Date.now()),
    resolutionLabel: "분석 전",
    comment: "업로드된 영상입니다. 분석 요청 후 코멘트를 남길 수 있습니다.",
  }
}

function revokeEvidencePreviewUrls(items: UploadItem[]) {
  for (const item of items) {
    if (item.display.previewUrl) {
      URL.revokeObjectURL(item.display.previewUrl)
    }
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

}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()
  return extension ? extension.toUpperCase() : "UNKNOWN"
}

function formatDateTimeLabel(value: number) {
  return formatDateTime(value)
}

function formatMetadataResolution(
  metadata: import("@/lib/evidence-api").MediaMetadata | string | null
) {
  if (!metadata || typeof metadata === "string") return "분석 전"
  if (metadata.width && metadata.height) {
    return `${metadata.width.toLocaleString("ko-KR")} x ${metadata.height.toLocaleString("ko-KR")}`
  }
  return "분석 전"
}
