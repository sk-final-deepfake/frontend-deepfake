const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

// 백엔드 FileUploadResponse DTO와 동일한 구조
export interface FileUploadResponse {
  success: boolean
  message: string
  evidenceId: number
  fileName: string
  fileSize: number
  hashAlgorithm: string
  hashValue: string
  metadata: unknown
}

// 백엔드 ErrorResponse DTO와 동일한 구조
export interface ApiError {
  success: false
  errorCode: string
  message: string
}

export async function uploadEvidence(file: File): Promise<FileUploadResponse> {
  const formData = new FormData()
  // "file"은 백엔드 @RequestParam("file")과 이름이 일치해야 함
  formData.append("file", file)

  const res = await fetch(`${API_BASE}/api/evidences/upload`, {
    method: "POST",
    // Content-Type 수동 지정 금지 — 브라우저가 multipart boundary 포함해 자동 설정
    body: formData,
  })

  const body = await res.json()
  if (!res.ok) {
    throw new Error((body as ApiError).message ?? "파일 업로드에 실패했습니다.")
  }
  return body as FileUploadResponse
}
