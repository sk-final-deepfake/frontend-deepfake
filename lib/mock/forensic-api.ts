import type { CaseSummary, CaseStatus } from "@/app/mypage/_types/case"
import type { AnalysisStatus, EvidenceStatsResponse, MediaMetadata, UploadResult } from "@/lib/evidence-api"
import type {
  CaseDetailData,
  CaseEvidenceSummary,
  EvidenceDetailData,
  FrameScore,
  ModuleResult,
  RepresentativeFrame,
  TechnicalMetadata,
} from "@/lib/api/evidence-detail"
import type { UpdateUserProfilePayload, UserProfile } from "@/lib/api/user"
import { getSession } from "@/lib/auth"

const MOCK_STORAGE_KEY = "veriforensics-mock-evidences"
const MOCK_PROFILE_KEY = "veriforensics-mock-profile"
const MOCK_ANALYSIS_DURATION_MS = 7000
const MOCK_PENDING_MS = 1200
const MOCK_VIDEO_URL = "/mock/sample-video.mp4"
const MOCK_VIDEO_URLS_BY_EVIDENCE_ID: Record<number, string> = {
  2024062701: "/mock/kakao-original-clean.mp4",
  2024062702: "/mock/deepfake-generated-portrait.mp4",
  2024062703: "/mock/kakao-tampered-suspect.mp4",
}

type MockEvidenceRecord = UploadResult & {
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "UNKNOWN"
  analysisRequestedAt?: string
  analysisCompletedAt?: string
  analysisProgress?: number
  riskScore?: number
  confidenceScore?: number
  riskLevel?: "LOW" | "MEDIUM" | "HIGH"
  summary?: string
  moduleResults?: ModuleResult[]
}

type MockStore = {
  evidences: MockEvidenceRecord[]
}

const MOCK_FRAME_SCORE_PATTERNS: Record<number, number[]> = {
  2024062701: [0.04, 0.06, 0.08, 0.07, 0.11, 0.09, 0.12, 0.10, 0.13, 0.09, 0.08, 0.07],
  2024062702: [0.34, 0.48, 0.63, 0.76, 0.84, 0.91, 0.88, 0.79, 0.69, 0.82, 0.90, 0.86],
  2024062703: [0.22, 0.31, 0.46, 0.58, 0.73, 0.87, 0.81, 0.68, 0.77, 0.89, 0.74, 0.62],
}

const MOCK_REPRESENTATIVE_FRAME_TIMES: Record<number, Array<{ timeSec: number; frameNumber: number; score: number }>> = {
  2024062701: [
    { timeSec: 2, frameNumber: 60, score: 0.12 },
    { timeSec: 8, frameNumber: 240, score: 0.13 },
    { timeSec: 16, frameNumber: 480, score: 0.11 },
  ],
  2024062702: [
    { timeSec: 0.8, frameNumber: 24, score: 0.84 },
    { timeSec: 1.5, frameNumber: 45, score: 0.91 },
    { timeSec: 2.2, frameNumber: 66, score: 0.88 },
  ],
  2024062703: [
    { timeSec: 1.5, frameNumber: 45, score: 0.87 },
    { timeSec: 3, frameNumber: 90, score: 0.81 },
    { timeSec: 4.2, frameNumber: 126, score: 0.89 },
  ],
}

const sampleCaseDetails: CaseDetailData[] = [
  {
    caseId: "mock-deepfake-pair-20260627",
    caseName: "딥페이크 정상/의심 비교 사건",
    status: "COMPLETED",
    createdAt: "2026-06-27T12:42:37",
    evidences: [
      {
        evidenceId: 2024062701,
        fileName: "KakaoTalk_Video_2026-06-27-12-42-37.mp4",
        mediaType: "VIDEO",
        analysisStatus: "COMPLETED",
      },
      {
        evidenceId: 2024062702,
        fileName: "Create_a_realistic_portrait_of.mp4",
        mediaType: "VIDEO",
        analysisStatus: "COMPLETED",
      },
    ],
  },
  {
    caseId: "mock-tamper-single-20260627",
    caseName: "영상 위변조 의심 단건 사건",
    status: "COMPLETED",
    createdAt: "2026-06-27T12:42:56",
    evidences: [
      {
        evidenceId: 2024062703,
        fileName: "KakaoTalk_Video_2026-06-27-12-42-56.mp4",
        mediaType: "VIDEO",
        analysisStatus: "COMPLETED",
      },
    ],
  },
  {
    caseId: "c4b37830-3653-4b23-b17b-5241b3783038",
    caseName: "가세연 녹취록 딥페이크 의혹 사건",
    status: "PROCESSING",
    createdAt: "2026-06-18T14:30:00",
    evidences: [
      {
        evidenceId: 20240187,
        fileName: "suspect_video_01.mp4",
        mediaType: "VIDEO",
        analysisStatus: "PROCESSING",
      },
      {
        evidenceId: 20240186,
        fileName: "voice_reference_01.wav",
        mediaType: "AUDIO",
        analysisStatus: "PENDING",
      },
    ],
  },
  {
    caseId: "a1f90210-8821-4c11-9a02-1100aa220011",
    caseName: "CCTV 영상 위변조 검증 요청",
    status: "COMPLETED",
    createdAt: "2026-06-15T09:12:00",
    evidences: [
      {
        evidenceId: 20240185,
        fileName: "cctv_entrance_02.mov",
        mediaType: "VIDEO",
        analysisStatus: "COMPLETED",
      },
      {
        evidenceId: 20240184,
        fileName: "cctv_backup_02.mp4",
        mediaType: "VIDEO",
        analysisStatus: "COMPLETED",
      },
      {
        evidenceId: 20240183,
        fileName: "parking_lot_angle_b.mp4",
        mediaType: "VIDEO",
        analysisStatus: "COMPLETED",
      },
    ],
  },
  {
    caseId: "b7e44321-9912-4d22-8c13-2211bb331122",
    caseName: "음성 메일 증거 분석",
    status: "PROCESSING",
    createdAt: "2026-06-17T11:45:00",
    evidences: [
      {
        evidenceId: 20240182,
        fileName: "voice_mail_0617.wav",
        mediaType: "AUDIO",
        analysisStatus: "PENDING",
      },
    ],
  },
  {
    caseId: "d9c55632-aa23-4e33-9d24-3322cc442233",
    caseName: "인터뷰 클립 진위 확인",
    status: "FAILED",
    createdAt: "2026-06-10T16:20:00",
    evidences: [
      {
        evidenceId: 20240181,
        fileName: "interview_clip_03.mp4",
        mediaType: "VIDEO",
        analysisStatus: "FAILED",
      },
      {
        evidenceId: 20240180,
        fileName: "interview_original_backup.mp4",
        mediaType: "VIDEO",
        analysisStatus: "COMPLETED",
      },
    ],
  },
]

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emptyStore(): MockStore {
  return { evidences: [] }
}

function readStore(): MockStore {
  if (typeof window === "undefined") return emptyStore()

  const raw = localStorage.getItem(MOCK_STORAGE_KEY)
  if (!raw) return emptyStore()

  try {
    const parsed = JSON.parse(raw) as MockStore
    if (!parsed || !Array.isArray(parsed.evidences)) return emptyStore()
    return {
      evidences: parsed.evidences.map(updateAnalysisProgress),
    }
  } catch {
    return emptyStore()
  }
}

function writeStore(store: MockStore) {
  if (typeof window === "undefined") return
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(store))
}

function saveAfterProgressUpdate() {
  const store = readStore()
  writeStore(store)
  return store
}

function mediaTypeFromFile(file: File): MockEvidenceRecord["mediaType"] {
  if (file.type.startsWith("image/")) return "IMAGE"
  if (file.type.startsWith("video/")) return "VIDEO"
  if (file.type.startsWith("audio/")) return "AUDIO"

  const lower = file.name.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(lower)) return "IMAGE"
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "VIDEO"
  if (/\.(mp3|wav|aac|flac|ogg|m4a)$/.test(lower)) return "AUDIO"
  return "UNKNOWN"
}

function metadataFor(file: File, mediaType: MockEvidenceRecord["mediaType"]): MediaMetadata {
  const sizeFactor = Math.max(1, Math.round(file.size / 1024 / 1024))

  if (mediaType === "IMAGE") {
    return {
      type: "image",
      codec: file.type.split("/")[1] || "jpeg",
      width: 1280 + (sizeFactor % 4) * 160,
      height: 720 + (sizeFactor % 3) * 120,
    }
  }

  if (mediaType === "VIDEO") {
    return {
      type: "video",
      codec: file.type.split("/")[1] || "h264",
      width: 1920,
      height: 1080,
      duration: 18 + sizeFactor * 3,
      fps: 29.97,
    }
  }

  if (mediaType === "AUDIO") {
    return {
      type: "audio",
      codec: file.type.split("/")[1] || "aac",
      duration: 12 + sizeFactor * 4,
      sampleRate: 44100,
      channels: 2,
    }
  }

  return {
    type: "unknown",
  }
}

function technicalMetadataFor(record: MockEvidenceRecord): TechnicalMetadata {
  const metadata = typeof record.metadata === "string" ? null : record.metadata

  return {
    extractionStatus: "COMPLETED",
    width: metadata?.width,
    height: metadata?.height,
    durationSec: metadata?.duration,
    fps: metadata?.fps,
    codec: metadata?.codec,
    sampleRate: metadata?.sampleRate,
    channels: metadata?.channels,
    deviceInfo: record.mediaType === "IMAGE" ? "Mock forensic camera profile" : undefined,
    capturedAt: record.uploadedAt,
  }
}

async function sha256(file: File): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fallbackHash(file)
  }

  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function fallbackHash(file: File) {
  const source = `${file.name}:${file.size}:${file.lastModified}`
  let hash = 0

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i)
    hash |= 0
  }

  return Math.abs(hash).toString(16).padStart(64, "0").slice(0, 64)
}

function nextEvidenceId(records: MockEvidenceRecord[]) {
  const maxId = records.reduce((max, item) => Math.max(max, item.evidenceId), 1000)
  return maxId + 1
}

function updateAnalysisProgress(record: MockEvidenceRecord): MockEvidenceRecord {
  if (!record.analysisRequestedAt) return record
  if (record.analysisStatus === "FAILED" || record.analysisStatus === "COMPLETED") {
    return record
  }

  const elapsed = Date.now() - new Date(record.analysisRequestedAt).getTime()
  if (elapsed >= MOCK_ANALYSIS_DURATION_MS) {
    return {
      ...record,
      analysisStatus: "COMPLETED",
      analysisProgress: 100,
      analysisCompletedAt: record.analysisCompletedAt ?? new Date().toISOString(),
      ...buildAnalysisResult(record),
    }
  }

  if (elapsed < MOCK_PENDING_MS) {
    return {
      ...record,
      analysisStatus: "PENDING",
      analysisProgress: 0,
    }
  }

  return {
    ...record,
    analysisStatus: "PROCESSING",
    analysisProgress: Math.min(
      96,
      Math.round(((elapsed - MOCK_PENDING_MS) / (MOCK_ANALYSIS_DURATION_MS - MOCK_PENDING_MS)) * 100)
    ),
  }
}

function buildAnalysisResult(record: MockEvidenceRecord) {
  const seed = record.hashValue
    .slice(0, 8)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const riskScore = 28 + (seed % 58)
  const confidenceScore = 82 + (seed % 14)
  const riskLevel: MockEvidenceRecord["riskLevel"] =
    riskScore >= 70 ? "HIGH" : riskScore >= 45 ? "MEDIUM" : "LOW"

  return {
    riskScore,
    confidenceScore,
    riskLevel,
    summary:
      riskLevel === "HIGH"
        ? "얼굴 경계부와 압축 노이즈 패턴에서 합성 가능성이 높은 흔적이 발견되었습니다."
        : riskLevel === "MEDIUM"
          ? "일부 프레임과 메타데이터에서 편집 가능성이 관찰되어 추가 검토가 권장됩니다."
          : "주요 분석 모듈에서 위변조 정황이 낮게 판독되었습니다.",
    moduleResults: moduleResultsFor(record.mediaType, riskScore),
  }
}

function moduleResultsFor(mediaType: MockEvidenceRecord["mediaType"], riskScore: number): ModuleResult[] {
  const normalized = riskScore / 100

  if (mediaType === "AUDIO") {
    return [
      {
        moduleName: "VOICE_SYNTHESIS_DETECTOR",
        detected: riskScore >= 55,
        score: normalized,
        details: "스펙트럼 연속성과 발화 구간의 합성 패턴을 비교했습니다.",
      },
      {
        moduleName: "AUDIO_EDIT_TRACE",
        detected: riskScore >= 65,
        score: Math.max(0.12, normalized - 0.16),
        details: "무음 구간, 노이즈 바닥, 압축 흔적의 불연속성을 확인했습니다.",
      },
    ]
  }

  if (mediaType === "IMAGE") {
    return [
      {
        moduleName: "FACE_SWAP_DETECTOR",
        detected: riskScore >= 52,
        score: normalized,
        details: "얼굴 윤곽, 피부 질감, 조명 방향의 일관성을 분석했습니다.",
      },
      {
        moduleName: "ELA_METADATA_CHECK",
        detected: riskScore >= 62,
        score: Math.max(0.18, normalized - 0.12),
        details: "EXIF 정보와 압축 노이즈 패턴을 교차 검증했습니다.",
      },
    ]
  }

  return [
    {
      moduleName: "TEMPORAL_FACE_ANALYSIS",
      detected: riskScore >= 52,
      score: normalized,
      details: "프레임 간 얼굴 랜드마크와 시선 움직임의 연속성을 분석했습니다.",
    },
    {
      moduleName: "COMPRESSION_TRACE_CHECK",
      detected: riskScore >= 64,
      score: Math.max(0.2, normalized - 0.1),
      details: "프레임별 압축 흔적과 메타데이터의 일관성을 검증했습니다.",
    },
  ]
}

function caseKey(caseName?: string | null) {
  const normalized = (caseName || "미분류 사건").trim() || "미분류 사건"
  let hash = 0

  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i)
    hash |= 0
  }

  return `case-${Math.abs(hash).toString(16).padStart(8, "0")}`
}

function statusPriority(status?: AnalysisStatus): number {
  if (status === "FAILED") return 4
  if (status === "PROCESSING") return 3
  if (status === "PENDING") return 2
  if (status === "COMPLETED") return 1
  return 0
}

function summarizeCaseStatus(records: MockEvidenceRecord[]): CaseStatus {
  const statuses = records.map((record) => record.analysisStatus)

  // 사건 목록은 처리중 / 실패 / 완료 3개 상태만 노출한다.
  // 증거 단위의 대기(PENDING)는 사건 단위에서 처리중으로 합친다.
  if (statuses.some((status) => status === "FAILED")) return "FAILED"
  if (statuses.some((status) => status === "PROCESSING" || status === "PENDING")) {
    return "PROCESSING"
  }
  return "COMPLETED"
}

function maxRiskScore(records: MockEvidenceRecord[]) {
  const scores = records
    .map((record) => record.riskScore)
    .filter((score): score is number => typeof score === "number")

  if (scores.length === 0) return null
  return Math.max(...scores)
}

function findRecord(evidenceId: number): MockEvidenceRecord {
  const store = saveAfterProgressUpdate()
  const record = store.evidences.find((item) => item.evidenceId === evidenceId)

  if (!record) {
    throw new Error("mock 증거 데이터를 찾을 수 없습니다.")
  }

  return record
}

export async function mockUploadEvidence(file: File, caseName?: string): Promise<UploadResult> {
  await delay()

  const store = readStore()
  const hashValue = await sha256(file)
  const existing = store.evidences.find((item) => item.hashValue === hashValue)

  if (existing) {
    const updated = {
      ...existing,
      caseName: caseName?.trim() || existing.caseName,
    }
    writeStore({
      evidences: store.evidences.map((item) =>
        item.evidenceId === existing.evidenceId ? updated : item
      ),
    })
    return updated
  }

  const mediaType = mediaTypeFromFile(file)
  const record: MockEvidenceRecord = {
    evidenceId: nextEvidenceId(store.evidences),
    fileName: file.name,
    caseName: caseName?.trim() || null,
    fileSize: file.size,
    hashAlgorithm: "SHA-256",
    hashValue,
    metadata: metadataFor(file, mediaType),
    uploadedAt: new Date().toISOString(),
    mediaType,
  }

  writeStore({
    evidences: [record, ...store.evidences],
  })

  return record
}

export async function mockFetchEvidenceStats(): Promise<EvidenceStatsResponse> {
  await delay(180)

  const store = saveAfterProgressUpdate()
  let completedCount = 0
  let inProgressCount = 0
  let deepfakeDetectedCount = 0

  for (const item of store.evidences) {
    const status = item.analysisStatus
    if (status === "COMPLETED") {
      completedCount += 1
      if ((item.riskLevel ?? "LOW") !== "LOW") {
        deepfakeDetectedCount += 1
      }
    } else if (status === "PROCESSING" || status === "PENDING") {
      inProgressCount += 1
    }
  }

  return {
    totalAnalysisCount: store.evidences.length,
    deepfakeDetectedCount,
    completedCount,
    inProgressCount,
  }
}

export async function mockFetchAnalysisTrend(
  days = 7
): Promise<import("@/lib/evidence-api").AnalysisTrendResponse> {
  await delay(160)

  const store = saveAfterProgressUpdate()
  const today = new Date()
  const points: import("@/lib/evidence-api").AnalysisTrendPoint[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    const completedCount = store.evidences.filter((item) => {
      if (item.analysisStatus !== "COMPLETED" || !item.analysisCompletedAt) {
        return false
      }
      return item.analysisCompletedAt.slice(0, 10) === key
    }).length

    points.push({ date: key, completedCount })
  }

  return { days, points }
}

export async function mockStartEvidenceAnalysis(
  evidenceIds: number[],
  caseName: string
) {
  await delay(260)

  const now = new Date().toISOString()
  const requestedIds = new Set(evidenceIds)
  const store = readStore()
  const evidences = store.evidences.map((record) => {
    if (!requestedIds.has(record.evidenceId)) return record

    return {
      ...record,
      caseName,
      analysisRequestedAt: now,
      analysisCompletedAt: undefined,
      analysisStatus: "PENDING" as const,
      analysisProgress: 0,
      riskScore: undefined,
      confidenceScore: undefined,
      riskLevel: undefined,
      summary: undefined,
      moduleResults: undefined,
    }
  })

  writeStore({ evidences })

  return {
    success: true,
    message: "mock 분석 요청이 등록되었습니다.",
    caseName,
    startedCount: evidenceIds.length,
    evidenceIds,
  }
}

export async function mockFetchAnalysisStatus(evidenceId: number) {
  await delay(120)

  const record = findRecord(evidenceId)
  return {
    evidenceId,
    analysisRequestId: evidenceId + 5000,
    status: record.analysisStatus ?? "PENDING",
    progressPercent: record.analysisProgress ?? 0,
  }
}

export async function mockCancelAnalysis(evidenceId: number): Promise<void> {
  await delay(160)

  const store = readStore()
  writeStore({
    evidences: store.evidences.map((record) => {
      if (record.evidenceId !== evidenceId) return record

      return {
        ...record,
        analysisRequestedAt: undefined,
        analysisCompletedAt: undefined,
        analysisStatus: undefined,
        analysisProgress: undefined,
      }
    }),
  })
}

export async function mockFetchMyAnalysisHistory(options?: {
  sort?: "newest" | "status"
  page?: number
  size?: number
}) {
  await delay(220)

  const store = saveAfterProgressUpdate()
  const grouped = new Map<string, MockEvidenceRecord[]>()

  for (const sampleCase of sampleCaseDetails) {
    grouped.set(
      sampleCase.caseId,
      sampleCase.evidences.map((evidence) => sampleEvidenceRecord(evidence, sampleCase))
    )
  }

  for (const record of store.evidences) {
    const key = caseKey(record.caseName)
    grouped.set(key, [...(grouped.get(key) ?? []), record])
  }

  const content: CaseSummary[] = Array.from(grouped.entries()).map(([id, records]) => {
    const sorted = [...records].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    )

    return {
      caseId: id,
      caseName: sorted[0]?.caseName || "미분류 사건",
      status: summarizeCaseStatus(records),
      createdAt: sorted[0]?.uploadedAt ?? new Date().toISOString(),
      evidenceCount: records.length,
      representativeFileName: sorted[0]?.fileName,
      riskScore: maxRiskScore(records),
    }
  })

  content.sort((a, b) => {
    if (options?.sort === "status") {
      const statusOrder: Record<CaseStatus, number> = {
        PROCESSING: 0,
        PENDING: 1,
        FAILED: 2,
        COMPLETED: 3,
      }
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const page = options?.page ?? 0
  const size = options?.size ?? 10
  const start = page * size

  return {
    content: content.slice(start, start + size),
    page,
    size,
    totalElements: content.length,
    totalPages: Math.max(1, Math.ceil(content.length / size)),
  }
}

function sampleModuleResults(risk: number): ModuleResult[] {
  const base = risk / 100

  return [
    {
      moduleName: "FACE_SWAP_DETECTOR",
      detected: false,
      score: base,
      details: "얼굴 교체(GAN) 합성 흔적이 발견되지 않았습니다.",
    },
    {
      moduleName: "LIP_SYNC_ANALYZER",
      detected: false,
      score: Math.max(0, base - 0.03),
      details: "입 모양과 음성의 동기화가 자연스럽습니다.",
    },
    {
      moduleName: "FREQUENCY_ARTIFACT",
      detected: false,
      score: base + 0.02,
      details: "주파수 영역에서 합성 아티팩트가 낮게 측정되었습니다.",
    },
  ]
}

function detectedModuleResults(kind: "deepfake" | "tampered" | "clean"): ModuleResult[] {
  if (kind === "deepfake") {
    return [
      {
        moduleName: "FACE_SYNTHESIS_DETECTOR",
        detected: true,
        score: 0.91,
        details: "얼굴 경계와 피부 질감에서 생성형 합성 패턴이 강하게 감지되었습니다.",
      },
      {
        moduleName: "TEMPORAL_CONSISTENCY",
        detected: true,
        score: 0.84,
        details: "프레임 간 표정 변화와 랜드마크 이동이 자연 영상 대비 불연속적으로 나타났습니다.",
      },
      {
        moduleName: "OPTICAL_ARTIFACT",
        detected: true,
        score: 0.79,
        details: "조명 반사와 얼굴 음영 방향의 일관성이 낮아 딥페이크 가능성을 높였습니다.",
      },
    ]
  }

  if (kind === "tampered") {
    return [
      {
        moduleName: "EDIT_BOUNDARY_DETECTOR",
        detected: true,
        score: 0.88,
        details: "일부 구간에서 압축 블록과 경계선 패턴이 주변 프레임과 다르게 관측되었습니다.",
      },
      {
        moduleName: "TIMELINE_DISCONTINUITY",
        detected: true,
        score: 0.81,
        details: "프레임 진행 간 미세한 시간축 불연속성이 확인되어 편집 흔적으로 분류했습니다.",
      },
      {
        moduleName: "METADATA_CONSISTENCY",
        detected: true,
        score: 0.74,
        details: "영상 메타데이터와 프레임 특성 사이에 일부 불일치가 있어 위변조 의심으로 판단했습니다.",
      },
    ]
  }

  return [
    {
      moduleName: "DEEPFAKE_DETECTOR",
      detected: false,
      score: 0.08,
      details: "얼굴 합성, 표정 변조, 생성형 질감 흔적이 낮게 측정되었습니다.",
    },
    {
      moduleName: "TAMPER_ANALYZER",
      detected: false,
      score: 0.06,
      details: "프레임 경계, 압축 패턴, 시간축 흐름에서 편집 흔적이 발견되지 않았습니다.",
    },
    {
      moduleName: "OPTICAL_CONSISTENCY",
      detected: false,
      score: 0.05,
      details: "조명, 반사, 움직임 일관성이 정상 범위로 분석되었습니다.",
    },
  ]
}

function sampleVerdictOverride(evidenceId: number): Partial<MockEvidenceRecord> | null {
  if (evidenceId === 2024062701) {
    return {
      riskScore: 8,
      confidenceScore: 96,
      riskLevel: "LOW",
      summary: "AI 분석 결과 딥페이크 및 영상 위변조 흔적이 낮은 정상 영상으로 판정되었습니다.",
      moduleResults: detectedModuleResults("clean"),
    }
  }

  if (evidenceId === 2024062702) {
    return {
      riskScore: 92,
      confidenceScore: 94,
      riskLevel: "HIGH",
      summary: "AI 분석 결과 얼굴 합성 및 생성형 질감 패턴이 확인되어 딥페이크 의심 영상으로 판정되었습니다.",
      moduleResults: detectedModuleResults("deepfake"),
    }
  }

  if (evidenceId === 2024062703) {
    return {
      riskScore: 86,
      confidenceScore: 91,
      riskLevel: "HIGH",
      summary: "AI 분석 결과 프레임 경계와 시간축 불연속성이 확인되어 위변조 의심 영상으로 판정되었습니다.",
      moduleResults: detectedModuleResults("tampered"),
    }
  }

  return null
}

function buildMockFrameScores(record: MockEvidenceRecord): FrameScore[] {
  if (record.mediaType !== "VIDEO" || record.analysisStatus !== "COMPLETED") return []

  const pattern =
    MOCK_FRAME_SCORE_PATTERNS[record.evidenceId] ??
    Array.from({ length: 12 }, (_, index) => {
      const base = record.riskScore == null ? 0.18 : record.riskScore / 100
      return Math.max(0.03, Math.min(0.96, base + Math.sin(index * 1.4) * 0.08))
    })

  return pattern.map((score, index) => ({
    timeSec: Number((index * 2.2).toFixed(1)),
    score,
  }))
}

function buildMockRepresentativeFrames(record: MockEvidenceRecord): RepresentativeFrame[] {
  if (record.mediaType !== "VIDEO" || record.analysisStatus !== "COMPLETED") return []

  const frames = MOCK_REPRESENTATIVE_FRAME_TIMES[record.evidenceId]
  if (!frames) return []

  return frames.map((frame, index) => {
    const key = `${record.evidenceId}-${String(index + 1).padStart(2, "0")}`

    return {
      ...frame,
      imageUrl: `/mock/frames/${key}.jpg`,
      heatmapUrl: `/mock/frames/${key}-heatmap.jpg`,
    }
  })
}

// 사건 상세 샘플의 증거를 증거 상세용 mock 레코드로 변환한다.
// (실제 업로드 store에 없는 샘플 증거를 클릭해도 상세 화면이 뜨도록)
function sampleEvidenceRecord(
  evidence: CaseEvidenceSummary,
  sampleCase: CaseDetailData
): MockEvidenceRecord {
  const status = (evidence.analysisStatus as AnalysisStatus) ?? "PENDING"
  const completed = status === "COMPLETED"
  const tail = String(evidence.evidenceId).slice(-4)
  const risk = 6 + (evidence.evidenceId % 17)
  const override = completed ? sampleVerdictOverride(evidence.evidenceId) : null

  return {
    evidenceId: evidence.evidenceId,
    fileName: evidence.fileName,
    caseName: sampleCase.caseName,
    fileSize: 120_000_000 + (evidence.evidenceId % 60) * 1_000_000,
    hashAlgorithm: "SHA-256",
    hashValue: `a3f2b8c1d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0${tail}`,
    metadata: null,
    uploadedAt: sampleCase.createdAt,
    mediaType: (evidence.mediaType as MockEvidenceRecord["mediaType"]) || "UNKNOWN",
    analysisStatus: status,
    analysisRequestedAt: status === "PENDING" ? undefined : sampleCase.createdAt,
    analysisCompletedAt:
      status === "COMPLETED" || status === "FAILED" ? sampleCase.createdAt : undefined,
    riskScore: completed ? risk : undefined,
    confidenceScore: completed ? 90 + (evidence.evidenceId % 9) : undefined,
    riskLevel: completed ? "LOW" : undefined,
    summary: completed
      ? "AI 분석 결과 위변조 가능성이 낮은 정상 영상으로 판정되었습니다."
      : undefined,
    moduleResults: completed ? sampleModuleResults(risk) : undefined,
    ...override,
  }
}

function offsetIsoTime(value: string | undefined, minutes: number) {
  const date = new Date(value ?? new Date().toISOString())
  if (Number.isNaN(date.getTime())) return value ?? new Date().toISOString()
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

function buildCocLogs(record: MockEvidenceRecord): EvidenceDetailData["cocLogs"] {
  const requestedAt = record.analysisRequestedAt ?? record.uploadedAt
  const completedAt = record.analysisCompletedAt ?? offsetIsoTime(requestedAt, 2)
  const logs: EvidenceDetailData["cocLogs"] = [
    {
      logId: record.evidenceId * 10 + 1,
      eventType: "UPLOAD",
      userId: "mock-user",
      description: "증거 파일이 mock 저장소에 등록되었습니다.",
      createdAt: record.uploadedAt,
      currentLogHash: record.hashValue,
    },
    {
      logId: record.evidenceId * 10 + 2,
      eventType: "HASH_CREATED",
      userId: "mock-system",
      description: "원본 파일의 SHA-256 해시가 생성되었습니다.",
      createdAt: offsetIsoTime(record.uploadedAt, 0),
      currentLogHash: `${record.hashValue.slice(0, 52)}c0ffee`,
    },
    {
      logId: record.evidenceId * 10 + 3,
      eventType: "INTEGRITY_VERIFIED",
      userId: "mock-system",
      description: "해시 체인과 원본성 검증이 완료되었습니다.",
      createdAt: offsetIsoTime(record.uploadedAt, 1),
      currentLogHash: `${record.hashValue.slice(0, 52)}b10cc0`,
    },
  ]

  if (record.analysisRequestedAt) {
    logs.push(
      {
        logId: record.evidenceId * 10 + 4,
        eventType: "ANALYSIS_REQUESTED",
        userId: "mock-user",
        description: "AI 위변조 분석 요청이 mock 큐에 등록되었습니다.",
        createdAt: requestedAt,
        currentLogHash: `${record.hashValue.slice(0, 48)}feedface`,
      },
      {
        logId: record.evidenceId * 10 + 5,
        eventType: "FRAME_ANALYSIS_STARTED",
        userId: "ai-worker-01",
        description: "프레임 단위 위변조 탐지와 모델 분석이 시작되었습니다.",
        createdAt: offsetIsoTime(requestedAt, 1),
        currentLogHash: `${record.hashValue.slice(0, 50)}a11a1a`,
      }
    )
  }

  if (record.analysisStatus === "COMPLETED" || record.analysisStatus === "FAILED") {
    logs.push(
      {
        logId: record.evidenceId * 10 + 6,
        eventType: record.analysisStatus === "COMPLETED" ? "ANALYSIS_COMPLETED" : "ANALYSIS_FAILED",
        userId: "ai-worker-01",
        description:
          record.analysisStatus === "COMPLETED"
            ? "AI 분석 결과와 판정 요약이 생성되었습니다."
            : "AI 분석 처리 중 오류 상태가 기록되었습니다.",
        createdAt: completedAt,
        currentLogHash: `${record.hashValue.slice(0, 50)}d0c0de`,
      },
      {
        logId: record.evidenceId * 10 + 7,
        eventType: "REPORT_GENERATED",
        userId: "mock-system",
        description: "검증 보고서와 다운로드 가능한 PDF 기록이 생성되었습니다.",
        createdAt: offsetIsoTime(completedAt, 1),
        currentLogHash: `${record.hashValue.slice(0, 50)}5afe00`,
      }
    )
  }

  return logs
}

function buildEvidenceDetail(
  record: MockEvidenceRecord,
  caseId: string
): EvidenceDetailData {
  const status = record.analysisStatus ?? "PENDING"
  const completed = status === "COMPLETED"
  const playableVideoUrl =
    record.mediaType === "VIDEO"
      ? MOCK_VIDEO_URLS_BY_EVIDENCE_ID[record.evidenceId] ?? MOCK_VIDEO_URL
      : null
  const representativeFrames = buildMockRepresentativeFrames(record)
  const frameScores = buildMockFrameScores(record)
  const firstHeatmapUrl = representativeFrames[0]?.heatmapUrl ?? null

  return {
    evidenceInfo: {
      evidenceId: record.evidenceId,
      fileName: record.fileName,
      caseName: record.caseName || "미분류 사건",
      caseId,
      fileSize: record.fileSize,
      uploadedAt: record.uploadedAt,
      mediaType: record.mediaType,
      fileType: record.mediaType,
      previewUrl: playableVideoUrl,
      videoUrl: playableVideoUrl,
      fileUrl: playableVideoUrl,
      streamUrl: playableVideoUrl,
      heatmapImageUrl: firstHeatmapUrl,
      technicalMetadata: technicalMetadataFor(record),
    },
    integrityInfo: {
      hashAlgorithm: record.hashAlgorithm,
      originalHash: record.hashValue,
      chainValid: true,
      isChainValid: true,
      verificationStatus: "VERIFIED",
    },
    analysisInfo: {
      status,
      requestedAt: record.analysisRequestedAt ?? null,
      completedAt: record.analysisCompletedAt ?? null,
      riskScore: completed ? record.riskScore ?? 0 : null,
      confidenceScore: completed ? record.confidenceScore ?? 0 : null,
      riskLevel: completed ? record.riskLevel ?? "LOW" : null,
      summary: completed ? record.summary ?? "" : "분석 큐에서 결과 생성을 준비 중입니다.",
      moduleResults: completed ? record.moduleResults ?? [] : [],
      frameScores,
      representativeFrames,
      heatmapImageUrl: firstHeatmapUrl,
    },
    cocLogs: buildCocLogs(record),
  }
}

export async function mockFetchEvidenceDetail(evidenceId: number): Promise<EvidenceDetailData> {
  await delay(220)

  const store = saveAfterProgressUpdate()
  const stored = store.evidences.find((item) => item.evidenceId === evidenceId)
  if (stored) {
    return buildEvidenceDetail(stored, caseKey(stored.caseName))
  }

  for (const sampleCase of sampleCaseDetails) {
    const sampleEvidence = sampleCase.evidences.find(
      (item) => item.evidenceId === evidenceId
    )
    if (sampleEvidence) {
      return buildEvidenceDetail(
        sampleEvidenceRecord(sampleEvidence, sampleCase),
        sampleCase.caseId
      )
    }
  }

  throw new Error("mock 증거 데이터를 찾을 수 없습니다.")
}

export async function mockFetchCaseDetail(caseId: string): Promise<CaseDetailData> {
  await delay(220)

  const store = saveAfterProgressUpdate()
  const records = store.evidences.filter((record) => caseKey(record.caseName) === caseId)

  if (records.length === 0) {
    const sampleCase = sampleCaseDetails.find((item) => item.caseId === caseId)
    if (sampleCase) return sampleCase
    throw new Error("mock 사건 데이터를 찾을 수 없습니다.")
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  )
  const evidences: CaseEvidenceSummary[] = sorted
    .sort((a, b) => statusPriority(b.analysisStatus) - statusPriority(a.analysisStatus))
    .map((record) => ({
      evidenceId: record.evidenceId,
      fileName: record.fileName,
      mediaType: record.mediaType,
      analysisStatus: record.analysisStatus ?? "PENDING",
    }))

  return {
    caseId,
    caseName: sorted[0]?.caseName || "미분류 사건",
    status: summarizeCaseStatus(records),
    createdAt: sorted[0]?.uploadedAt ?? new Date().toISOString(),
    evidences,
  }
}

function defaultProfile(): UserProfile {
  const session = getSession()

  return {
    userId: Number(session?.userId) || 1001,
    loginId: session?.loginId ?? "hong_gildong",
    email: "hong@forenshield.go.kr",
    name: session?.name ?? "홍길동",
    department: "디지털포렌식센터",
    role: "USER",
    status: "APPROVED",
    darkMode: false,
    createdAt: "2026-01-02T09:00:00",
  }
}

function readProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile()

  const raw = localStorage.getItem(MOCK_PROFILE_KEY)
  if (!raw) return defaultProfile()

  try {
    return { ...defaultProfile(), ...(JSON.parse(raw) as Partial<UserProfile>) }
  } catch {
    return defaultProfile()
  }
}

function writeProfile(profile: UserProfile) {
  if (typeof window === "undefined") return
  localStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(profile))
}

export async function mockFetchMyProfile(): Promise<UserProfile> {
  await delay(200)
  return readProfile()
}

export async function mockUpdateMyProfile(
  payload: UpdateUserProfilePayload
): Promise<UserProfile> {
  await delay(260)

  const next: UserProfile = {
    ...readProfile(),
    loginId: payload.loginId,
    department: payload.department,
  }

  writeProfile(next)
  return next
}
