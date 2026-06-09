import { FolderOpen } from "lucide-react"

export function CaseHistoryEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FolderOpen className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          요청하신 분석 기록이 존재하지 않습니다
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          메인 페이지에서 새 분석을 요청해 보세요.
        </p>
      </div>
    </div>
  )
}
