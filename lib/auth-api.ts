import { apiFetch } from "@/lib/api-client"

export type LoginRequest = {
  loginId: string
  password: string
}

export type LoginResponse = {
  success: boolean
  token: string
  userId: number
  loginId: string
  name: string
  role: "ROLE_USER" | "ROLE_ADMIN"
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  })
}
