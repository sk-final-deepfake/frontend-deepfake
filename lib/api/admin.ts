import { apiDownload, apiRequest } from "@/lib/api/client"
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

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiRequest<AdminDashboardStats>("/api/v1/admin/dashboard/stats")
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
  return apiRequest<AdminUserPageResponse>(`/api/v1/admin/users?${query}`)
}

export async function approveAdminUser(userId: string): Promise<AdminUserStatusResponse> {
  return apiRequest<AdminUserStatusResponse>(`/api/v1/admin/users/${userId}/approve`, {
    method: "POST",
  })
}

export async function rejectAdminUser(userId: string): Promise<AdminUserStatusResponse> {
  return apiRequest<AdminUserStatusResponse>(`/api/v1/admin/users/${userId}/reject`, {
    method: "POST",
  })
}

export async function updateAdminUser(
  userId: string,
  payload: UpdateAdminUserPayload
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/api/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: payload,
  })
}

export async function resetAdminUserPassword(userId: string, newPassword: string): Promise<void> {
  await apiRequest<void>(`/api/v1/admin/users/${userId}/password`, {
    method: "PATCH",
    body: { newPassword },
  })
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await apiRequest<void>(`/api/v1/admin/users/${userId}`, {
    method: "DELETE",
  })
}

export async function fetchAdminInviteCodes(): Promise<InviteCode[]> {
  return apiRequest<InviteCode[]>("/api/v1/admin/invite-codes")
}

export async function createAdminInviteCode(expiresInDays = 30): Promise<InviteCode> {
  return apiRequest<InviteCode>("/api/v1/admin/invite-codes", {
    method: "POST",
    body: { expiresInDays },
  })
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

  return apiRequest<AdminLogPageResponse>(`/api/v1/admin/logs?${params.toString()}`)
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
  return apiDownload(`/api/v1/admin/logs/export?${params.toString()}`)
}

export async function fetchAdminProfile(): Promise<AdminProfile> {
  return apiRequest<AdminProfile>("/api/v1/admin/me")
}

export async function updateAdminProfile(payload: UpdateAdminProfilePayload): Promise<AdminProfile> {
  return apiRequest<AdminProfile>("/api/v1/admin/me", {
    method: "PATCH",
    body: payload,
  })
}

export async function updateAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiRequest<void>("/api/v1/admin/me/password", {
    method: "PATCH",
    body: { currentPassword, newPassword },
  })
}

type AdminEvidencePageResponse = {
  items: AdminEvidence[]
  total: number
  page: number
  size: number
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

  return apiRequest<AdminEvidencePageResponse>(`/api/v1/admin/evidences?${params.toString()}`)
}

export async function fetchAdminEvidenceDetail(evidenceId: string): Promise<AdminEvidenceDetail> {
  return apiRequest<AdminEvidenceDetail>(`/api/v1/admin/evidences/${evidenceId}`)
}

export async function deleteAdminEvidence(evidenceId: string, reason: string): Promise<void> {
  await apiRequest<void>(`/api/v1/admin/evidences/${evidenceId}`, {
    method: "DELETE",
    body: { reason },
  })
}
