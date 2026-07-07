"use client"

import { Loader2 } from "lucide-react"

type ReadinessCheckOverlayProps = {
  open: boolean
}

export function ReadinessCheckOverlay({ open }: ReadinessCheckOverlayProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4">
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-card px-8 py-7 text-center shadow-lg"
      >
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <div>
          <p className="text-base font-semibold text-foreground">화질 검사 결과 확인 중</p>
          <p className="mt-1 text-sm text-muted-foreground">
            업로드 시 저장된 영상 메타데이터로 적합성을 확인하고 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
