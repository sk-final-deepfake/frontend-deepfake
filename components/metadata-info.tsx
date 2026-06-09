import { Info, FileCode, Hash, Calendar, HardDrive } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function MetadataInfo() {
  const metadata = {
    fileName: "evidence_video_001.mp4",
    fileSize: "142.5 MB",
    fileType: "Video/MP4",
    hash: "SHA-256: 8a7c2b3f4e5d6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
    uploadDate: "2026-06-09 14:22:15",
    device: "CCTV-X100 (Internal)",
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border py-4 px-5">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-primary" />
          <CardTitle className="text-base font-semibold">현재 파일 메타데이터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <dl className="space-y-4">
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileCode className="size-3" />
              파일명 / 타입
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {metadata.fileName}
              <span className="ml-2 text-xs font-normal text-muted-foreground">({metadata.fileType})</span>
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <HardDrive className="size-3" />
              파일 크기 / 장치
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {metadata.fileSize} <span className="mx-1 text-muted-foreground">·</span> {metadata.device}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Hash className="size-3" />
              해시값 (무결성 검증)
            </dt>
            <dd className="break-all font-mono text-[10px] leading-relaxed text-foreground bg-muted/50 p-2 rounded">
              {metadata.hash}
            </dd>
          </div>

          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Calendar className="size-3" />
              업로드 일시
            </dt>
            <dd className="text-sm font-medium text-foreground">
              {metadata.uploadDate}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
