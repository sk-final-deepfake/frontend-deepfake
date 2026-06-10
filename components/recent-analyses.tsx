"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AudioLines,
  Video,
  ImageIcon,
  ChevronRight,
  FileText,
  Search,
  X,
  FileSearch,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { UploadResult } from "@/lib/evidence-api"

type MediaKind = "audio" | "video" | "image" | "unknown"

function kindFromFileName(name: string): MediaKind {
  const lower = name.toLowerCase()
  if (/\.(mp3|wav|aac|flac|ogg|m4a)$/.test(lower)) return "audio"
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "video"
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(lower)) return "image"
  return "unknown"
}

const kindIcon = {
  audio: AudioLines,
  video: Video,
  image: ImageIcon,
  unknown: FileSearch,
}

function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type RecentAnalysesProps = {
  uploads: UploadResult[]
}

export function RecentAnalyses({ uploads }: RecentAnalysesProps) {
  const [selectedUpload, setSelectedUpload] = useState<UploadResult | null>(null)

  return (
    <section
      id="reports"
      className="relative rounded-xl border border-border bg-card shadow-sm"
      aria-label="최근 업로드 내역"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-card-foreground">
            최근 업로드 내역
          </h2>
        </div>
        <Link
          href="/mypage"
          className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          전체 보기
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {uploads.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          아직 업로드된 증거가 없습니다.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {uploads.map((item) => {
            const kind = kindFromFileName(item.fileName)
            const Icon = kindIcon[kind]
            return (
              <li
                key={item.evidenceId}
                className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.fileName}
                      </p>
                      <Badge
                        variant="outline"
                        className="h-5 gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400"
                      >
                        <span className="size-1 rounded-full bg-emerald-500" aria-hidden="true" />
                        업로드 완료
                      </Badge>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      EV-{item.evidenceId}
                      {item.caseName ? ` · ${item.caseName}` : ""}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {formatUploadedAt(item.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setSelectedUpload(item)}
                  >
                    <Search className="size-3" />
                    상세 보기
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {selectedUpload && (
        <div className="absolute inset-0 z-10 flex flex-col rounded-xl bg-card animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">업로드 상세</h3>
            <Button variant="ghost" size="icon-sm" onClick={() => setSelectedUpload(null)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-4 overflow-auto p-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">대상 파일</p>
              <p className="text-sm font-medium">{selectedUpload.fileName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">증거 ID</p>
                <p className="font-mono text-sm font-bold">{selectedUpload.evidenceId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">업로드 일시</p>
                <p className="text-sm">{formatUploadedAt(selectedUpload.uploadedAt)}</p>
              </div>
            </div>
            {selectedUpload.caseName ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">사건명</p>
                <p className="text-sm">{selectedUpload.caseName}</p>
              </div>
            ) : null}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">SHA-256 해시</p>
              <p className="break-all rounded bg-muted/50 p-2 font-mono text-[10px]">
                {selectedUpload.hashValue}
              </p>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <Button className="w-full" size="sm" onClick={() => setSelectedUpload(null)}>
              확인
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
