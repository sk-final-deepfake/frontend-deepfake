import { ApiError, apiRequest } from "@/lib/api/client"
import { features } from "@/lib/features"

export type ReportVerifyStatus = "VALID" | "WARNING" | "INVALID"

export type ReportVerification = {
  status: ReportVerifyStatus
  valid: boolean
  message: string
  reportNo: string
  evidenceId: number
  reportFileName: string
  createdAt: string
  reportHash: string
  hashMatched: boolean
  signatureValid: boolean | null
  signatureStatus: string
  signatureAlgorithm?: string | null
  signerCertificateSubject?: string | null
  blockchainMatched: boolean | null
  blockchainStatus: string
  blockchainTxHash?: string | null
  blockchainNetwork?: string | null
  blockchainAnchoredAt?: string | null
}

/**
 * 공개 검증 API. 로그인 없이 접근하므로 인증 헤더를 붙이지 않는다.
 * 목업 모드에서는 토큰 문자열로 상태를 분기한다:
 *  - "invalid" 포함 → INVALID, "warning" 포함 → WARNING
 *  - "notfound" 포함 → 404 오류, 그 외 → VALID
 */
export async function fetchReportVerification(token: string): Promise<ReportVerification> {
  if (features.mockApi) {
    await delay(450)
    return buildMockVerification(token)
  }

  const query = new URLSearchParams({ token })
  return apiRequest<ReportVerification>(`/api/v1/public/reports/verify?${query.toString()}`, {
    auth: false,
  })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildMockVerification(token: string): ReportVerification {
  const normalized = token.toLowerCase()

  if (normalized.includes("notfound") || normalized.includes("expired")) {
    throw new ApiError("등록되지 않은 검증 토큰입니다.", 404, "REPORT_TOKEN_NOT_FOUND")
  }

  const base: ReportVerification = {
    status: "VALID",
    valid: true,
    message: "이 보고서는 발급 이후 변조되지 않았습니다.",
    reportNo: "RPT-2026-0703-0012",
    evidenceId: 2024062716,
    reportFileName: "ForenShield_Report_EVD-2024062716.pdf",
    createdAt: "2026-07-03T13:28:00+09:00",
    reportHash: "a3f81c09d2e47b16f8c05a913e2d84c7715f0b6a8d94e21c3b7f6a0d5e8c92d4",
    hashMatched: true,
    signatureValid: true,
    signatureStatus: "SIGNED",
    signatureAlgorithm: "SHA256withRSA",
    signerCertificateSubject: "CN=ForenShield Evidence Authority, O=ForenShield, C=KR",
    blockchainMatched: true,
    blockchainStatus: "ANCHORED",
    blockchainTxHash: "0x8f3a2c91b7d4e60a5c18f2b9e73d40c6a1f58b02d9e47c3a6b80f15d2e9c74a3",
    blockchainNetwork: "ForenShield Chain",
    blockchainAnchoredAt: "2026-07-03T13:29:10+09:00",
  }

  if (normalized.includes("invalid")) {
    return {
      ...base,
      status: "INVALID",
      valid: false,
      message: "발급 기록과 일치하지 않는 보고서입니다.",
      hashMatched: false,
      reportHash: "7b02ff41c8a9d3e6b5f21c08a7d94e3f612c8b0a5d7e94f1c3a6b8d20e5f13c9",
      signatureValid: false,
      signatureStatus: "TAMPERED",
    }
  }

  if (normalized.includes("warning")) {
    return {
      ...base,
      status: "WARNING",
      valid: true,
      message: "일부 항목을 자동으로 확인하지 못했습니다.",
      blockchainMatched: false,
      blockchainStatus: "NOT_ANCHORED",
      blockchainTxHash: null,
      blockchainNetwork: null,
      blockchainAnchoredAt: null,
    }
  }

  return base
}
