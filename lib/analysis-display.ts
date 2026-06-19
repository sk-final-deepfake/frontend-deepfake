import type { ModuleResult } from "@/lib/api/evidence-detail"

export type VideoModuleDetails = {
  deepfakeDetected?: boolean
  deepfakeScore?: number
  frameEditDetected?: boolean
  frameEditScore?: number
  lipSyncDetected?: boolean
  lipSyncScore?: number
}

export function parseVideoModuleDetails(raw: string): VideoModuleDetails | null {
  try {
    return JSON.parse(raw) as VideoModuleDetails
  } catch {
    return null
  }
}

export function resolveModelLabel(summary: string): string {
  if (/xception/i.test(summary)) return "Xception (test)"
  return "GPU Worker"
}

export function formatModuleDetailsText(raw: string): string | null {
  const details = parseVideoModuleDetails(raw)
  if (!details) return null

  const parts: string[] = []
  if (details.deepfakeScore != null) {
    parts.push(
      `Deepfake ${(details.deepfakeScore * 100).toFixed(1)}%` +
        (details.deepfakeDetected ? " (탐지)" : "")
    )
  }
  if (details.frameEditScore != null && details.frameEditScore > 0) {
    parts.push(`Frame edit ${(details.frameEditScore * 100).toFixed(1)}%`)
  }
  if (details.lipSyncScore != null && details.lipSyncScore > 0) {
    parts.push(`Lip sync ${(details.lipSyncScore * 100).toFixed(1)}%`)
  }

  return parts.length > 0 ? parts.join(" · ") : null
}

export function buildModuleReasonText(modules: ModuleResult[], summary: string): string {
  const parts: string[] = []
  if (summary.trim()) parts.push(summary.trim())

  for (const module of modules) {
    const formatted = formatModuleDetailsText(module.details)
    if (formatted) parts.push(formatted)
  }

  return parts.join(" · ") || "AI 분석 완료"
}
