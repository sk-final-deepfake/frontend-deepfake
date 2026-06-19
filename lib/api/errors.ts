// API 에러 메시지 추출 공통화.
// 화면에서 catch한 에러를 사용자에게 보여줄 문구로 바꾼다.

import { ApiError } from "@/lib/api/client"

// 알 수 없는 에러에서 사용자 표시용 메시지를 뽑는다.
export function getApiErrorMessage(error: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

// 인증 만료/미인증(401) 여부.
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
