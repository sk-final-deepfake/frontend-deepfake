import type { DragEvent, RefObject } from "react"
import {
  AlertTriangle,
  GitCompare,
  Play,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SourceEvidence, UploadedCompareFile } from "./compare-verification-flow"

type CompareFileUploaderProps = {
  sourceEvidence: SourceEvidence
  compareFile: UploadedCompareFile | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onFileChange: (files: FileList | null) => void
  onRemoveFile: () => void
  onBack: () => void
  onStart: () => void
  compareError: string | null
}

export function CompareFileUploader({
  sourceEvidence,
  compareFile,
  fileInputRef,
  onDrop,
  onFileChange,
  onRemoveFile,
  onBack,
  onStart,
  compareError,
}: CompareFileUploaderProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-border dark:bg-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-950 dark:text-foreground">
            비교 대상 파일 업로드
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
            검증할 파일을 업로드하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          재선택
        </button>
      </div>

      <div className="mt-7 flex items-center gap-4 rounded-lg border border-teal-200 bg-teal-50/60 px-5 py-4 dark:border-teal-500/30 dark:bg-teal-500/10">
        <ShieldCheck className="size-5 shrink-0 text-teal-600 dark:text-teal-300" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground">원본 기준 파일</p>
          <p className="mt-1 truncate text-base font-bold text-slate-900 dark:text-foreground">
            {sourceEvidence.name}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-muted-foreground">
            {sourceEvidence.id}
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click()
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/25 px-6 py-8 text-center transition-colors hover:border-teal-500 hover:bg-teal-50/50 dark:border-teal-500/40 dark:bg-teal-500/10 dark:hover:bg-teal-500/15"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files)}
        />

        {compareFile ? (
          <>
            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-teal-200 bg-slate-950 shadow-sm dark:border-teal-500/30">
              <video
                src={compareFile.previewUrl}
                className="size-full object-cover"
                muted
                playsInline
                preload="metadata"
                aria-label={`${compareFile.name} 미리보기`}
              />
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/80 to-transparent" />
              <div className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-teal-700 shadow-sm">
                <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 max-w-md truncate text-base font-bold text-slate-900 dark:text-foreground">
              {compareFile.name}
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemoveFile()
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-red-500 dark:text-muted-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
              제거
            </button>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-white text-teal-600 ring-1 ring-teal-200 dark:bg-background dark:text-teal-300 dark:ring-teal-500/30">
              <UploadCloud className="size-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700 dark:text-foreground">
              파일을 이곳에 드래그하거나 클릭하여 선택하세요
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400 dark:text-muted-foreground">
              용량 제한 없음 · MP4, MOV 권장
            </p>
          </>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        비교 파일은 복사본으로 처리되며 원본 파일은 변경되지 않습니다.
      </div>

      {compareError ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {compareError}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-border">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground">
            업로드된 비교 파일
          </p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-foreground">
            {compareFile ? `${compareFile.name} · ${compareFile.sizeLabel}` : "비교 파일을 업로드하세요"}
          </p>
        </div>
        <Button
          onClick={onStart}
          disabled={!compareFile}
          className="h-11 rounded-md bg-teal-600 px-6 text-sm font-bold hover:bg-teal-700 sm:w-auto"
        >
          <GitCompare className="size-4" aria-hidden="true" />
          비교 검증 시작
        </Button>
      </div>
    </div>
  )
}
