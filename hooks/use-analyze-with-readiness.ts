"use client"

import { useCallback, useRef, useState } from "react"

import type { StartAnalysisResponse } from "@/lib/evidence-api"
import {
  checkReadinessForAnalysis,
  needsQualityAcknowledgement,
  worstReadinessTier,
  type ReadinessCheckSummary,
  type ReadinessCheckTarget,
  type ReadinessTier,
} from "@/lib/readiness"

type PendingAnalysis = {
  runAnalyze: (acknowledgeQualityWarning: boolean) => Promise<StartAnalysisResponse>
  onSuccess: (response: StartAnalysisResponse) => void
  onError: (error: unknown) => void
}

export type StartAnalysisWithReadinessOptions = {
  targets: ReadinessCheckTarget[]
  runAnalyze: (acknowledgeQualityWarning: boolean) => Promise<StartAnalysisResponse>
  onSuccess: (response: StartAnalysisResponse) => void
  onError: (error: unknown) => void
  onReadinessChecked?: (summaries: ReadinessCheckSummary[]) => void
}

export function useAnalyzeWithReadiness() {
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false)
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false)
  const [qualityDialogLoading, setQualityDialogLoading] = useState(false)
  const [qualityDialogSummaries, setQualityDialogSummaries] = useState<ReadinessCheckSummary[]>([])
  const [qualityDialogWorstTier, setQualityDialogWorstTier] = useState<ReadinessTier>("GOOD")
  const pendingRef = useRef<PendingAnalysis | null>(null)

  const closeQualityDialog = useCallback(() => {
    setQualityDialogOpen(false)
    setQualityDialogLoading(false)
    setQualityDialogSummaries([])
    pendingRef.current = null
  }, [])

  const startAnalysisWithReadiness = useCallback(
    async (options: StartAnalysisWithReadinessOptions) => {
      setIsCheckingReadiness(true)

      try {
        const summaries = await checkReadinessForAnalysis(options.targets)
        options.onReadinessChecked?.(summaries)

        if (needsQualityAcknowledgement(summaries)) {
          pendingRef.current = {
            runAnalyze: options.runAnalyze,
            onSuccess: options.onSuccess,
            onError: options.onError,
          }
          setQualityDialogSummaries(summaries)
          setQualityDialogWorstTier(worstReadinessTier(summaries))
          setQualityDialogOpen(true)
          return
        }

        const response = await options.runAnalyze(false)
        options.onSuccess(response)
      } catch (error) {
        options.onError(error)
      } finally {
        setIsCheckingReadiness(false)
      }
    },
    []
  )

  const confirmQualityDialog = useCallback(async () => {
    const pending = pendingRef.current
    if (!pending) return

    setQualityDialogLoading(true)

    try {
      const response = await pending.runAnalyze(true)
      closeQualityDialog()
      pending.onSuccess(response)
    } catch (error) {
      closeQualityDialog()
      pending.onError(error)
    } finally {
      setQualityDialogLoading(false)
      setIsCheckingReadiness(false)
    }
  }, [closeQualityDialog])

  const cancelQualityDialog = useCallback(() => {
    closeQualityDialog()
    setIsCheckingReadiness(false)
  }, [closeQualityDialog])

  return {
    isCheckingReadiness,
    qualityDialogOpen,
    qualityDialogLoading,
    qualityDialogSummaries,
    qualityDialogWorstTier,
    startAnalysisWithReadiness,
    confirmQualityDialog,
    cancelQualityDialog,
  }
}
