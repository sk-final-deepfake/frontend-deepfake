import { AudioLines, Video, ImageIcon, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type Verdict = "authentic" | "suspicious" | "manipulated"

type Analysis = {
  id: string
  name: string
  kind: "audio" | "video" | "image"
  verdict: Verdict
  confidence: number
  time: string
}

const recent: Analysis[] = [
  {
    id: "CASE-2026-0412",
    name: "interview_clip_04.mp4",
    kind: "video",
    verdict: "manipulated",
    confidence: 96,
    time: "12분 전",
  },
  {
    id: "CASE-2026-0411",
    name: "voicemail_evidence.wav",
    kind: "audio",
    verdict: "suspicious",
    confidence: 71,
    time: "47분 전",
  },
  {
    id: "CASE-2026-0410",
    name: "scene_photo_117.jpg",
    kind: "image",
    verdict: "authentic",
    confidence: 99,
    time: "1시간 전",
  },
  {
    id: "CASE-2026-0409",
    name: "cctv_export_2230.mp4",
    kind: "video",
    verdict: "authentic",
    confidence: 94,
    time: "3시간 전",
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
    className: "border-chart-5/40 bg-chart-5/10 text-chart-5",
    dot: "bg-chart-5",
  },
  suspicious: {
    label: "의심",
    className: "border-chart-3/40 bg-chart-3/10 text-chart-3",
    dot: "bg-chart-3",
  },
  manipulated: {
    label: "위변조",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
}

export function RecentAnalyses() {
  return (
    <section
      id="reports"
      className="rounded-xl border border-border bg-card"
      aria-label="최근 분석 내역"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-card-foreground">
          최근 분석 내역
        </h2>
        <a
          href="#cases"
          className="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          전체 보기
          <ChevronRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <ul className="divide-y divide-border">
        {recent.map((item) => {
          const Icon = kindIcon[item.kind]
          const v = verdictConfig[item.verdict]
          return (
            <li
              key={item.id}
              className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {item.id} · {item.time}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-mono text-sm text-foreground">
                  {item.confidence}%
                </p>
                <p className="text-[11px] text-muted-foreground">신뢰도</p>
              </div>
              <Badge variant="outline" className={`gap-1.5 ${v.className}`}>
                <span className={`size-1.5 rounded-full ${v.dot}`} aria-hidden="true" />
                {v.label}
              </Badge>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
