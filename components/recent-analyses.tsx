"use client"

import { useState } from "react"
import Link from "next/link"
import { AudioLines, Video, ImageIcon, ChevronRight, FileText, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Verdict = "authentic" | "suspicious" | "manipulated"

type Analysis = {
  id: string
  name: string
  kind: "audio" | "video" | "image"
  verdict: Verdict
  confidence: number
  time: string
  uploadDate: string
}

const recent: Analysis[] = [
  {
    id: "CASE-2026-0412",
    name: "interview_clip_04.mp4",
    kind: "video",
    verdict: "manipulated",
    confidence: 96,
    time: "12분 전",
    uploadDate: "2026-06-09 14:22",
  },
  {
    id: "CASE-2026-0411",
    name: "voicemail_evidence.wav",
    kind: "audio",
    verdict: "suspicious",
    confidence: 71,
    time: "47분 전",
    uploadDate: "2026-06-09 13:45",
  },
  {
    id: "CASE-2026-0410",
    name: "scene_photo_117.jpg",
    kind: "image",
    verdict: "authentic",
    confidence: 99,
    time: "1시간 전",
    uploadDate: "2026-06-09 13:10",
  },
]

const kindIcon = {
  audio: AudioLines,
  video: Video,
  image: ImageIcon,
}

const verdictConfig: Record<
  Verdict,
  { label: string; className: string; dot: string }
> = {
  authentic: {
    label: "정상",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  suspicious: {
    label: "의심",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  manipulated: {
    label: "위변조",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
}

export function RecentAnalyses() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)

  return (
    <section
      id="reports"
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-label="최근 분석 내역"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-card-foreground">
            최근 분석 내역
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

      <ul className="divide-y divide-border">
        {recent.map((item) => {
          const Icon = kindIcon[item.kind]
          const v = verdictConfig[item.verdict]
          return (
            <li
              key={item.id}
              className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <Badge variant="outline" className={`h-5 gap-1.5 px-1.5 text-[10px] ${v.className}`}>
                      <span className={`size-1 rounded-full ${v.dot}`} aria-hidden="true" />
                      {v.label}
                    </Badge>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {item.id} · {item.time}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-sm font-bold text-foreground">
                    {item.confidence}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">신뢰도</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="xs" 
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setSelectedAnalysis(item)}
                >
                  <Search className="size-3" />
                  상세 보기
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* 상세 보기 오버레이 (더미 데이터 작동 시뮬레이션) */}
      {selectedAnalysis && (
        <div className="absolute inset-0 z-10 flex flex-col bg-card rounded-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-semibold text-foreground">분석 상세 보고서</h3>
            <Button variant="ghost" size="icon-sm" onClick={() => setSelectedAnalysis(null)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">대상 파일</p>
              <p className="text-sm font-medium">{selectedAnalysis.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">분석 결과</p>
                <p className={cn("text-sm font-bold", 
                  selectedAnalysis.verdict === 'manipulated' ? "text-destructive" : 
                  selectedAnalysis.verdict === 'suspicious' ? "text-amber-500" : "text-emerald-500"
                )}>
                  {verdictConfig[selectedAnalysis.verdict].label} ({selectedAnalysis.confidence}%)
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">분석 일시</p>
                <p className="text-sm">{selectedAnalysis.uploadDate}</p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold">주요 탐지 항목</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-primary" />
                  프레임 간 픽셀 노이즈 불일치 탐지
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-primary" />
                  AI 생성 알고리즘(GAN) 패턴 식별
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-primary" />
                  메타데이터 불연속성 분석 완료
                </li>
              </ul>
            </div>
            <div className="mt-4 rounded-md bg-muted p-3 text-[11px] leading-relaxed italic">
              "해당 미디어 파일에서 특정 구간의 인위적인 합성 흔적이 발견되었습니다. 전문 수사관의 추가 육안 검토가 권장됩니다."
            </div>
          </div>
          <div className="p-4 border-t border-border">
            <Button className="w-full" size="sm" onClick={() => setSelectedAnalysis(null)}>
              확인
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
