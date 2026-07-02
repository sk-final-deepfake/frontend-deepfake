"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, UploadCloud, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createCase, setRepresentativeEvidence, uploadEvidenceToCase } from "@/lib/api/case-workflow"
import type { AuthSession } from "@/lib/auth"
import { canCreateCase, getAppUserFromSession } from "@/lib/permissions"
import { buildCaseDetailPath } from "@/lib/route-params"
import { cn } from "@/lib/utils"

export function CaseCreateDialog({
  open,
  onClose,
  session,
  existingCaseNames = [],
}: {
  open: boolean
  onClose: () => void
  session: AuthSession | null
  existingCaseNames?: string[]
}) {
  const router = useRouter()
  const [newCaseName, setNewCaseName] = useState("")
  const [representativeFile, setRepresentativeFile] = useState<File | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  if (!open) return null

  async function handleCreateCase() {
    const trimmed = newCaseName.trim()
    if (!trimmed) {
      setCreateError("사건명을 입력해 주세요.")
      return
    }

    if (existingCaseNames.some((name) => normalizeCaseNameForCompare(name) === normalizeCaseNameForCompare(trimmed))) {
      setCreateError("이미 등록된 사건명입니다. 다른 사건명을 입력해 주세요.")
      return
    }

    if (!representativeFile) {
      setCreateError("대표 증거 영상을 1개 선택해 주세요.")
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      const created = await createCase(trimmed)
      const representativeEvidence = await uploadEvidenceToCase(
        created.caseId,
        created.caseName,
        representativeFile
      )

      if (representativeEvidence) {
        try {
          await setRepresentativeEvidence(created.caseId, representativeEvidence.evidenceId)
        } catch {
          // 실제 API 계약 전에는 대표 증거 지정이 지원되지 않을 수 있다.
        }
      }

      resetForm()
      onClose()
      router.push(buildCaseDetailPath(created.caseId, representativeEvidence?.evidenceId))
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "사건과 증거 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsCreating(false)
    }
  }

  function closeDialog() {
    if (isCreating) return
    resetForm()
    onClose()
  }

  function resetForm() {
    setNewCaseName("")
    setRepresentativeFile(null)
    setCreateError(null)
  }

  function selectRepresentativeFile(fileList: FileList | null) {
    const file = fileList?.item(0)
    if (!file) return

    setRepresentativeFile(file)
    setCreateError(null)
  }

  const appUser = getAppUserFromSession(session)
  const receptionistText = appUser
    ? `${appUser.name} · ${appUser.organizationName} · ${appUser.department}`
    : `${session?.name ?? "김민희"} · 서울경찰청 · 사이버수사팀`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 px-4 py-6">
      <section className="w-full max-w-5xl rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">사건 등록</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              사건 정보와 대표 증거 영상을 함께 접수합니다. 등록된 증거는 원본 해시와 함께 이력에 기록됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="사건 등록 닫기"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <section className="rounded-xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">사건 정보</h3>
                <p className="text-xs text-muted-foreground">목록과 상세 화면에 표시될 사건명을 입력합니다.</p>
              </div>
            </div>
            <div className="grid gap-4">
              <div>
                <label htmlFor="newCaseName" className="block text-sm font-bold text-foreground">
                  사건명 <span className="text-red-500">*</span>
                </label>
                <input
                  id="newCaseName"
                  value={newCaseName}
                  onChange={(event) => setNewCaseName(event.target.value)}
                  placeholder="예: 2026-서울-0123 영상 증거 분석"
                  className="mt-2 h-11 w-full rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
                />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs font-bold text-muted-foreground">접수자 정보</p>
              <p className="mt-1 text-sm font-bold text-foreground">{receptionistText}</p>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">증거 업로드</h3>
                <p className="text-xs text-muted-foreground">
                  MP4, MOV 등 대표 증거 영상 1개를 선택하세요. 추가 증거는 사건 상세 화면에서 등록할 수 있습니다.
                </p>
              </div>
            </div>

            <label
              htmlFor="dashboardEvidenceFile"
              className={cn(
                "flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
                representativeFile
                  ? "border-teal-300 bg-teal-50/70 text-teal-700"
                  : "border-border bg-card text-muted-foreground hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700"
              )}
            >
              <UploadCloud className="size-8" aria-hidden="true" />
              <span className="mt-3 text-sm font-bold text-foreground">
                {representativeFile ? "대표 증거 선택 완료" : "대표 증거 영상 선택"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                MP4, MOV 등 대표 증거 영상 1개를 선택하세요.
              </span>
              {representativeFile ? (
                <span className="mt-3 flex max-w-full items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-teal-700 shadow-sm">
                  <span className="max-w-[420px] truncate">{representativeFile.name}</span>
                  <button
                    type="button"
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="선택한 대표 증거 제거"
                    onClick={(event) => {
                      event.preventDefault()
                      setRepresentativeFile(null)
                    }}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </span>
              ) : null}
            </label>
            <input
              id="dashboardEvidenceFile"
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => {
                selectRepresentativeFile(event.target.files)
                event.currentTarget.value = ""
              }}
            />
          </section>
        </div>

        {createError ? (
          <p className="mt-3 flex items-center gap-2 text-sm font-bold text-red-500">
            <AlertCircle className="size-4" aria-hidden="true" />
            {createError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <p className="mr-auto self-center text-xs font-semibold text-muted-foreground">
            등록 후 원본 저장, SHA-256 해시 생성, 메타데이터 추출이 자동으로 진행됩니다.
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 font-bold"
            disabled={isCreating}
            onClick={closeDialog}
          >
            취소
          </Button>
          <Button
            type="button"
            className="h-10 bg-teal-600 px-4 font-bold hover:bg-teal-700"
            disabled={isCreating}
            onClick={handleCreateCase}
          >
            {isCreating ? "등록 중" : "사건 및 증거 등록"}
          </Button>
        </div>
      </section>
    </div>
  )
}

export function canRegisterCase(session: AuthSession | null) {
  return canCreateCase(getAppUserFromSession(session))
}

function normalizeCaseNameForCompare(caseName: string) {
  return caseName.trim().toLowerCase()
}
