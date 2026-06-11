"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  UploadCloud,
  AudioLines,
  Video,
  ImageIcon,
  FileSearch,
  X,
  ShieldQuestion,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AnalysisStatusBadge } from "@/components/analysis-status-badge"
import type { AnalysisStatus } from "@/lib/analysis-status"
import { fetchMyAnalysisHistory } from "@/lib/api/mypage"
import type { CaseSummary } from "@/app/mypage/_types/case"
import {
  fetchCaseDetail,
  type CaseEvidenceSummary,
} from "@/lib/api/evidence-detail"
import {
  cancelAnalysis,
  fetchAnalysisStatus,
  startEvidenceAnalysis,
  uploadEvidence,
  type UploadResult,
} from "@/lib/evidence-api"
import { ApiError } from "@/lib/api-client"
import {
  clearMainUploadPanelSession,
  createPlaceholderFile,
  loadMainUploadPanelSession,
  saveMainUploadPanelSession,
} from "@/lib/main-upload-panel-storage"
import {
  fileFingerprint,
  type MetadataDisplayItem,
} from "@/lib/metadata-types"

type MediaKind = "all" | "audio" | "video" | "image"
type CaseMode = "new" | "existing"
type UploadStatus = "idle" | "uploading" | "completed" | "error" | "analyzing"

type FileUploadState = {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  result?: UploadResult
  errorMessage?: string
  analysisStatus?: AnalysisStatus
  analysisProgress?: number
}

const acceptMap: Record<MediaKind, string> = {
  all: "audio/*,video/*,image/*",
  audio: "audio/*",
  video: "video/*",
  image: "image/*",
}

const tabs: { value: MediaKind; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "전체", icon: FileSearch },
  { value: "image", label: "이미지", icon: ImageIcon },
  { value: "video", label: "영상", icon: Video },
  { value: "audio", label: "음성", icon: AudioLines },
]

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function kindFromType(type: string): MediaKind {
  if (type.startsWith("audio")) return "audio"
  if (type.startsWith("video")) return "video"
  if (type.startsWith("image")) return "image"
  return "all"
}

const kindIcon: Record<MediaKind, React.ElementType> = {
  all: FileSearch,
  audio: AudioLines,
  video: Video,
  image: ImageIcon,
}

type UploadPanelProps = {
  onMetadataChange?: (items: MetadataDisplayItem[]) => void
  onAnalyzeComplete?: (results: UploadResult[], startedCount: number) => void
}

function buildMetadataItems(fileStates: FileUploadState[]): MetadataDisplayItem[] {
  return fileStates.flatMap((state, index) => {
    if (state.status === "pending" || state.status === "uploading") {
      return [
        {
          id: `pending-${fileFingerprint(state.file)}-${index}`,
          phase: "pending" as const,
          fileName: state.file.name,
          fileSize: state.file.size,
        },
      ]
    }

    if (state.result) {
      return [
        {
          id: `uploaded-${state.result.evidenceId}`,
          phase: "uploaded" as const,
          upload: state.result,
          analysisStatus: state.analysisStatus ?? state.result.analysisStatus,
        },
      ]
    }

    return []
  })
}

function getFileStatusLabel(item: FileUploadState): string {
  if (item.status === "pending") return "업로드 대기 중"
  if (item.status === "uploading") return "업로드 진행 중..."
  if (item.status === "error") return item.errorMessage ?? "업로드 실패"
  if (item.analysisStatus === "PENDING") return "분석 대기"
  if (item.analysisStatus === "PROCESSING") return `분석 중 (${item.analysisProgress ?? 0}%)`
  if (item.analysisStatus === "COMPLETED") return "분석 완료"
  if (item.analysisStatus === "FAILED") return "분석 실패"
  return "업로드 완료"
}

function dedupeResultsByHash(results: UploadResult[]): UploadResult[] {
  const seen = new Set<string>()
  return results.filter((item) => {
    if (seen.has(item.hashValue)) return false
    seen.add(item.hashValue)
    return true
  })
}

function isStoppableAnalysis(item: FileUploadState): boolean {
  return (
    item.status === "success" &&
    !!item.result &&
    (item.analysisStatus === "PENDING" || item.analysisStatus === "PROCESSING")
  )
}

function getStoppableAnalysisEvidenceIds(fileStates: FileUploadState[]): number[] {
  return fileStates
    .filter(isStoppableAnalysis)
    .map((item) => item.result!.evidenceId)
}

function normalizeEvidenceAnalysisStatus(status: string): AnalysisStatus {
  if (status === "PROCESSING" || status === "COMPLETED" || status === "FAILED") {
    return status
  }

  return "PENDING"
}

function isExistingEvidenceSelectable(evidence: CaseEvidenceSummary): boolean {
  const status = normalizeEvidenceAnalysisStatus(evidence.analysisStatus)
  return status !== "PROCESSING" && status !== "COMPLETED"
}

export function UploadPanel({ onMetadataChange, onAnalyzeComplete }: UploadPanelProps) {
  const [kind, setKind] = useState<MediaKind>("all")
  const [isDragging, setIsDragging] = useState(false)
  const [fileStates, setFileStates] = useState<FileUploadState[]>([])
  const [caseName, setCaseName] = useState("")
  const [caseMode, setCaseMode] = useState<CaseMode>("new")
  const [existingCases, setExistingCases] = useState<CaseSummary[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState("")
  const [selectedCaseEvidences, setSelectedCaseEvidences] = useState<CaseEvidenceSummary[]>([])
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<number[]>([])
  const [isLoadingCases, setIsLoadingCases] = useState(false)
  const [isLoadingCaseEvidences, setIsLoadingCaseEvidences] = useState(false)
  const [caseListError, setCaseListError] = useState("")
  const [caseEvidenceError, setCaseEvidenceError] = useState("")
  const [caseActionMessage, setCaseActionMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [globalError, setGlobalError] = useState("")
  const [hasUploadedOnce, setHasUploadedOnce] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const session = loadMainUploadPanelSession()
    if (session) {
      setCaseName(session.caseName)
      setCaseMode(session.caseMode ?? "new")
      setSelectedCaseId(session.selectedCaseId ?? "")
      setHasUploadedOnce(session.hasUploadedOnce)
      if (session.entries.length > 0) {
        setFileStates(
          session.entries.map((entry) => ({
            file: createPlaceholderFile(entry.result),
            status: "success" as const,
            result: entry.result,
            analysisStatus: entry.analysisStatus,
            analysisProgress: entry.analysisProgress,
          }))
        )
        setStatus("completed")

        const evidenceIds = session.entries
          .filter(
            (entry) =>
              entry.analysisStatus === "PENDING" ||
              entry.analysisStatus === "PROCESSING"
          )
          .map((entry) => entry.result.evidenceId)

        if (evidenceIds.length > 0) {
          void (async () => {
            const statuses = await Promise.all(
              evidenceIds.map((id) => fetchAnalysisStatus(id).catch(() => null))
            )

            setFileStates((prev) =>
              prev.map((entry) => {
                if (!entry.result) return entry
                const statusUpdate = statuses.find(
                  (item) => item?.evidenceId === entry.result!.evidenceId
                )
                if (!statusUpdate) return entry

                return {
                  ...entry,
                  analysisStatus: statusUpdate.status,
                  analysisProgress: statusUpdate.progressPercent,
                  result: {
                    ...entry.result,
                    analysisStatus: statusUpdate.status,
                  },
                }
              })
            )
          })()
        }
      }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCases = async () => {
      setIsLoadingCases(true)
      setCaseListError("")

      try {
        const response = await fetchMyAnalysisHistory({
          sort: "newest",
          page: 0,
          size: 50,
        })
        const cases = response.content ?? []

        if (!cancelled) {
          setExistingCases(cases)

          const params = new URLSearchParams(window.location.search)
          const caseIdFromUrl = params.get("caseId")
          const caseNameFromUrl = params.get("caseName")

          if (caseIdFromUrl || caseNameFromUrl) {
            const selected = cases.find(
              (item) =>
                item.caseId === caseIdFromUrl ||
                item.caseName === caseNameFromUrl
            )

            setCaseMode("existing")
            setSelectedCaseId(selected?.caseId ?? caseIdFromUrl ?? "")
            setCaseName(selected?.caseName ?? caseNameFromUrl ?? "")
          }
        }
      } catch {
        if (!cancelled) {
          setCaseListError("기존 사건 목록을 불러오지 못했습니다.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCases(false)
        }
      }
    }

    void loadCases()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    onMetadataChange?.(buildMetadataItems(fileStates))
  }, [fileStates, onMetadataChange])

  useEffect(() => {
    const activeCaseKey = selectedCaseId || caseName.trim()

    if (caseMode !== "existing" || !activeCaseKey) {
      setSelectedCaseEvidences([])
      setSelectedEvidenceIds([])
      setCaseEvidenceError("")
      return
    }

    let cancelled = false

    const loadCaseEvidences = async () => {
      setIsLoadingCaseEvidences(true)
      setCaseEvidenceError("")
      setCaseActionMessage("")

      try {
        const response = await fetchCaseDetail(activeCaseKey)
        if (!cancelled) {
          setSelectedCaseEvidences(response.evidences ?? [])
          setSelectedEvidenceIds([])
        }
      } catch {
        if (!cancelled) {
          setSelectedCaseEvidences([])
          setSelectedEvidenceIds([])
          setCaseEvidenceError("선택한 사건의 증거 목록을 불러오지 못했습니다.")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCaseEvidences(false)
        }
      }
    }

    void loadCaseEvidences()

    return () => {
      cancelled = true
    }
  }, [caseMode, selectedCaseId, caseName])

  const stoppableEvidenceIds = getStoppableAnalysisEvidenceIds(fileStates)
  const pollingKey = stoppableEvidenceIds.join(",")

  useEffect(() => {
    if (!hydrated) return

    const entries = fileStates
      .filter((item) => item.status === "success" && item.result)
      .map((item) => ({
        result: item.result!,
        analysisStatus: item.analysisStatus,
        analysisProgress: item.analysisProgress,
      }))

    saveMainUploadPanelSession({
      caseName,
      entries,
      hasUploadedOnce,
      caseMode,
      selectedCaseId,
    })
  }, [fileStates, caseName, caseMode, selectedCaseId, hasUploadedOnce, hydrated])

  useEffect(() => {
    if (!pollingKey) return

    const pollStatuses = async () => {
      const evidenceIds = pollingKey.split(",").map(Number)
      const statuses = await Promise.all(
        evidenceIds.map((id) =>
          fetchAnalysisStatus(id).catch(() => null)
        )
      )

      setFileStates((prev) =>
        prev.map((entry) => {
          if (!entry.result) return entry
          const statusUpdate = statuses.find(
            (item) => item?.evidenceId === entry.result!.evidenceId
          )
          if (!statusUpdate) return entry

          return {
            ...entry,
            analysisStatus: statusUpdate.status,
            analysisProgress: statusUpdate.progressPercent,
            result: {
              ...entry.result,
              analysisStatus: statusUpdate.status,
            },
          }
        })
      )
    }

    void pollStatuses()
    const interval = setInterval(() => {
      void pollStatuses()
    }, 1500)

    return () => clearInterval(interval)
  }, [pollingKey])

  const files = fileStates.map((item) => item.file)
  const isBusy = status === "uploading" || isCancelling
  const hasPendingFiles = fileStates.some((item) => item.status === "pending")
  const trimmedCaseName = caseName.trim()
  const hasSelectedExistingCase = caseMode === "new" || selectedCaseId.length > 0
  const canUpload =
    hasPendingFiles &&
    trimmedCaseName.length > 0 &&
    hasSelectedExistingCase &&
    status !== "uploading" &&
    status !== "analyzing"

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return

    const existingKeys = new Set(fileStates.map((item) => fileFingerprint(item.file)))
    const rejected: string[] = []
    const incoming: FileUploadState[] = []

    for (const file of Array.from(list)) {
      const key = fileFingerprint(file)
      if (existingKeys.has(key)) {
        rejected.push(file.name)
        continue
      }
      existingKeys.add(key)
      incoming.push({ file, status: "pending" })
    }

    if (rejected.length > 0) {
      setGlobalError(
        `이미 목록에 있는 동일 파일은 추가할 수 없습니다: ${rejected.join(", ")}`
      )
    } else if (incoming.length > 0) {
      setGlobalError("")
    }

    if (incoming.length === 0) return

    setFileStates((prev) => [...prev, ...incoming])

    if (status === "completed" || status === "error") {
      setStatus("idle")
      setProgress(0)
    }
  }, [fileStates, status])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const removeFile = (index: number) => {
    setFileStates((prev) => prev.filter((_, i) => i !== index))
    if (fileStates.length <= 1) {
      setStatus("idle")
      setProgress(0)
      setGlobalError("")
    }
  }

  const cancelAnalysisFile = async (index: number) => {
    const target = fileStates[index]
    if (!isStoppableAnalysis(target) || !target.result) return

    const confirmed = window.confirm(
      `"${target.file.name}" 분석을 중단하시겠습니까?\n원본 파일은 유지됩니다.`
    )
    if (!confirmed) return

    setIsCancelling(true)
    setGlobalError("")

    try {
      await cancelAnalysis(target.result.evidenceId)
      setFileStates((prev) =>
        prev.map((entry, idx) => {
          if (idx !== index || !entry.result) return entry
          return {
            ...entry,
            analysisStatus: undefined,
            analysisProgress: undefined,
            result: {
              ...entry.result,
              analysisStatus: undefined,
            },
          }
        })
      )
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "분석 중단에 실패했습니다."
      setGlobalError(message)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleUpload = async () => {
    const pendingIndices = fileStates
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === "pending")

    if (pendingIndices.length === 0) return
    if (caseMode === "existing" && !selectedCaseId) {
      setGlobalError("기존 사건을 선택해 주세요.")
      return
    }
    if (!trimmedCaseName) {
      setGlobalError("사건명을 입력해 주세요.")
      return
    }

    setStatus("uploading")
    setProgress(0)
    setGlobalError("")

    setFileStates((prev) =>
      prev.map((entry) =>
        entry.status === "pending"
          ? { ...entry, status: "uploading" as const, errorMessage: undefined }
          : entry
      )
    )

    const completed: UploadResult[] = []
    let hasError = false

    for (let i = 0; i < pendingIndices.length; i++) {
      const { item, index } = pendingIndices[i]
      try {
        const result = await uploadEvidence(item.file, trimmedCaseName)
        completed.push(result)

        setFileStates((prev) =>
          prev.map((entry, idx) =>
            idx === index ? { ...entry, status: "success", result } : entry
          )
        )
      } catch (error) {
        hasError = true
        const message =
          error instanceof ApiError
            ? error.message
            : "파일 업로드에 실패했습니다."

        setFileStates((prev) =>
          prev.map((entry, idx) =>
            idx === index ? { ...entry, status: "error", errorMessage: message } : entry
          )
        )
      }

      setProgress(Math.round(((i + 1) / pendingIndices.length) * 100))
    }

    if (completed.length > 0) {
      setHasUploadedOnce(true)
    }

    setStatus(hasError && completed.length === 0 ? "error" : "completed")
    if (hasError && completed.length === 0) {
      setGlobalError("모든 파일 업로드에 실패했습니다.")
    }
  }

  const analyzableResults = fileStates.filter(
    (item) => item.status === "success" && item.result && !item.analysisStatus
  )

  const canAnalyze =
    analyzableResults.length > 0 &&
    trimmedCaseName.length > 0 &&
    hasSelectedExistingCase &&
    !isBusy

  const handleAnalyze = async () => {
    const targets = fileStates.filter(
      (item) => item.status === "success" && item.result && !item.analysisStatus
    )
    if (targets.length === 0) return

    if (caseMode === "existing" && !selectedCaseId) {
      setGlobalError("기존 사건을 선택해 주세요.")
      return
    }

    if (!trimmedCaseName) {
      setGlobalError("분석을 시작하려면 사건명을 입력해 주세요.")
      return
    }

    const uniqueResults = dedupeResultsByHash(
      targets.map((item) => item.result!).filter(Boolean)
    )
    const evidenceIds = uniqueResults.map((item) => item.evidenceId)

    setGlobalError("")

    try {
      const response = await startEvidenceAnalysis(evidenceIds, trimmedCaseName)
      const startedIds = new Set(response.evidenceIds)

      setFileStates((prev) =>
        prev.map((entry) => {
          if (!entry.result || !startedIds.has(entry.result.evidenceId)) {
            return entry
          }
          return {
            ...entry,
            analysisStatus: "PENDING" as const,
            analysisProgress: 0,
            result: {
              ...entry.result,
              caseName: trimmedCaseName,
              analysisStatus: "PENDING" as const,
            },
          }
        })
      )

      if (response.startedCount > 0) {
        const analyzedResults = uniqueResults.map((item) => ({
          ...item,
          caseName: trimmedCaseName,
          uploadedAt: new Date().toISOString(),
          analysisStatus: "PENDING" as const,
        }))
        onAnalyzeComplete?.(analyzedResults, response.startedCount)
      }

      setStatus("completed")
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "분석 요청에 실패했습니다."
      setGlobalError(message)

      setFileStates((prev) =>
        prev.map((entry) => {
          if (!entry.result || !evidenceIds.includes(entry.result.evidenceId)) {
            return entry
          }
          return {
            ...entry,
            analysisStatus: "FAILED" as const,
            result: {
              ...entry.result,
              analysisStatus: "FAILED" as const,
            },
          }
        })
      )

      setStatus("completed")
    }
  }

  const toggleExistingEvidence = (evidenceId: number) => {
    setSelectedEvidenceIds((prev) =>
      prev.includes(evidenceId)
        ? prev.filter((id) => id !== evidenceId)
        : [...prev, evidenceId]
    )
    setCaseActionMessage("")
    setGlobalError("")
  }

  const handleAnalyzeSelectedEvidences = async () => {
    if (caseMode !== "existing") return
    if (!selectedCaseId) {
      setGlobalError("기존 사건을 선택해 주세요.")
      return
    }
    if (!trimmedCaseName) {
      setGlobalError("분석을 시작하려면 사건명을 입력해 주세요.")
      return
    }
    if (selectedEvidenceIds.length === 0) {
      setGlobalError("분석할 증거를 선택해 주세요.")
      return
    }

    setGlobalError("")
    setCaseActionMessage("")

    try {
      const response = await startEvidenceAnalysis(selectedEvidenceIds, trimmedCaseName)
      const startedIds = new Set(response.evidenceIds)

      setSelectedCaseEvidences((prev) =>
        prev.map((evidence) =>
          startedIds.has(evidence.evidenceId)
            ? { ...evidence, analysisStatus: "PENDING" }
            : evidence
        )
      )
      setSelectedEvidenceIds((prev) => prev.filter((id) => !startedIds.has(id)))

      if (response.startedCount > 0) {
        setCaseActionMessage(`선택한 증거 ${response.startedCount}건의 분석 요청이 등록되었습니다.`)
      } else {
        setCaseActionMessage("새로 등록된 분석 요청이 없습니다. 이미 요청된 증거일 수 있습니다.")
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "분석 요청에 실패했습니다."
      setGlobalError(message)
    }
  }

  const startNewCase = () => {
    if (fileStates.length > 0) {
      const confirmed = window.confirm(
        "현재 화면의 작업 목록만 비우고 새 사건을 시작합니다.\n이미 업로드되었거나 분석 요청된 기록은 마이페이지와 상세 페이지에 보존됩니다."
      )
      if (!confirmed) return
    }

    clearMainUploadPanelSession()
    setFileStates([])
    setCaseName("")
    setCaseMode("new")
    setSelectedCaseId("")
    setStatus("idle")
    setProgress(0)
    setGlobalError("")
    setHasUploadedOnce(false)
  }

  const uploadButtonLabel = hasUploadedOnce ? "추가 업로드" : "업로드 시작"
  const pendingCount = fileStates.filter((item) => item.status === "pending").length
  const hasAnalyzedFiles = fileStates.some((item) => item.analysisStatus)
  const displayedSuccessStates = fileStates.filter(
    (item) => item.status === "success" && item.result
  )
  const selectableExistingEvidenceCount = selectedCaseEvidences.filter(isExistingEvidenceSelectable).length
  const uploadDisabledTitle =
    caseMode === "existing" && !selectedCaseId
      ? "기존 사건을 선택해 주세요."
      : !trimmedCaseName
        ? "사건명을 입력해 주세요."
        : undefined

  const changeCaseMode = (value: CaseMode) => {
    setCaseMode(value)
    setGlobalError("")

    if (value === "new") {
      setSelectedCaseId("")
      return
    }

    if (selectedCaseId) {
      const selected = existingCases.find((item) => item.caseId === selectedCaseId)
      if (selected) {
        setCaseName(selected.caseName)
      }
    } else {
      setCaseName("")
    }
  }

  const selectExistingCase = (value: string) => {
    setSelectedCaseId(value)
    const selected = existingCases.find((item) => item.caseId === value)
    setCaseName(selected?.caseName ?? "")
    setGlobalError("")
  }

  return (
    <section
      id="analyze"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-label="파일 업로드"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            증거 파일 업로드
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            분석할 음성·영상·이미지 파일을 업로드하면 SHA-256 해시와 메타데이터가 서버에 저장됩니다.
          </p>
        </div>
        <Tabs value={kind} onValueChange={(v) => setKind(v as MediaKind)}>
          <TabsList className="bg-secondary">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs">
                <t.icon className="size-3.5" aria-hidden="true" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-4 space-y-3">
        <Tabs value={caseMode} onValueChange={(v) => changeCaseMode(v as CaseMode)}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="new" className="gap-1.5 text-xs">
              <Plus className="size-3.5" aria-hidden="true" />
              새 사건
            </TabsTrigger>
            <TabsTrigger value="existing" className="gap-1.5 text-xs">
              <FolderOpen className="size-3.5" aria-hidden="true" />
              기존 사건
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-3 space-y-1.5">
            <Label htmlFor="caseName" className="text-xs text-muted-foreground">
              사건명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="caseName"
              value={caseName}
              onChange={(e) => {
                setCaseName(e.target.value)
                setSelectedCaseId("")
                if (globalError.includes("사건명")) {
                  setGlobalError("")
                }
              }}
              placeholder="예: 2026-서울-0123 딥페이크 유포 사건"
              disabled={isBusy}
              required
              aria-required="true"
              className="h-9 max-w-md"
            />
            <p className="text-[11px] text-muted-foreground">
              새 사건으로 증거를 등록합니다. 업로드와 분석 시작에 사건명이 필수입니다.
            </p>
          </TabsContent>

          <TabsContent value="existing" className="mt-3 space-y-1.5">
            <Label htmlFor="existingCase" className="text-xs text-muted-foreground">
              기존 사건 <span className="text-destructive">*</span>
            </Label>
            <select
              id="existingCase"
              value={selectedCaseId}
              onChange={(e) => selectExistingCase(e.target.value)}
              disabled={isBusy || isLoadingCases || existingCases.length === 0}
              className="h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-required="true"
            >
              <option value="">
                {isLoadingCases
                  ? "사건 목록을 불러오는 중..."
                  : existingCases.length === 0
                    ? "선택 가능한 기존 사건이 없습니다"
                    : "기존 사건을 선택하세요"}
              </option>
              {existingCases.map((item) => (
                <option key={item.caseId} value={item.caseId}>
                  {item.caseName} ({item.evidenceCount}건)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              선택한 사건에 증거를 추가합니다. 사건 상세와 내 분석 기록에 같은 사건으로 묶입니다.
            </p>
            {caseListError && (
              <p className="text-[11px] text-destructive">{caseListError}</p>
            )}

            {selectedCaseId && (
              <div className="mt-4 max-w-3xl rounded-lg border border-border bg-background/60 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">기존 증거 선택</h3>
                    <p className="text-[11px] text-muted-foreground">
                      선택한 사건에 등록된 증거를 바로 분석 요청할 수 있습니다. 아래 드롭존으로 새 증거도 추가할 수 있습니다.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedEvidenceIds.length === 0 || isBusy}
                    onClick={() => void handleAnalyzeSelectedEvidences()}
                    className="gap-1.5"
                  >
                    <FileSearch className="size-3.5" />
                    선택 증거 분석 ({selectedEvidenceIds.length})
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {isLoadingCaseEvidences ? (
                    <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      증거 목록을 불러오는 중입니다.
                    </div>
                  ) : caseEvidenceError ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                      {caseEvidenceError}
                    </p>
                  ) : selectedCaseEvidences.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      이 사건에 등록된 증거가 없습니다. 아래에서 새 증거를 업로드하세요.
                    </div>
                  ) : (
                    <ul className="max-h-52 space-y-2 overflow-y-auto pr-1" aria-label="기존 사건 증거 목록">
                      {selectedCaseEvidences.map((evidence) => {
                        const status = normalizeEvidenceAnalysisStatus(evidence.analysisStatus)
                        const selectable = isExistingEvidenceSelectable(evidence)
                        const checked = selectedEvidenceIds.includes(evidence.evidenceId)
                        return (
                          <li
                            key={evidence.evidenceId}
                            className={cn(
                              "flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5",
                              checked && "border-primary/50 bg-primary/5",
                              !selectable && "opacity-70"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!selectable || isBusy}
                              onChange={() => toggleExistingEvidence(evidence.evidenceId)}
                              className="size-4 rounded border-border"
                              aria-label={`${evidence.fileName} 선택`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {evidence.fileName}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                EV-{evidence.evidenceId}
                                {evidence.mediaType ? ` · ${evidence.mediaType}` : ""}
                              </p>
                            </div>
                            <AnalysisStatusBadge status={status} className="h-5 px-1.5" />
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {caseActionMessage && (
                  <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
                    {caseActionMessage}
                  </p>
                )}
                {selectableExistingEvidenceCount === 0 && selectedCaseEvidences.length > 0 && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    현재 선택 가능한 증거가 없습니다. 분석 진행 중이거나 완료된 증거는 다시 선택하지 않습니다.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !isBusy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isBusy) {
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!isBusy) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-background/40 hover:border-primary/50 hover:bg-accent/40",
          isBusy && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <UploadCloud className="size-7" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            파일을 이곳에 드래그하거나{" "}
            <span className="text-primary underline underline-offset-4">
              클릭하여 선택
            </span>
            하세요
          </p>
          <p className="text-xs text-muted-foreground">
            최대 2GB · MP4, MOV, WAV, MP3, JPG, PNG 지원
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptMap[kind]}
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
          disabled={isBusy}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-5 space-y-4">
          <ul className="space-y-2" aria-label="업로드된 파일 목록">
            {fileStates.map((item, i) => {
              const Icon = kindIcon[kindFromType(item.file.type)]
              return (
                <li
                  key={`${item.file.name}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.file.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatBytes(item.file.size)} · {getFileStatusLabel(item)}
                    </p>
                  </div>
                  {!isBusy && item.status !== "success" && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="목록에서 제거"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {status === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-primary">서버에 파일 업로드 중...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {globalError && (
            <p className="text-sm text-destructive">{globalError}</p>
          )}

          {displayedSuccessStates.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                {hasAnalyzedFiles
                  ? `분석 현황 (${displayedSuccessStates.length}건)`
                  : `업로드 완료 (${displayedSuccessStates.length}건)`}
              </h3>
              {fileStates.map((item, fileIndex) => {
                if (item.status !== "success" || !item.result) return null

                const res = item.result
                const successIndex = displayedSuccessStates.findIndex(
                  (entry) => entry.result?.evidenceId === res.evidenceId
                )

                return (
                  <div
                    key={res.evidenceId}
                    className="animate-in fade-in slide-in-from-top-2 rounded-lg border border-primary/20 bg-primary/5 p-4 duration-500"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <span className="text-xs font-bold">{successIndex + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="max-w-[200px] truncate text-sm font-semibold text-foreground sm:max-w-xs">
                            {res.fileName}
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            증거 ID: {res.evidenceId}
                            {res.caseName ? ` · ${res.caseName}` : ""}
                          </p>
                          <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                            {res.hashAlgorithm}: {res.hashValue.slice(0, 16)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {item.analysisStatus === "PENDING" ? (
                          <AnalysisStatusBadge status="PENDING" />
                        ) : item.analysisStatus === "PROCESSING" ? (
                          <AnalysisStatusBadge status="PROCESSING" />
                        ) : item.analysisStatus === "COMPLETED" ? (
                          <AnalysisStatusBadge status="COMPLETED" />
                        ) : item.analysisStatus === "FAILED" ? (
                          <AnalysisStatusBadge status="FAILED" />
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            업로드 완료
                          </Badge>
                        )}
                        {isStoppableAnalysis(item) && !isBusy && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                            onClick={() => void cancelAnalysisFile(fileIndex)}
                          >
                            중단
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.analysisStatus === "PROCESSING" && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-medium text-primary">
                          <span>분석 중 ({item.analysisProgress ?? 0}%)</span>
                        </div>
                        <Progress value={item.analysisProgress ?? 0} className="h-2" />
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="mt-3 flex items-center gap-2 border-t border-primary/10 pt-3">
                <AlertTriangle className="size-3.5 text-amber-500" />
                <p className="text-[11px] text-muted-foreground">
                  {hasAnalyzedFiles
                    ? "분석 요청이 등록되었습니다. 분석은 큐에서 순차적으로 진행되며, 기록은 마이페이지와 상세 페이지에 보존됩니다."
                    : "업로드가 완료되었습니다. 사건명을 입력한 뒤 분석 시작을 누르세요. 새 사건 시작은 현재 화면만 비웁니다."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldQuestion className="size-3.5" aria-hidden="true" />
          보안: 모든 데이터는 암호화되어 처리됩니다.
        </p>
        <div className="flex gap-2">
          {(status === "completed" || fileStates.length > 0) && (
            <Button variant="outline" onClick={startNewCase} disabled={isBusy}>
              새 사건 시작
            </Button>
          )}
          {analyzableResults.length > 0 && (
            <Button
              size="lg"
              disabled={!canAnalyze}
              onClick={handleAnalyze}
              className="min-w-[120px] gap-2"
              title={
                caseMode === "existing" && !selectedCaseId
                  ? "기존 사건을 선택해 주세요."
                  : !trimmedCaseName
                    ? "분석을 시작하려면 사건명을 입력해 주세요."
                    : undefined
              }
            >
              <FileSearch className="size-4" aria-hidden="true" />
              분석 시작 ({analyzableResults.length})
            </Button>
          )}
          {hasPendingFiles && (
            <Button
              size="lg"
              disabled={!canUpload}
              onClick={handleUpload}
              className="min-w-[120px] gap-2"
              title={uploadDisabledTitle}
            >
              {status === "uploading" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" aria-hidden="true" />
                  {uploadButtonLabel}
                  {pendingCount > 0 && ` (${pendingCount})`}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
