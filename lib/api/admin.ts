import { apiDownload, apiRequest } from "@/lib/api/client"
import {
  MOCK_ADMIN_LOGS,
  MOCK_ADMIN_PROFILE,
  MOCK_ADMIN_USERS,
  MOCK_INVITE_CODES,
  getLogDepartments,
} from "@/app/admin/_data/mock-admin"
import type {
  AdminEvidence,
  AdminEvidenceDetail,
  AdminLog,
  AdminProfile,
  AdminUser,
  EvidenceFileType,
  EvidenceStatus,
  InviteCode,
  LogCategory,
  UserStatus,
} from "@/app/admin/_types/admin"

type AdminUserPageResponse = {
  items: AdminUser[]
  total: number
  page: number
  size: number
}

type AdminUserStatusResponse = {
  userId: string
  status: UserStatus
}

export type AdminDashboardStats = {
  pendingUsers: number
  totalUsers: number
  todayLogs: number
  unusedInviteCodes: number
  cocLogs: number
}

type AdminLogPageResponse = {
  items: AdminLog[]
  total: number
  page: number
  size: number
  departments: string[]
}

type AdminEvidencePageResponse = {
  items: AdminEvidence[]
  total: number
  page: number
  size: number
}

export type UpdateAdminUserPayload = {
  displayName: string
  email: string
  department: string
}

export type UpdateAdminProfilePayload = {
  username: string
  displayName: string
  email: string
  department: string
  phone?: string
}

const ENABLE_MOCK_ADMIN = process.env.NODE_ENV !== "production"

const MOCK_ADMIN_EVIDENCES: AdminEvidenceDetail[] = [
  {
    id: "EVD-2024-0184",
    fileName: "interview_record.mp4",
    fileType: "VIDEO",
    caseNumber: "CASE-2024-0612",
    caseName: "강남구 인터뷰 영상 위변조 의심",
    uploaderUsername: "lee_forensic",
    uploaderName: "이포렌",
    department: "디지털포렌식 2팀",
    hashValue: "a4f3b2c1d9e8f7a6bb29c7a0ef531bd2f6f58ca903ad77ab6e8759ca0b3f1102",
    fileSize: 445 * 1024 * 1024,
    uploadedAt: "2024-06-12 09:14",
    status: "UPLOADED",
    analysisStatus: "COMPLETED",
    mimeType: "video/mp4",
    hashAlgorithm: "SHA-256",
    metadata: {
      width: 1920,
      height: 1080,
      durationSec: 1902,
      fps: 29.97,
      codec: "H.264 / AAC",
      extractionStatus: "COMPLETED",
    },
    analysisHistory: [
      {
        id: "ANL-2024-0441",
        status: "COMPLETED",
        requestedAt: "2024-06-12 09:20",
        completedAt: "2024-06-12 09:34",
      },
    ],
    custodyLogs: [
      {
        id: "COC-001",
        timestamp: "2024-06-12 09:14",
        category: "COC",
        actor: "lee_forensic",
        action: "증거 업로드",
        detail: "SHA-256 해시 생성",
      },
    ],
  },
  {
    id: "EVD-2024-0180",
    fileName: "bodycam_reference.mp4",
    fileType: "VIDEO",
    caseNumber: "CASE-2024-0610",
    caseName: "잠실 현장 바디캠 증거 검증",
    uploaderUsername: "park_invest",
    uploaderName: "박수사",
    department: "현장수사 지원팀",
    hashValue: "9d2f5a0c8b1e43d7ddf91b37e0cd7364650be8ad73df6d26fcd2a17190c88b41",
    fileSize: 1840 * 1024 * 1024,
    uploadedAt: "2024-06-10 18:45",
    status: "UPLOADED",
    analysisStatus: "ANALYZING",
    mimeType: "video/mp4",
    hashAlgorithm: "SHA-256",
    metadata: {
      width: 1920,
      height: 1080,
      durationSec: 2538,
      fps: 30,
      codec: "H.265 / AAC",
      extractionStatus: "COMPLETED",
    },
    analysisHistory: [
      {
        id: "ANL-2024-0437",
        status: "ANALYZING",
        requestedAt: "2024-06-10 19:00",
      },
    ],
    custodyLogs: [
      {
        id: "COC-002",
        timestamp: "2024-06-10 18:45",
        category: "COC",
        actor: "park_invest",
        action: "증거 업로드",
      },
    ],
  },
  {
    id: "EVD-2024-0174",
    fileName: "cctv_court_entry.mp4",
    fileType: "VIDEO",
    caseNumber: "CASE-2024-0608",
    caseName: "법원 출입구 CCTV 원본성 확인",
    uploaderUsername: "choi_audit",
    uploaderName: "최감사",
    department: "영상증거 분석팀",
    hashValue: "6a0d7c2e41bf883c91ff305d8e2c59f0e1036c1bcf06bbd17de0ab7f318aa203",
    fileSize: 2140 * 1024 * 1024,
    uploadedAt: "2024-06-08 16:10",
    status: "UPLOADED",
    analysisStatus: "QUEUED",
    mimeType: "video/mp4",
    hashAlgorithm: "SHA-256",
    metadata: {
      width: 1280,
      height: 720,
      durationSec: 4324,
      fps: 24,
      codec: "H.264 / AAC",
      extractionStatus: "COMPLETED",
    },
    analysisHistory: [
      {
        id: "ANL-2024-0429",
        status: "QUEUED",
        requestedAt: "2024-06-08 16:30",
      },
    ],
    custodyLogs: [
      {
        id: "COC-003",
        timestamp: "2024-06-08 16:10",
        category: "COC",
        actor: "choi_audit",
        action: "증거 업로드",
      },
    ],
  },
]

function paginate<T>(items: T[], page: number, size: number) {
  const start = page * size
  return items.slice(start, start + size)
}

function matchesText(value: string | undefined, search: string) {
  return (value ?? "").toLowerCase().includes(search.toLowerCase())
}

async function withMockFallback<T>(request: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await request()
  } catch (error) {
    if (ENABLE_MOCK_ADMIN) return fallback()
    throw error
  }
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return withMockFallback(
    () => apiRequest<AdminDashboardStats>("/api/v1/admin/dashboard/stats"),
    () => ({
      pendingUsers: MOCK_ADMIN_USERS.filter((user) => user.status === "PENDING").length,
      totalUsers: MOCK_ADMIN_USERS.length,
      todayLogs: MOCK_ADMIN_LOGS.length,
      unusedInviteCodes: MOCK_INVITE_CODES.filter((code) => code.status === "UNUSED").length,
      cocLogs: MOCK_ADMIN_LOGS.filter((log) => log.category === "COC").length,
    })
  )
}

export async function fetchAdminUsers(options?: {
  search?: string
  status?: UserStatus | "ALL"
  page?: number
  size?: number
}): Promise<AdminUserPageResponse> {
  const params = new URLSearchParams()
  const search = options?.search?.trim()
  const page = options?.page ?? 0
  const size = options?.size ?? 10

  if (search) {
    params.set("search", search)
  }
  if (options?.status && options.status !== "ALL") {
    params.set("status", options.status)
  }
  params.set("page", String(page))
  params.set("size", String(size))

  const query = params.toString()
  return withMockFallback(
    () => apiRequest<AdminUserPageResponse>(`/api/v1/admin/users?${query}`),
    () => {
      const filtered = MOCK_ADMIN_USERS.filter((user) => {
        const statusMatched =
          !options?.status || options.status === "ALL" || user.status === options.status
        const searchMatched =
          !search ||
          matchesText(user.username, search) ||
          matchesText(user.displayName, search) ||
          matchesText(user.email, search)

        return statusMatched && searchMatched
      })

      return {
        items: paginate(filtered, page, size),
        total: filtered.length,
        page,
        size,
      }
    }
  )
}

export async function approveAdminUser(userId: string): Promise<AdminUserStatusResponse> {
  return withMockFallback(
    () =>
      apiRequest<AdminUserStatusResponse>(`/api/v1/admin/users/${userId}/approve`, {
        method: "POST",
      }),
    () => ({ userId, status: "APPROVED" })
  )
}

export async function rejectAdminUser(userId: string): Promise<AdminUserStatusResponse> {
  return withMockFallback(
    () =>
      apiRequest<AdminUserStatusResponse>(`/api/v1/admin/users/${userId}/reject`, {
        method: "POST",
      }),
    () => ({ userId, status: "REJECTED" })
  )
}

export async function updateAdminUser(
  userId: string,
  payload: UpdateAdminUserPayload
): Promise<AdminUser> {
  return withMockFallback(
    () =>
      apiRequest<AdminUser>(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        body: payload,
      }),
    () => {
      const user = MOCK_ADMIN_USERS.find((item) => item.id === userId) ?? MOCK_ADMIN_USERS[0]
      return { ...user, ...payload }
    }
  )
}

export async function resetAdminUserPassword(userId: string, newPassword: string): Promise<void> {
  await withMockFallback(
    () =>
      apiRequest<void>(`/api/v1/admin/users/${userId}/password`, {
        method: "PATCH",
        body: { newPassword },
      }),
    () => undefined
  )
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await withMockFallback(
    () =>
      apiRequest<void>(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
      }),
    () => undefined
  )
}

export async function fetchAdminInviteCodes(): Promise<InviteCode[]> {
  return withMockFallback(
    () => apiRequest<InviteCode[]>("/api/v1/admin/invite-codes"),
    () => MOCK_INVITE_CODES
  )
}

export async function createAdminInviteCode(expiresInDays = 30): Promise<InviteCode> {
  return withMockFallback(
    () =>
      apiRequest<InviteCode>("/api/v1/admin/invite-codes", {
        method: "POST",
        body: { expiresInDays },
      }),
    () => ({
      id: `mock-${Date.now()}`,
      code: "VF-MOCK-0001",
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      status: "UNUSED",
    })
  )
}

export async function fetchAdminLogs(options?: {
  category?: LogCategory | "ALL"
  department?: string
  search?: string
  page?: number
  size?: number
}): Promise<AdminLogPageResponse> {
  const params = new URLSearchParams()
  const page = options?.page ?? 0
  const size = options?.size ?? 8

  if (options?.category && options.category !== "ALL") {
    params.set("category", options.category)
  }
  if (options?.department && options.department !== "ALL") {
    params.set("department", options.department)
  }
  if (options?.search?.trim()) {
    params.set("search", options.search.trim())
  }
  params.set("page", String(page))
  params.set("size", String(size))

  return withMockFallback(
    () => apiRequest<AdminLogPageResponse>(`/api/v1/admin/logs?${params.toString()}`),
    () => {
      const search = options?.search?.trim() ?? ""
      const filtered = MOCK_ADMIN_LOGS.filter((log) => {
        const categoryMatched =
          !options?.category || options.category === "ALL" || log.category === options.category
        const departmentMatched =
          !options?.department || options.department === "ALL" || log.department === options.department
        const searchMatched =
          !search ||
          matchesText(log.actor, search) ||
          matchesText(log.action, search) ||
          matchesText(log.detail, search)

        return categoryMatched && departmentMatched && searchMatched
      })

      return {
        items: paginate(filtered, page, size),
        total: filtered.length,
        page,
        size,
        departments: getLogDepartments(MOCK_ADMIN_LOGS),
      }
    }
  )
}

function buildAdminLogQueryParams(options?: {
  category?: LogCategory | "ALL"
  department?: string
  search?: string
}) {
  const params = new URLSearchParams({ format: "csv" })

  if (options?.category && options.category !== "ALL") {
    params.set("category", options.category)
  }
  if (options?.department && options.department !== "ALL") {
    params.set("department", options.department)
  }
  if (options?.search?.trim()) {
    params.set("search", options.search.trim())
  }

  return params
}

export async function exportAdminLogsCsv(options?: {
  category?: LogCategory | "ALL"
  department?: string
  search?: string
}): Promise<Blob> {
  const params = buildAdminLogQueryParams(options)
  return withMockFallback(
    () => apiDownload(`/api/v1/admin/logs/export?${params.toString()}`),
    () => {
      const csv = ["timestamp,category,actor,department,action,detail"]
        .concat(
          MOCK_ADMIN_LOGS.map((log) =>
            [log.timestamp, log.category, log.actor, log.department, log.action, log.detail ?? ""]
              .map((value) => `"${value.replaceAll("\"", "\"\"")}"`)
              .join(",")
          )
        )
        .join("\n")

      return new Blob([csv], { type: "text/csv;charset=utf-8" })
    }
  )
}

export async function fetchAdminProfile(): Promise<AdminProfile> {
  return withMockFallback(
    () => apiRequest<AdminProfile>("/api/v1/admin/me"),
    () => MOCK_ADMIN_PROFILE
  )
}

export async function updateAdminProfile(payload: UpdateAdminProfilePayload): Promise<AdminProfile> {
  return withMockFallback(
    () =>
      apiRequest<AdminProfile>("/api/v1/admin/me", {
        method: "PATCH",
        body: payload,
      }),
    () => ({ ...MOCK_ADMIN_PROFILE, ...payload })
  )
}

export async function updateAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await withMockFallback(
    () =>
      apiRequest<void>("/api/v1/admin/me/password", {
        method: "PATCH",
        body: { currentPassword, newPassword },
      }),
    () => undefined
  )
}

export async function fetchAdminEvidences(options?: {
  search?: string
  fileType?: EvidenceFileType | "ALL"
  status?: EvidenceStatus | "ALL"
  page?: number
  size?: number
}): Promise<AdminEvidencePageResponse> {
  const params = new URLSearchParams()
  const page = options?.page ?? 0
  const size = options?.size ?? 10

  if (options?.search?.trim()) {
    params.set("search", options.search.trim())
  }
  if (options?.fileType && options.fileType !== "ALL") {
    params.set("fileType", options.fileType)
  }
  if (options?.status && options.status !== "ALL") {
    params.set("status", options.status)
  }
  params.set("page", String(page))
  params.set("size", String(size))

  return withMockFallback(
    () => apiRequest<AdminEvidencePageResponse>(`/api/v1/admin/evidences?${params.toString()}`),
    () => {
      const search = options?.search?.trim() ?? ""
      const filtered = MOCK_ADMIN_EVIDENCES.filter((evidence) => {
        const fileTypeMatched =
          !options?.fileType || options.fileType === "ALL" || evidence.fileType === options.fileType
        const statusMatched =
          !options?.status || options.status === "ALL" || evidence.status === options.status
        const searchMatched =
          !search ||
          matchesText(evidence.fileName, search) ||
          matchesText(evidence.caseName, search) ||
          matchesText(evidence.hashValue, search)

        return fileTypeMatched && statusMatched && searchMatched
      })

      return {
        items: paginate(filtered, page, size),
        total: filtered.length,
        page,
        size,
      }
    }
  )
}

export async function fetchAdminEvidenceDetail(evidenceId: string): Promise<AdminEvidenceDetail> {
  return withMockFallback(
    () => apiRequest<AdminEvidenceDetail>(`/api/v1/admin/evidences/${evidenceId}`),
    () =>
      MOCK_ADMIN_EVIDENCES.find((evidence) => evidence.id === evidenceId) ??
      MOCK_ADMIN_EVIDENCES[0]
  )
}

export async function deleteAdminEvidence(evidenceId: string, reason: string): Promise<void> {
  await withMockFallback(
    () =>
      apiRequest<void>(`/api/v1/admin/evidences/${evidenceId}`, {
        method: "DELETE",
        body: { reason },
      }),
    () => undefined
  )
}
