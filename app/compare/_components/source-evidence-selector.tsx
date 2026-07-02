import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
      <div className="border-b border-slate-200 px-7 py-6 dark:border-border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-950 dark:text-foreground">기준 증거 선택</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
              사건에서 기준 증거를 확정한 뒤 비교 대상 파일을 업로드합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold",
                selectedCaseId
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                  : "bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground"
              )}
            >
              <FolderOpen className="size-3.5" aria-hidden="true" />
              사건 {selectedCaseId ? "선택됨" : "대기"}
            </span>
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold",
                selectedEvidence
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground"
              )}
            >
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              기준 증거 {selectedEvidence ? "확정 가능" : "대기"}
            </span>
          </div>
        </div>
      </div>

      {sourceError ? (
        <div className="mx-7 mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {sourceError}
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 lg:border-b-0 lg:border-r dark:border-border dark:bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-foreground">
              <FolderOpen className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
              기준 사건
            </h2>
            <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
              {cases.length}건
            </span>
          </div>

          <label className="relative mt-4 block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={caseQuery}
              onChange={(event) => onCaseQueryChange(event.target.value)}
              placeholder="사건명 또는 번호 검색"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground"
            />
          </label>

          <div className="mt-4 max-h-[520px] overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-border dark:bg-card">
            {isLoadingCases ? (
              <div className="px-4 py-8 text-center text-xs font-bold text-slate-400 dark:text-muted-foreground">
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
                      "w-full border-l-4 border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-b-0 dark:border-border",
                      isSelected
                        ? "border-l-teal-600 bg-teal-50/70 dark:border-l-teal-400 dark:bg-teal-500/10"
                        : "border-l-transparent bg-white hover:bg-slate-50 dark:bg-card dark:hover:bg-muted/30"
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-teal-700 dark:text-teal-300">
                          {sourceCase.id}
                        </span>
                        <span className="mt-1 block text-sm font-bold leading-5 text-slate-900 dark:text-foreground">
                          {sourceCase.title}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
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
              <div className="px-4 py-8 text-center text-xs font-bold text-slate-400 dark:text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-teal-700 dark:text-teal-300">
                {selectedCase.id}
              </p>
              <h2 className="mt-1 truncate text-lg font-bold text-slate-950 dark:text-foreground">
                {selectedCase.title}
              </h2>
              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-muted-foreground">
                {selectedCase.department} · 기준 후보 {selectedCase.evidences.length}개
              </p>
            </div>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              해시 검증 완료
            </span>
          </div>

          <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-500/30 dark:bg-teal-500/10">
            {selectedEvidence ? (
              <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                <EvidencePreview
                  evidence={selectedEvidence}
                  isSelected
                  className="aspect-video w-full"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-teal-700 shadow-sm ring-1 ring-teal-100 dark:bg-background dark:text-teal-300 dark:ring-teal-500/30">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      기준 증거
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      선택됨
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold text-teal-700 dark:text-teal-300">
                    {formatEvidenceId(selectedEvidence.id)}
                  </p>
                  <h3 className="mt-1 truncate text-lg font-bold text-slate-950 dark:text-foreground">
                    {selectedEvidence.displayLabel}
                  </h3>
                </div>
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-teal-200 bg-white/60 text-sm font-bold text-slate-400 dark:border-teal-500/25 dark:bg-background/40 dark:text-muted-foreground">
                기준 증거를 선택하세요.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-foreground">
              <Files className="size-4 text-teal-600 dark:text-teal-300" aria-hidden="true" />
              증거 파일
              <span className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
                {evidences.length}개
              </span>
            </h3>
            <label className="relative block w-full sm:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={evidenceQuery}
                onChange={(event) => onEvidenceQueryChange(event.target.value)}
                placeholder="증거 ID 검색"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100 dark:border-border dark:bg-muted/30 dark:text-foreground dark:placeholder:text-muted-foreground"
              />
            </label>
          </div>

          <div className="mt-3 max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 dark:border-border">
            {isLoadingEvidences ? (
              <div className="bg-slate-50/70 px-4 py-10 text-center text-sm font-bold text-slate-400 dark:bg-muted/30 dark:text-muted-foreground">
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
                      "grid w-full grid-cols-[84px_minmax(0,1fr)_36px] items-center gap-3 border-b border-slate-100 bg-white px-3 py-3 text-left transition-colors last:border-b-0 dark:border-border dark:bg-card max-sm:grid-cols-[72px_minmax(0,1fr)_32px]",
                      isSelected
                        ? "bg-teal-50/70 dark:bg-teal-500/10"
                        : "hover:bg-slate-50/70 dark:hover:bg-muted/30"
                    )}
                  >
                    <EvidencePreview
                      evidence={evidence}
                      isSelected={isSelected}
                      className="h-16 w-full"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-teal-700 dark:text-teal-300">
                        {formatEvidenceId(evidence.id)}
                        <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
                      </span>
                      <span className="mt-1 block truncate text-base font-bold text-slate-900 dark:text-foreground">
                        {evidence.displayLabel}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500 dark:text-muted-foreground">
                        <span>{evidence.dateLabel}</span>
                        <span>{evidence.durationLabel}</span>
                        <span>{evidence.sizeLabel}</span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 justify-self-end",
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
              <div className="bg-slate-50/70 px-4 py-10 text-center text-sm font-bold text-slate-400 dark:bg-muted/30 dark:text-muted-foreground">
                선택한 사건에서 일치하는 증거가 없습니다.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-7 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/20">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
            확정 기준
          </p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-foreground">
            {selectedEvidence
              ? `${formatEvidenceId(selectedEvidence.id)} · ${selectedEvidence.displayLabel}`
              : "기준 증거를 선택하세요"}
          </p>
        </div>
        <Button
          onClick={onNext}
          disabled={selectedEvidenceId === null}
          className="h-11 rounded-md bg-teal-600 px-6 text-sm font-bold hover:bg-teal-700 sm:w-auto"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
          다음: 비교 파일 업로드
        </Button>
      </div>
    </div>
  )
}

function EvidencePreview({
  evidence,
  isSelected,
  className,
}: {
  evidence: SourceEvidence
  isSelected: boolean
  className?: string
}) {
  const toneClassName = getEvidencePreviewTone(evidence.id)
  const mediaPreviewUrl = evidence.previewUrl ?? evidence.videoUrl ?? evidence.fileUrl
  const thumbnailUrl = evidence.thumbnailUrl

  return (
    <span
      className={cn(
        "relative block min-w-0 overflow-hidden rounded-lg border bg-slate-950 shadow-sm",
        className,
        isSelected ? "border-teal-400" : "border-slate-200 dark:border-border"
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`${formatEvidenceId(evidence.id)} 썸네일`}
          className="absolute inset-0 size-full object-cover"
        />
      ) : mediaPreviewUrl ? (
        <video
          src={mediaPreviewUrl}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
          preload="metadata"
          aria-label={`${formatEvidenceId(evidence.id)} 미리보기`}
        />
      ) : (
        <span className={cn("absolute inset-0", toneClassName)} />
      )}
      <span className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-slate-950/70 to-transparent" />
      <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-teal-700 shadow-sm">
        <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {evidence.durationLabel}
      </span>
    </span>
  )
}

function formatEvidenceId(evidenceId: number) {
  return `EVD-${evidenceId}`
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
