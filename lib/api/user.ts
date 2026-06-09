import { apiRequest } from "@/lib/api/client"

export type UserProfile = {
  userId: number
  loginId: string
  email: string
  name: string
  department: string
  role: string
  status: string
  darkMode: boolean
  createdAt: string
}

export type UpdateUserProfilePayload = {
  loginId: string
  department: string
  currentPassword: string
  newPassword?: string
}

export async function fetchMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/v1/users/me")
}

export async function updateMyProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
  return apiRequest<UserProfile>("/api/v1/users/me", {
    method: "PATCH",
    body: payload,
  })
}
