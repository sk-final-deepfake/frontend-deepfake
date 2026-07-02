import type { CaseStatus, CaseSummary } from "@/app/mypage/_types/case"
import type { AuthSession } from "@/lib/auth"

export type UserRole = "ORG_ADMIN" | "INVESTIGATOR" | "REVIEWER"

export type ReviewStatus =
  | "NONE"
  | "REVIEW_REQUESTED"
  | "REVIEW_ASSIGNED"
  | "REVIEW_COMPLETED"
  | "REPORT_APPROVED"

export type AiResult = "낮음" | "검토 필요" | "위험"

export type AppUser = {
  id: string
  name: string
  organizationId: string
  organizationName: string
  department: string
  role: UserRole
}

export type CaseAccessItem = {
  organizationId?: string | null
  createdBy?: string | null
  assigneeId?: string | null
  reviewerId?: string | null
  reviewStatus?: ReviewStatus | null
  status?: CaseStatus | string | null
}

export const roleLabelMap: Record<UserRole, string> = {
  ORG_ADMIN: "관리자",
  INVESTIGATOR: "분석관",
  REVIEWER: "검토자",
}

export const reviewStatusLabelMap: Record<ReviewStatus, string> = {
  NONE: "검토 없음",
  REVIEW_REQUESTED: "검토 요청됨",
  REVIEW_ASSIGNED: "검토 중",
  REVIEW_COMPLETED: "검토 완료",
  REPORT_APPROVED: "보고서 승인 완료",
}

export const mockUsers: AppUser[] = [
  {
    id: "user-001",
    name: "김민희",
    organizationId: "org-police-seoul",
    organizationName: "서울경찰청",
    department: "사이버수사팀",
    role: "INVESTIGATOR",
  },
  {
    id: "user-002",
    name: "박검토",
    organizationId: "org-police-seoul",
    organizationName: "서울경찰청",
    department: "디지털포렌식팀",
    role: "REVIEWER",
  },
  {
    id: "user-003",
    name: "이관리",
    organizationId: "org-police-seoul",
    organizationName: "서울경찰청",
    department: "관리자실",
    role: "ORG_ADMIN",
  },
]

export function normalizeUserRole(role?: string | null): UserRole {
  const normalized = (role ?? "").trim().toUpperCase()
  if (normalized === "ORG_ADMIN" || normalized === "ROLE_ORG_ADMIN" || normalized === "ADMIN" || normalized === "ROLE_ADMIN") {
    return "ORG_ADMIN"
  }
  if (normalized === "REVIEWER" || normalized === "ROLE_REVIEWER") {
    return "REVIEWER"
  }
  return "INVESTIGATOR"
}

export function getMockUserByRole(role: UserRole) {
  return mockUsers.find((user) => user.role === role) ?? mockUsers[0]
}

export function getAppUserFromSession(session: AuthSession | null): AppUser | null {
  if (!session) return null

  const role = normalizeUserRole(session.role)
  const mappedMockUser =
    session.loginId === "1111"
      ? getMockUserByRole("INVESTIGATOR")
      : session.loginId === "5555"
        ? getMockUserByRole("REVIEWER")
        : session.loginId === "9999"
          ? getMockUserByRole("ORG_ADMIN")
          : null
  const base = mappedMockUser ?? getMockUserByRole(role)

  return {
    ...base,
    id: mappedMockUser ? base.id : String(session.userId || base.id),
    name: session.name || base.name,
    role,
  }
}

export function isOrgAdmin(user: AppUser) {
  return user.role === "ORG_ADMIN"
}

export function isInvestigator(user: AppUser) {
  return user.role === "INVESTIGATOR"
}

export function isReviewer(user: AppUser) {
  return user.role === "REVIEWER"
}

export function isSameOrganization(user: AppUser, caseItem: CaseAccessItem) {
  return (caseItem.organizationId ?? user.organizationId) === user.organizationId
}

export function isCaseOwner(user: AppUser, caseItem: CaseAccessItem) {
  return caseItem.createdBy === user.id || caseItem.assigneeId === user.id
}

export function isAssignedReviewer(user: AppUser, caseItem: CaseAccessItem) {
  return caseItem.reviewerId === user.id
}

export function canViewCase(user: AppUser, caseItem: CaseAccessItem) {
  if (!isSameOrganization(user, caseItem)) return false
  if (isOrgAdmin(user)) return true
  if (isCaseOwner(user, caseItem)) return true
  if (isAssignedReviewer(user, caseItem)) return true
  return false
}

export function canCreateCase(user: AppUser | null) {
  if (!user) return true
  return isOrgAdmin(user) || isInvestigator(user)
}

export function canUploadEvidence(user: AppUser, caseItem: CaseAccessItem) {
  if (!canViewCase(user, caseItem)) return false
  return isOrgAdmin(user) || isCaseOwner(user, caseItem)
}

export function canRequestAnalysis(user: AppUser, caseItem: CaseAccessItem) {
  if (!canViewCase(user, caseItem)) return false
  return isOrgAdmin(user) || isCaseOwner(user, caseItem)
}

export function canRequestReview(user: AppUser, caseItem: CaseAccessItem) {
  if (!canViewCase(user, caseItem)) return false
  return (
    (isOrgAdmin(user) || isCaseOwner(user, caseItem)) &&
    caseItem.status === "COMPLETED" &&
    (caseItem.reviewStatus ?? "NONE") === "NONE"
  )
}

export function canAssignReviewer(user: AppUser, caseItem: CaseAccessItem) {
  if (!canViewCase(user, caseItem)) return false
  return isOrgAdmin(user) && (caseItem.reviewStatus ?? "NONE") === "REVIEW_REQUESTED"
}

export function canApproveReport(user: AppUser, caseItem: CaseAccessItem) {
  if (!canViewCase(user, caseItem)) return false
  return isOrgAdmin(user) || isAssignedReviewer(user, caseItem)
}

export function canDeleteCase(user: AppUser, caseItem: CaseAccessItem) {
  if (!canViewCase(user, caseItem)) return false
  return isOrgAdmin(user)
}

export function getVisibleCases(user: AppUser | null, cases: CaseSummary[]) {
  if (!user) return cases
  return cases.filter((caseItem) => canViewCase(user, caseItem))
}
