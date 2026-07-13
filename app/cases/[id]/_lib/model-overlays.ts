import type {
  ClipRisk,
  EvidenceDetailData,
  FrameRisk,
  FrameScore,
  ModelOverlayArtifact,
  ModuleTimelineKind,
  SuspiciousSegment,
} from "@/lib/api/evidence-detail"

import {
  buildDeepfakeTimelineTabs,
  buildForgeryTimelineTabs,
  type ForgeryTimelineTab,
} from "./module-timelines"

export type OverlayCategory = "deepfake" | "forgery"

export type DeepfakeOverlayModule = Exclude<ModuleTimelineKind, "forgery_spatial" | "forgery_temporal">

export type OverlayClipWindow = {
  startTimeSec: number
  endTimeSec: number
  riskScore: number
}

export type OverlaySpatialMarker = {
  timeSec: number
  score: number
}

export type ModelOverlayOption = {
  id: string
  category: OverlayCategory
  label: string
  shortLabel: string
  overlayVideoUrl: string | null
  ready: boolean
  overlayBadge: string
  timelineCaption: string
  timelineScores: FrameScore[]
  /** TimeSformer 등 클립 구간 오버레이용 */
  clipWindows: OverlayClipWindow[]
  /** TruFor 등 프레임 시점 spatial marker */
  spatialMarkers: OverlaySpatialMarker[]
  detectionThreshold: number
  description: string
  pendingMessage: string
}

export type ResultMediaView = "original" | "overlay"

export const NO_HUMAN_FACE_OVERLAY_MESSAGE =
  "사람 얼굴이 검출되지 않아 딥페이크 오버레이를 생성하지 않았습니다. 원본 영상만 확인할 수 있습니다."

const DEEPFAKE_OVERLAY_ADVISORIES: Record<string, string> = {
  NO_HUMAN_FACE: NO_HUMAN_FACE_OVERLAY_MESSAGE,
  FACE_TOO_SMALL:
    "검출된 얼굴이 너무 작아 딥페이크 오버레이를 생성하지 않았습니다. 원본 영상만 확인할 수 있습니다.",
  INSUFFICIENT_FACE_SAMPLES:
    "분석에 쓸 수 있는 얼굴 프레임이 부족해 딥페이크 오버레이를 생성하지 않았습니다. 원본 영상만 확인할 수 있습니다.",
}

export function resolveDeepfakeOverlayAdvisory(errorCode: string | null | undefined): string | null {
  if (!errorCode) return null
  return DEEPFAKE_OVERLAY_ADVISORIES[errorCode] ?? null
}

export function isDeepfakeOverlayBlocked(data: EvidenceDetailData | null): boolean {
  return Boolean(resolveDeepfakeOverlayAdvisory(data?.analysisInfo.errorCode))
}

const DEEPFAKE_OVERLAY_META: Record<
  DeepfakeOverlayModule,
  { label: string; shortLabel: string; badge: string; description: string; pendingMessage: string }
> = {
  cnn: {
    label: "Xception",
    shortLabel: "Xception",
    badge: "얼굴 bbox · 위험도 컬러",
    description: "프레임별 얼굴 경계와 위험 점수를 영상 위에 표시합니다.",
    pendingMessage: "Xception 오버레이 MP4가 제공되면 재생됩니다.",
  },
  temporal: {
    label: "TimeSformer",
    shortLabel: "TimeSformer",
    badge: "클립 구간 하이라이트",
    description: "시계열 이상이 감지된 클립 구간을 영상 위에 표시합니다.",
    pendingMessage: "TimeSformer 클립 오버레이 연동 예정입니다.",
  },
  optical: {
    label: "GMFlow",
    shortLabel: "GMFlow",
    badge: "움직임 벡터 · 이상 프레임쌍",
    description: "연속 프레임쌍의 optical flow 이상을 영상 위에 표시합니다.",
    pendingMessage: "GMFlow motion 오버레이 연동 예정입니다.",
  },
}

const FORGERY_OVERLAY_META = {
  spatial: {
    label: "TruFor (Spatial)",
    shortLabel: "TruFor",
    badge: "국소 변조 · heatmap/bbox",
    description: "TruFor가 의심하는 국소 변조 영역을 프레임 위에 표시합니다.",
    pendingMessage: "TruFor spatial frameRisks가 제공되면 원본 영상 위 미리보기가 표시됩니다.",
  },
  temporal: {
    label: "TimeSformer (Temporal)",
    shortLabel: "TimeSformer",
    badge: "클립 구간 테두리",
    description: "TimeSformer가 의심하는 시간축 클립 구간을 영상 테두리로 표시합니다.",
    pendingMessage: "TimeSformer clipRisks가 제공되면 클립 구간 하이라이트가 표시됩니다.",
  },
} as const

export function buildModelOverlayOptions(data: EvidenceDetailData | null): ModelOverlayOption[] {
  if (!data) return []

  const artifactMap = resolveOverlayArtifactMap(data)
  const legacyCnnUrl =
    data.analysisInfo.overlayVideoUrl?.trim() ||
    data.evidenceInfo.overlayVideoUrl?.trim() ||
    null

  const deepfakeOptions = (["cnn", "temporal", "optical"] as const).map((module) =>
    buildDeepfakeOverlayOption(module, data, artifactMap, legacyCnnUrl)
  )

  const forgeryOptions = buildForgeryTimelineTabs(data).map((tab) =>
    buildForgeryOverlayOption(tab, data, artifactMap)
  )

  return [...deepfakeOptions, ...forgeryOptions]
}

export function getDefaultOverlaySelection(options: ModelOverlayOption[]): {
  category: OverlayCategory
  overlayId: string
} {
  const deepfakeReady = options.find((item) => item.category === "deepfake" && item.ready)
  if (deepfakeReady) {
    return { category: "deepfake", overlayId: deepfakeReady.id }
  }

  const forgeryReady = options.find((item) => item.category === "forgery" && item.ready)
  if (forgeryReady) {
    return { category: "forgery", overlayId: forgeryReady.id }
  }

  const firstDeepfake = options.find((item) => item.category === "deepfake")
  return {
    category: "deepfake",
    overlayId: firstDeepfake?.id ?? "deepfake:cnn",
  }
}

export function findOverlayOption(
  options: ModelOverlayOption[],
  overlayId: string | null | undefined
): ModelOverlayOption | null {
  if (!overlayId) return null
  return options.find((item) => item.id === overlayId) ?? null
}

function buildDeepfakeOverlayOption(
  module: DeepfakeOverlayModule,
  data: EvidenceDetailData,
  artifactMap: Map<string, ModelOverlayArtifact>,
  legacyCnnUrl: string | null
): ModelOverlayOption {
  const meta = DEEPFAKE_OVERLAY_META[module]
  const id = `deepfake:${module}`
  const timelineTab = buildDeepfakeTimelineTabs(data).find((tab) => tab.key === module)

  const artifact = artifactMap.get(id)
  const timeline = data.analysisInfo.moduleTimelines?.find((item) => item.module === module)
  const timelineUrl = normalizeUrl(timeline?.overlayVideoUrl)
  const overlayVideoUrl =
    normalizeUrl(artifact?.overlayVideoUrl) ??
    timelineUrl ??
    (module === "cnn" ? legacyCnnUrl : null)

  const clipWindows = extractClipWindows(timeline?.clipRisks, timeline?.suspiciousSegments)
  const spatialMarkers = extractSpatialMarkers(timeline?.frameRisks)
  const timelineScores = timelineTab?.points ?? []
  const advisoryMessage = resolveDeepfakeOverlayAdvisory(data.analysisInfo.errorCode)
  const ready =
    !advisoryMessage &&
    (Boolean(overlayVideoUrl) ||
      artifact?.status === "ready" ||
      timelineScores.length > 0 ||
      clipWindows.length > 0 ||
      spatialMarkers.length > 0)

  return {
    id,
    category: "deepfake",
    label: meta.label,
    shortLabel: meta.shortLabel,
    overlayVideoUrl,
    ready,
    overlayBadge: meta.badge,
    timelineCaption: `${meta.label} 타임라인 위험도`,
    timelineScores,
    clipWindows,
    spatialMarkers,
    detectionThreshold: timelineTab?.threshold ?? 0.6,
    description: artifact?.description?.trim() || meta.description,
    pendingMessage: advisoryMessage ?? meta.pendingMessage,
  }
}

function buildForgeryOverlayOption(
  tab: ForgeryTimelineTab,
  data: EvidenceDetailData,
  artifactMap: Map<string, ModelOverlayArtifact>
): ModelOverlayOption {
  const moduleKey = normalizeForgeryKey(tab.key)
  const id = `forgery:${moduleKey}`
  const artifact = artifactMap.get(id)
  const moduleResult = (data.analysisInfo.moduleResults ?? []).find(
    (module) => normalizeForgeryKey(module.moduleName) === moduleKey
  )

  const timeline = (data.analysisInfo.moduleTimelines ?? []).find(
    (item) => normalizeForgeryKey(String(item.module ?? "")) === moduleKey
  )
  const isSpatial = moduleKey === "forgery_spatial"
  const meta = isSpatial ? FORGERY_OVERLAY_META.spatial : FORGERY_OVERLAY_META.temporal
  const topLevelUrl = isSpatial
    ? normalizeUrl(data.analysisInfo.spatialOverlayVideoUrl)
    : normalizeUrl(data.analysisInfo.temporalOverlayVideoUrl)
  const overlayVideoUrl =
    normalizeUrl(artifact?.overlayVideoUrl) ??
    normalizeUrl(timeline?.overlayVideoUrl) ??
    topLevelUrl ??
    normalizeUrl(moduleResult?.overlayVideoUrl)

  const clipWindows = isSpatial
    ? []
    : extractClipWindows(timeline?.clipRisks, timeline?.suspiciousSegments ?? tab.segments)
  const spatialMarkers = isSpatial
    ? extractSpatialMarkers(timeline?.frameRisks, tab.points)
    : []
  const timelineScores = tab.points
  const ready =
    Boolean(overlayVideoUrl) ||
    artifact?.status === "ready" ||
    timelineScores.length > 0 ||
    clipWindows.length > 0 ||
    spatialMarkers.length > 0

  return {
    id,
    category: "forgery",
    label: tab.label || meta.label,
    shortLabel: meta.shortLabel,
    overlayVideoUrl,
    ready,
    overlayBadge: meta.badge,
    timelineCaption: `${tab.label || meta.label} 구간 위험도`,
    timelineScores,
    clipWindows,
    spatialMarkers,
    detectionThreshold: tab.threshold,
    description: artifact?.description?.trim() || meta.description,
    pendingMessage: meta.pendingMessage,
  }
}

function resolveOverlayArtifactMap(data: EvidenceDetailData): Map<string, ModelOverlayArtifact> {
  const map = indexOverlayArtifacts(data.analysisInfo.modelOverlayArtifacts)

  const upsert = (key: string, category: OverlayCategory, label: string, overlayVideoUrl: string | null) => {
    if (!overlayVideoUrl || map.has(key)) return
    map.set(key, {
      key,
      category,
      label,
      overlayVideoUrl,
      status: "ready",
    })
  }

  upsert(
    "forgery:forgery_spatial",
    "forgery",
    FORGERY_OVERLAY_META.spatial.label,
    normalizeUrl(data.analysisInfo.spatialOverlayVideoUrl)
  )
  upsert(
    "forgery:forgery_temporal",
    "forgery",
    FORGERY_OVERLAY_META.temporal.label,
    normalizeUrl(data.analysisInfo.temporalOverlayVideoUrl)
  )

  for (const timeline of data.analysisInfo.moduleTimelines ?? []) {
    const url = normalizeUrl(timeline.overlayVideoUrl)
    if (!url) continue
    if (timeline.module === "cnn") upsert("deepfake:cnn", "deepfake", "Xception", url)
    if (timeline.module === "temporal") upsert("deepfake:temporal", "deepfake", "TimeSformer", url)
    if (timeline.module === "optical") upsert("deepfake:optical", "deepfake", "GMFlow", url)
    if (timeline.module === "forgery_spatial") {
      upsert("forgery:forgery_spatial", "forgery", FORGERY_OVERLAY_META.spatial.label, url)
    }
    if (timeline.module === "forgery_temporal") {
      upsert("forgery:forgery_temporal", "forgery", FORGERY_OVERLAY_META.temporal.label, url)
    }
  }

  return map
}

function extractClipWindows(
  clipRisks: ClipRisk[] | null | undefined,
  suspiciousSegments: SuspiciousSegment[] | null | undefined = []
): OverlayClipWindow[] {
  const fromClips = (clipRisks ?? []).map((risk) => ({
    startTimeSec: risk.startTimeSec,
    endTimeSec: risk.endTimeSec,
    riskScore: risk.riskScore,
  }))
  if (fromClips.length > 0) return fromClips

  return (suspiciousSegments ?? []).map((segment) => ({
    startTimeSec: segment.startTime,
    endTimeSec: segment.endTime,
    riskScore: segment.maxRiskScore,
  }))
}

function extractSpatialMarkers(
  frameRisks: FrameRisk[] | null | undefined,
  fallbackPoints: FrameScore[] = []
): OverlaySpatialMarker[] {
  if (frameRisks && frameRisks.length > 0) {
    return frameRisks.map((risk) => ({
      timeSec: risk.timestampSec,
      score: risk.riskScore,
    }))
  }
  return fallbackPoints
    .filter((point) => point.timeSec != null)
    .map((point) => ({
      timeSec: point.timeSec as number,
      score: point.score,
    }))
}

function indexOverlayArtifacts(artifacts: ModelOverlayArtifact[] | null | undefined) {
  const map = new Map<string, ModelOverlayArtifact>()
  for (const artifact of artifacts ?? []) {
    const key = artifact.key?.trim()
    if (key) map.set(key, artifact)
  }
  return map
}

function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeForgeryKey(moduleName: string) {
  return moduleName.trim().toLowerCase().replace(/[\s-]+/g, "_")
}
