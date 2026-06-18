import { apiRequest } from "@/lib/api/client"
import { mockFetchMyProfile, mockUpdateMyProfile } from "@/lib/mock-forensic-api"

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false"

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
  if (USE_MOCK_API) {
    return mockFetchMyProfile()
  }

  return apiRequest<UserProfile>("/api/v1/users/me")
}

export async function updateMyProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
  if (USE_MOCK_API) {
    return mockUpdateMyProfile(payload)
  }

  return apiRequest<UserProfile>("/api/v1/users/me", {
    method: "PATCH",
    body: payload,
  })
}
