"use client"

import { Button } from "@/components/ui/button"

type DeleteUserDialogProps = {
  username: string
  open: boolean
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteUserDialog({
  username,
  open,
  loading,
  onConfirm,
  onCancel,
}: DeleteUserDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="alertdialog"
        aria-labelledby="delete-user-title"
        aria-describedby="delete-user-desc"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 id="delete-user-title" className="text-lg font-semibold text-foreground">
          계정 삭제
        </h2>
        <p id="delete-user-desc" className="mt-2 text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{username}</span>{" "}
          계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </div>
    </div>
  )
}
