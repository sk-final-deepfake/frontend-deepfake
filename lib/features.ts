// 프론트엔드 feature flag 모음.
// 환경변수(NEXT_PUBLIC_*)를 직접 화면에서 읽지 말고 이 객체를 통해 사용한다.
//
// .env.local 예시:
//   NEXT_PUBLIC_USE_MOCK_API=false      // true면 mock 데이터 사용
//   NEXT_PUBLIC_UPLOAD_ONLY_MODE=true   // S3/AI 미연동 구간: 업로드만 확인하는 모드

export const features = {
  // mock API 모드. true일 때만 mock/sample 데이터를 사용한다.
  mockApi: process.env.NEXT_PUBLIC_USE_MOCK_API === "true",
  // 업로드 전용 모드. S3/AI 미연동 시 분석 시작/상세 결과를 제한한다.
  uploadOnlyMode: process.env.NEXT_PUBLIC_UPLOAD_ONLY_MODE === "true",
} as const
