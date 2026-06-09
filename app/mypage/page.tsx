// 담당: 윤형진
// 역할: 마이페이지 및 분석 기록 화면 구현
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { AudioLines, Video, ImageIcon } from "lucide-react"

// 화면 테스트용 더미 데이터 (추후 analysisApi 연동 예정)
const history = [
  { id: "CASE-2026-0412", name: "interview_clip_04.mp4", kind: "video", result: "위변조", time: "2026-06-05" },
  { id: "CASE-2026-0410", name: "scene_photo_117.jpg", kind: "image", result: "정상", time: "2026-06-06" },
  { id: "CASE-2026-0411", name: "voicemail_evidence.wav", kind: "audio", result: "의심", time: "2026-06-07" },
] as const

const kindIcon = { audio: AudioLines, video: Video, image: ImageIcon }

export default function MyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            내 분석 기록
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            내가 요청한 분석 내역을 확인합니다.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-card-foreground">분석 기록 목록</h2>
          </div>
          <ul className="divide-y divide-border">
            {history.map((item) => {
              const Icon = kindIcon[item.kind]
              return (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {item.id} · {item.time}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border text-foreground">
                    {item.result}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}
