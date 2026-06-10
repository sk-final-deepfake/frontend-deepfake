"use client"

import type React from "react"
import { useCallback, useRef, useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { uploadEvidence, type UploadResult } from "@/lib/evidence-api"
import { ApiError } from "@/lib/api-client"

type MediaKind = "all" | "audio" | "video" | "image"
type UploadStatus = "idle" | "uploading" | "completed" | "error"

type FileUploadState = {
  file: File
  status: "pending" | "uploading" | "success" | "error"
  result?: UploadResult
  errorMessage?: string
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
  onUploadComplete?: (results: UploadResult[]) => void
}

export function UploadPanel({ onUploadComplete }: UploadPanelProps) {
  const [kind, setKind] = useState<MediaKind>("all")
  const [isDragging, setIsDragging] = useState(false)
  const [fileStates, setFileStates] = useState<FileUploadState[]>([])
  const [caseName, setCaseName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [globalError, setGlobalError] = useState("")

  const files = fileStates.map((item) => item.file)
  const isBusy = status === "uploading"

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list).map((file) => ({
      file,
      status: "pending" as const,
    }))
    setFileStates((prev) => [...prev, ...incoming])
    setGlobalError("")
    if (status === "completed" || status === "error") {
      setStatus("idle")
      setProgress(0)
    }
  }, [status])

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

  const handleUpload = async () => {
    if (files.length === 0) return

    setStatus("uploading")
    setProgress(0)
    setGlobalError("")

    const nextStates = fileStates.map((item) => ({
      ...item,
      status: "uploading" as const,
      errorMessage: undefined,
    }))
    setFileStates(nextStates)

    const completed: UploadResult[] = []
    let hasError = false

    for (let i = 0; i < nextStates.length; i++) {
      const item = nextStates[i]
      try {
        const result = await uploadEvidence(item.file, caseName)
        completed.push(result)

        setFileStates((prev) =>
          prev.map((entry, idx) =>
            idx === i ? { ...entry, status: "success", result } : entry
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
            idx === i ? { ...entry, status: "error", errorMessage: message } : entry
          )
        )
      }

      setProgress(Math.round(((i + 1) / nextStates.length) * 100))
    }

    if (completed.length > 0) {
      onUploadComplete?.(completed)
    }

    setStatus(hasError && completed.length === 0 ? "error" : "completed")
    if (hasError && completed.length === 0) {
      setGlobalError("모든 파일 업로드에 실패했습니다.")
    }
  }

  const successResults = fileStates
    .filter((item) => item.status === "success" && item.result)
    .map((item) => item.result!)

  const reset = () => {
    setFileStates([])
    setCaseName("")
    setStatus("idle")
    setProgress(0)
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

      <div className="mb-4 space-y-1.5">
        <Label htmlFor="caseName" className="text-xs text-muted-foreground">
          사건명 (선택)
        </Label>
        <Input
          id="caseName"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          placeholder="예: 2026-서울-0123 딥페이크 유포 사건"
          disabled={isBusy}
          className="h-9 max-w-md"
        />
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
                      {formatBytes(item.file.size)} ·{" "}
                      {item.status === "pending" && "업로드 대기 중"}
                      {item.status === "uploading" && "업로드 진행 중..."}
                      {item.status === "success" && "업로드 완료"}
                      {item.status === "error" && (item.errorMessage ?? "업로드 실패")}
                    </p>
                  </div>
                  {status === "idle" && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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

          {status === "completed" && successResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                업로드 완료 ({successResults.length}건)
              </h3>
              {successResults.map((res, idx) => (
                <div
                  key={res.evidenceId}
                  className="animate-in fade-in slide-in-from-top-2 rounded-lg border border-primary/20 bg-primary/5 p-4 duration-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <span className="text-xs font-bold">{idx + 1}</span>
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
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      저장 완료
                    </Badge>
                  </div>
                </div>
              ))}
              <div className="mt-3 flex items-center gap-2 border-t border-primary/10 pt-3">
                <AlertTriangle className="size-3.5 text-amber-500" />
                <p className="text-[11px] text-muted-foreground">
                  AI 딥페이크 분석은 별도 요청 API 연동 후 제공됩니다. 현재는 업로드·해시·메타데이터 저장까지 완료됩니다.
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
          {status === "completed" && (
            <Button variant="outline" onClick={reset}>
              초기화
            </Button>
          )}
          <Button
            size="lg"
            disabled={files.length === 0 || isBusy}
            onClick={handleUpload}
            className="min-w-[120px] gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <UploadCloud className="size-4" aria-hidden="true" />
                업로드 시작 {files.length > 0 && `(${files.length})`}
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}
