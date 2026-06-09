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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type MediaKind = "all" | "audio" | "video" | "image"

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

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list)])
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
            분석할 음성·영상·이미지 파일을 업로드하면 딥페이크 및 위변조 여부를 검사합니다.
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

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-background/40 hover:border-primary/50 hover:bg-accent/40",
        )}
        aria-label="파일을 드래그하거나 클릭하여 업로드"
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
            지원 형식: MP4, MOV, WAV, MP3, JPG, PNG · 최대 2GB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptMap[kind]}
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-5 space-y-2" aria-label="업로드된 파일 목록">
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
                    {formatBytes(file.size)} · 분석 대기 중
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={`${file.name} 제거`}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldQuestion className="size-3.5" aria-hidden="true" />
          업로드된 파일은 내부망에서만 처리되며 외부로 전송되지 않습니다.
        </p>
        <Button
          size="lg"
          disabled={files.length === 0}
          className="gap-2"
        >
          <FileSearch className="size-4" aria-hidden="true" />
          분석 시작 {files.length > 0 && `(${files.length})`}
        </Button>
      </div>
    </section>
  )
}
