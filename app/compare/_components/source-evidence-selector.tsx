import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Files,
  FolderOpen,
  Play,
  Search,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SourceCase, SourceEvidence } from "./compare-verification-flow"

type SourceEvidenceSelectorProps = {
  caseQuery: string
  evidenceQuery: string
  selectedCaseId: string
  selectedEvidenceId: number | null
  selectedCase: SourceCase
  cases: SourceCase[]
  evidences: SourceEvidence[]
  isLoadingCases: boolean
  isLoadingEvidences: boolean
  sourceError: string | null
  onCaseQueryChange: (value: string) => void
  onEvidenceQueryChange: (value: string) => void
  onSelectCase: (id: string) => void
  onSelectEvidence: (id: number) => void
  onNext: () => void
}

export function SourceEvidenceSelector({
  caseQuery,
  evidenceQuery,
  selectedCaseId,
  selectedEvidenceId,
  selectedCase,
  cases,
  evidences,
  isLoadingCases,
  isLoadingEvidences,
  sourceError,
  onCaseQueryChange,
  onEvidenceQueryChange,
  onSelectCase,
  onSelectEvidence,
  onNext,
}: SourceEvidenceSelectorProps) {
  const selectedEvidence = selectedCase.evidences.find(
    (evidence) => evidence.id === selectedEvidenceId
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
      <div>
        <h1 className="text-xl font-black text-slate-950 dark:text-foreground">원본 증거 선택</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
          사건을 먼저 선택한 뒤 비교 기준이 될 원본 파일을 선택하세요.
        </p>
      </div>

      {sourceError ? (
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {sourceError}
        </div>
      ) : null}

      <div className="mt-7 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-foreground">
              <FolderOpen className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
              사건 목록
            </h2>
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
              {cases.length}건
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <label className="relative block min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={caseQuery}
                onChange={(event) => onCaseQueryChange(event.target.value)}
                placeholder="사건명 또는 번호 검색..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition-colors hover:border-teal-200 hover:bg-teal-50/50 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
            >
              최신순
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid max-h-[430px] gap-2 overflow-y-auto pr-1">
            {isLoadingCases ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs font-bold text-slate-400 dark:border-border dark:bg-card dark:text-muted-foreground">
                사건 목록을 불러오는 중입니다.
              </div>
            ) : cases.length > 0 ? (
              cases.map((sourceCase) => {
                const isSelected = sourceCase.id === selectedCaseId

                return (
                  <button
                    key={sourceCase.id}
                    type="button"
                    onClick={() => onSelectCase(sourceCase.id)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "border-teal-500 bg-white ring-1 ring-teal-500 dark:border-teal-500/60 dark:bg-teal-500/10"
                        : "border-slate-200 bg-white hover:border-teal-200 dark:border-border dark:bg-card dark:hover:bg-muted/30"
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black text-teal-700 dark:text-teal-300">
                          {sourceCase.id}
                        </span>
                        <span className="mt-1 block text-sm font-black leading-5 text-slate-900 dark:text-foreground">
                          {sourceCase.title}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border",
                          isSelected
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 text-transparent dark:border-border"
                        )}
                      >
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Files className="size-3.5" aria-hidden="true" />
                        증거 {sourceCase.evidences.length}개
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {sourceCase.updatedAtLabel}
                      </span>
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs font-bold text-slate-400 dark:border-border dark:bg-card dark:text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-border dark:bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black text-teal-700 dark:text-teal-300">
                {selectedCase.id}
              </p>
              <h2 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-foreground">
                {selectedCase.title}
              </h2>
              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-muted-foreground">
                {selectedCase.department} · 원본 후보 {selectedCase.evidences.length}개
              </p>
            </div>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              해시 검증 완료
            </span>
          </div>

          <label className="relative mt-5 block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={evidenceQuery}
              onChange={(event) => onEvidenceQueryChange(event.target.value)}
              placeholder="선택 사건 내 파일명 또는 ID 검색..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-muted/30 dark:text-foreground dark:placeholder:text-muted-foreground"
            />
          </label>

          <div className="mt-4 grid gap-3">
            {isLoadingEvidences ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm font-bold text-slate-400 dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                증거 목록을 불러오는 중입니다.
              </div>
            ) : evidences.length > 0 ? (
              evidences.map((evidence) => {
                const isSelected = evidence.id === selectedEvidenceId

                return (
                  <button
                    key={evidence.id}
                    type="button"
                    onClick={() => onSelectEvidence(evidence.id)}
                    className={cn(
                      "relative grid min-h-[112px] grid-cols-[104px_1fr_auto] items-center gap-4 rounded-lg border p-3 text-left transition-colors max-sm:grid-cols-1",
                      isSelected
                        ? "border-teal-500 bg-teal-50/60 ring-1 ring-teal-500 dark:border-teal-500/60 dark:bg-teal-500/10"
                        : "border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50/70 dark:border-border dark:bg-card dark:hover:bg-muted/30"
                    )}
                  >
                    <EvidencePreview evidence={evidence} isSelected={isSelected} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-black text-teal-700 dark:text-teal-300">
                        {evidence.id}
                        <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
                      </span>
                      <span className="mt-1 block truncate text-base font-bold text-slate-900 dark:text-foreground">
                        {evidence.name}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-muted-foreground">
                        {evidence.dateLabel} · {evidence.sizeLabel} · {evidence.codecLabel}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-muted dark:text-muted-foreground">
                        {getEvidenceMediaLabel(evidence)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 justify-self-end max-sm:absolute max-sm:right-5 max-sm:top-5",
                        isSelected
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 text-transparent dark:border-border"
                      )}
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm font-bold text-slate-400 dark:border-border dark:bg-muted/30 dark:text-muted-foreground">
                선택한 사건에서 일치하는 증거가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-border">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
            선택된 원본 증거
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-foreground">
            {selectedEvidence ? `${selectedEvidence.id} · ${selectedEvidence.name}` : "원본 증거를 선택하세요"}
          </p>
        </div>
        <Button
          onClick={onNext}
          disabled={selectedEvidenceId === null}
          className="h-11 rounded-md bg-teal-600 px-6 text-sm font-black hover:bg-teal-700 sm:w-auto"
        >
          다음: 비교 파일 업로드
        </Button>
      </div>
    </div>
  )
}

function EvidencePreview({
  evidence,
  isSelected,
}: {
  evidence: SourceEvidence
  isSelected: boolean
}) {
  const toneClassName = getEvidencePreviewTone(evidence.id)
  const mediaPreviewUrl = evidence.previewUrl ?? evidence.videoUrl ?? evidence.fileUrl
  const thumbnailUrl = evidence.thumbnailUrl

  return (
    <span
      className={cn(
        "relative h-20 w-full min-w-0 overflow-hidden rounded-lg border bg-slate-950 shadow-sm",
        isSelected ? "border-teal-400" : "border-slate-200 dark:border-border"
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`${evidence.name} 썸네일`}
          className="absolute inset-0 size-full object-cover"
        />
      ) : mediaPreviewUrl ? (
        <video
          src={mediaPreviewUrl}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
          preload="metadata"
          aria-label={`${evidence.name} 미리보기`}
        />
      ) : (
        <span className={cn("absolute inset-0", toneClassName)} />
      )}
      <span className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-slate-950/70 to-transparent" />
      <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-teal-700 shadow-sm">
        <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-black text-white">
        {evidence.durationLabel}
      </span>
    </span>
  )
}

function getEvidenceMediaLabel(evidence: SourceEvidence) {
  if (evidence.thumbnailUrl || evidence.previewUrl || evidence.videoUrl || evidence.fileUrl) {
    return "영상 썸네일"
  }

  return "영상 미리보기"
}

function getEvidencePreviewTone(evidenceId: number) {
  const id = String(evidenceId)

  if (id.endsWith("184") || id.endsWith("180")) {
    return "bg-[linear-gradient(135deg,#0f766e,#0f172a_58%,#111827)]"
  }
  if (id.endsWith("182") || id.endsWith("179")) {
    return "bg-[linear-gradient(135deg,#1d4ed8,#0f766e_52%,#111827)]"
  }
  if (id.endsWith("174") || id.endsWith("173")) {
    return "bg-[linear-gradient(135deg,#334155,#0284c7_48%,#111827)]"
  }

  return "bg-[linear-gradient(135deg,#475569,#14b8a6_48%,#111827)]"
}
