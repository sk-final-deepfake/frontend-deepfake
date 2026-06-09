"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAdminToast } from "@/app/admin/_components/admin-toast-provider"
import { MOCK_ADMIN_PROFILE } from "@/app/admin/_data/mock-admin"
import type { AdminProfile } from "@/app/admin/_types/admin"

const inputClassName =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile>(MOCK_ADMIN_PROFILE)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [profileError, setProfileError] = useState("")
  const { toast } = useAdminToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError("")

    if (!/^[a-z0-9_]{4,20}$/.test(profile.username)) {
      setProfileError("아이디는 4~20자의 영문 소문자, 숫자, 밑줄(_)만 사용할 수 있습니다.")
      return
    }

    setSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      toast({
        title: "저장 완료",
        description: "관리자 개인정보가 저장되었습니다. (mock)",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError("")

    if (newPassword.length < 8) {
      setPasswordError("새 비밀번호는 8자 이상이어야 합니다.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호가 일치하지 않습니다.")
      return
    }

    setChangingPassword(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      toast({
        title: "비밀번호 변경 완료",
        description: "관리자 비밀번호가 변경되었습니다. (mock)",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          관리자 개인정보 수정
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          기본 정보와 비밀번호를 분리해서 관리합니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-1.5">
          <label htmlFor="username" className="text-sm font-medium text-foreground">
            아이디
          </label>
          <input
            id="username"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            className={`${inputClassName} font-mono`}
            required
          />
          <p className="text-xs text-muted-foreground">
            4~20자, 영문 소문자·숫자·밑줄(_) (API 연동 시 중복 확인 필요)
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="displayName" className="text-sm font-medium text-foreground">
            이름
          </label>
          <input
            id="displayName"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="department" className="text-sm font-medium text-foreground">
            소속
          </label>
          <input
            id="department"
            value={profile.department}
            onChange={(e) => setProfile({ ...profile, department: e.target.value })}
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            연락처
          </label>
          <input
            id="phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className={inputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">역할</label>
          <input value={profile.role} disabled className={inputClassName} />
        </div>

        {profileError && (
          <p role="alert" className="text-sm text-destructive">
            {profileError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setProfile(MOCK_ADMIN_PROFILE)}
          >
            초기화
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>

      <form
        onSubmit={handlePasswordChange}
        className="space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <div>
          <h2 className="text-base font-semibold text-foreground">비밀번호 변경</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            본인 확인 후 새 비밀번호로 변경합니다. 다른 사용자 비밀번호는 계정 관리에서
            재설정하세요.
          </p>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <label htmlFor="current-password" className="text-sm font-medium text-foreground">
            현재 비밀번호
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-sm font-medium text-foreground">
            새 비밀번호
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8자 이상"
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
            새 비밀번호 확인
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        {passwordError && (
          <p role="alert" className="text-sm text-destructive">
            {passwordError}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </div>
      </form>
    </main>
  )
}
