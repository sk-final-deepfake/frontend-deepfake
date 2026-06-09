"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { AdminUser } from "@/app/admin/_types/admin"

const inputClassName =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export type UserEditPayload = {
  displayName: string
  email: string
  department: string
  newPassword?: string
}

type EditUserDialogProps = {
  user: AdminUser | null
  open: boolean
  loading: boolean
  onSave: (payload: UserEditPayload) => void
  onCancel: () => void
}

export function EditUserDialog({
  user,
  open,
  loading,
  onSave,
  onCancel,
}: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("")
  const [resetPassword, setResetPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName)
    setEmail(user.email)
    setDepartment(user.department)
    setResetPassword(false)
    setNewPassword("")
    setConfirmPassword("")
    setError("")
  }, [user])

  if (!open || !user) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (resetPassword) {
      if (newPassword.length < 8) {
        setError("비밀번호는 8자 이상이어야 합니다.")
        return
      }
      if (newPassword !== confirmPassword) {
        setError("새 비밀번호가 일치하지 않습니다.")
        return
      }
    }

    onSave({
      displayName,
      email,
      department,
      newPassword: resetPassword ? newPassword : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-foreground">계정 정보 수정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{user.username}</span>{" "}
          계정의 정보를 수정합니다.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">아이디</label>
            <input value={user.username} disabled className={inputClassName} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-displayName" className="text-sm font-medium text-foreground">
              이름
            </label>
            <input
              id="edit-displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClassName}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-department" className="text-sm font-medium text-foreground">
              소속
            </label>
            <input
              id="edit-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={inputClassName}
              required
            />
          </div>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={resetPassword}
              onChange={(e) => setResetPassword(e.target.checked)}
              className="size-4 rounded border-border"
            />
            비밀번호 재설정
          </label>
          <p className="text-xs text-muted-foreground">
            관리자가 사용자 비밀번호를 직접 재설정합니다. (API 연동 시 CoC 로그에 기록)
          </p>

          {resetPassword && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-new-password" className="text-sm font-medium text-foreground">
                  새 비밀번호
                </label>
                <input
                  id="edit-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상"
                  className={inputClassName}
                  required={resetPassword}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-confirm-password"
                  className="text-sm font-medium text-foreground"
                >
                  새 비밀번호 확인
                </label>
                <input
                  id="edit-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClassName}
                  required={resetPassword}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  )
}
