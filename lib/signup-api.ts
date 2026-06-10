import { apiFetch } from "@/lib/api-client"
import type { OrgType } from "@/app/signup/organizationData"

export type SignupAgreements = {
  terms: boolean
  privacy: boolean
  security: boolean
  log: boolean
}

export type SignupRequest = {
  loginId: string
  password: string
  displayName: string
  organizationType: OrgType
  department: string
  position: string
  email: string
  phone: string
  inviteCode: string
  agreements: SignupAgreements
}

export type SignupResponse = {
  userId: string
  status: string
  message: string
}

export type UsernameCheckResponse = {
  available: boolean
}

export type InviteCodeValidateResponse = {
  valid: boolean
  expiresAt?: string
}

export type DepartmentsResponse = {
  departments: string[]
}

export async function signup(request: SignupRequest): Promise<SignupResponse> {
  return apiFetch<SignupResponse>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

export async function checkUsername(loginId: string): Promise<UsernameCheckResponse> {
  const params = new URLSearchParams({ loginId })
  return apiFetch<UsernameCheckResponse>(`/api/v1/auth/username/check?${params}`)
}

export async function validateInviteCode(
  code: string
): Promise<InviteCodeValidateResponse> {
  return apiFetch<InviteCodeValidateResponse>("/api/v1/invite-codes/validate", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
}

export async function fetchDepartments(
  organizationType: OrgType
): Promise<DepartmentsResponse> {
  const params = new URLSearchParams({ organizationType })
  return apiFetch<DepartmentsResponse>(
    `/api/v1/organizations/departments?${params}`
  )
}
