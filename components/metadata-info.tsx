"use client"

import { Info, FileCode, Hash, Calendar, HardDrive } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { MediaMetadata, UploadResult } from "@/lib/evidence-api"

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatUploadedAt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatMetadata(metadata: MediaMetadata | string | null): string {
  if (!metadata) return "메타데이터 없음"
  if (typeof metadata === "string") return metadata

  const parts: string[] = []
  if (metadata.type) parts.push(metadata.type.toUpperCase())
  if (metadata.codec) parts.push(metadata.codec)
  if (metadata.width && metadata.height) {
    parts.push(`${metadata.width}x${metadata.height}`)
  }
  if (metadata.duration != null) parts.push(`${metadata.duration.toFixed(1)}초`)
  if (metadata.fps != null) parts.push(`${metadata.fps}fps`)
  if (metadata.sampleRate) parts.push(`${metadata.sampleRate}Hz`)
  if (metadata.channels) parts.push(`${metadata.channels}ch`)

  return parts.length > 0 ? parts.join(" · ") : "추출된 메타데이터 없음"
}

type MetadataInfoProps = {
  upload: UploadResult | null
}

export function MetadataInfo({ upload }: MetadataInfoProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-primary" />
          <CardTitle className="text-base font-semibold">현재 파일 메타데이터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {!upload ? (
          <p className="text-sm text-muted-foreground">
            파일을 업로드하면 해시값과 메타데이터가 여기에 표시됩니다.
          </p>
        ) : (
          <dl className="space-y-4">
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileCode className="size-3" />
                파일명 / 사건명
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {upload.fileName}
                {upload.caseName ? (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {upload.caseName}
                  </span>
                ) : null}
              </dd>
            </div>

            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <HardDrive className="size-3" />
                파일 크기 / 증거 ID
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {formatBytes(upload.fileSize)}
                <span className="mx-1 text-muted-foreground">·</span>
                ID {upload.evidenceId}
              </dd>
            </div>

            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Hash className="size-3" />
                해시값 (무결성 검증)
              </dt>
              <dd className="break-all rounded bg-muted/50 p-2 font-mono text-[10px] leading-relaxed text-foreground">
                {upload.hashAlgorithm}: {upload.hashValue}
              </dd>
            </div>

            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted-foreground">
                추출 메타데이터
              </dt>
              <dd className="text-sm text-foreground">
                {formatMetadata(upload.metadata)}
              </dd>
            </div>

            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="size-3" />
                업로드 일시
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {formatUploadedAt(upload.uploadedAt)}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
