const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1"

export type SignupRequest = {
  loginId: string
  password: string
  displayName: string
  organizationType: string
  department: string
  position: string
  email: string
  phone: string
  inviteCode: string
  agreements: {
    terms: boolean
    privacy: boolean
    security: boolean
    log: boolean
  }
}

export type SignupResponse = {
  userId: string
  status: "PENDING" | string
  message: string
}

type ApiErrorBody = {
  error?: string
  message?: string
  details?: {
    field?: string
    reason?: string
  }[]
}

function getSignupErrorMessage(body: ApiErrorBody | null) {
  return (
    body?.details?.[0]?.reason ||
    body?.message ||
    "가입 신청 중 오류가 발생했습니다."
  )
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error("가입 신청 중 오류가 발생했습니다.")
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null

    try {
      body = await response.json()
    } catch {
      body = null
    }

    throw new Error(getSignupErrorMessage(body))
  }

  return response.json() as Promise<SignupResponse>
}
