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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type MediaKind = "all" | "audio" | "video" | "image"
type AnalysisStatus = "idle" | "analyzing" | "completed"

interface AnalysisResult {
  fileName: string
  success: boolean
  analysisId: string
  riskScore: number
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

export function UploadPanel() {
  const [kind, setKind] = useState<MediaKind>("all")
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // 분석 관련 상태
  const [status, setStatus] = useState<AnalysisStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<AnalysisResult[]>([])

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list)])
    // 새 파일 추가 시 이전 결과 초기화
    setResults([])
    setStatus("idle")
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    if (files.length <= 1) {
      setResults([])
      setStatus("idle")
    }
  }

  // Mock 분석 실행 함수
  const handleAnalyze = async () => {
    if (files.length === 0) return

    setStatus("analyzing")
    setProgress(0)
    setResults([])

    // 2초 동안 프로그레스 바 시뮬레이션
    const duration = 2000
    const intervalTime = 50
    const steps = duration / intervalTime
    const increment = 100 / steps

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        return prev + increment
      })
    }, intervalTime)

    // 실제 API 호출 대신 2초 대기
    await new Promise((resolve) => setTimeout(resolve, duration))
    
    clearInterval(timer)
    setProgress(100)

    // 각 파일에 대한 Mock 결과 생성
    const mockResults: AnalysisResult[] = files.map(file => ({
      fileName: file.name,
      success: true,
      analysisId: Math.random().toString(36).substring(2, 7).toUpperCase(),
      riskScore: Math.floor(Math.random() * 40) + 60, // 60~100 사이의 점수
    }))

    setResults(mockResults)
    setStatus("completed")
  }

  return (
    <section
      id="analyze"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-label="파일 업로드 및 분석"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            증거 파일 업로드
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            분석할 음성·영상·이미지 파일을 업로드하여 딥페이크 여부를 검증하세요.
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

      {/* 업로드 영역 */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => status !== "analyzing" && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && status !== "analyzing") {
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (status !== "analyzing") setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-background/40 hover:border-primary/50 hover:bg-accent/40",
          status === "analyzing" && "cursor-not-allowed opacity-60"
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
          disabled={status === "analyzing"}
        />
      </div>

      {/* 파일 목록 및 상태 */}
      {files.length > 0 && (
        <div className="mt-5 space-y-4">
          <ul className="space-y-2" aria-label="업로드된 파일 목록">
            {files.map((file, i) => {
              const Icon = kindIcon[kindFromType(file.type)]
              return (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatBytes(file.size)} · {" "}
                      {status === "idle" && "분석 대기 중"}
                      {status === "analyzing" && "분석 진행 중..."}
                      {status === "completed" && "분석 완료"}
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

          {/* 프로그레스 바 (분석 중일 때 한 개만 표시) */}
          {status === "analyzing" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-primary">인공지능 모델 분석 중...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* 분석 결과 표시 (각 파일별로 표시) */}
          {status === "completed" && results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                분석 완료 보고서 ({results.length}건)
              </h3>
              {results.map((res, idx) => (
                <div key={res.analysisId} className="animate-in fade-in slide-in-from-top-2 rounded-lg border border-primary/20 bg-primary/5 p-4 duration-500">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <span className="text-xs font-bold">{idx + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {res.fileName}
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          분석 ID: {res.analysisId} · 서버 응답 성공
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">위험도 점수</p>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-lg font-bold font-mono",
                          res.riskScore > 80 ? "text-destructive" : "text-amber-500"
                        )}>
                          {res.riskScore}
                        </span>
                        <Badge variant={res.riskScore > 80 ? "destructive" : "secondary"} className="h-4 px-1 text-[9px]">
                          {res.riskScore > 80 ? "고위험" : "주의"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-3 flex items-center gap-2 border-t border-primary/10 pt-3">
                <AlertTriangle className="size-3.5 text-amber-500" />
                <p className="text-[11px] text-muted-foreground">
                  본 결과는 AI 판독치이며, 법적 증거로 사용 시 전문가의 추가 검토가 권장됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldQuestion className="size-3.5" aria-hidden="true" />
          보안: 모든 데이터는 암호화되어 처리됩니다.
        </p>
        <div className="flex gap-2">
          {status === "completed" && (
            <Button
              variant="outline"
              onClick={() => {
                setFiles([]);
                setResults([]);
                setStatus("idle");
              }}
            >
              초기화
            </Button>
          )}
          <Button
            size="lg"
            disabled={files.length === 0 || status === "analyzing"}
            onClick={handleAnalyze}
            className="min-w-[120px] gap-2"
          >
            {status === "analyzing" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <FileSearch className="size-4" aria-hidden="true" />
                분석 시작 {files.length > 0 && results.length === 0 && `(${files.length})`}
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}
