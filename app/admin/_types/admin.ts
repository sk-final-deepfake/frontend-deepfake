export type UserStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface AdminUser {
  id: string
  username: string
  displayName: string
  email: string
  department: string
  joinedAt: string
  status: UserStatus
}

export type InviteCodeStatus = "UNUSED" | "USED" | "EXPIRED"

export interface InviteCode {
  id: string
  code: string
  createdAt: string
  expiresAt: string
  status: InviteCodeStatus
  usedBy?: string
}

export type LogCategory = "AUTH" | "ANALYSIS" | "ADMIN" | "COC"

export interface AdminLog {
  id: string
  timestamp: string
  category: LogCategory
  actor: string
  actorId: string
  action: string
  detail?: string
}

export interface AdminProfile {
  username: string
  displayName: string
  email: string
  department: string
  phone: string
  role: string
}
