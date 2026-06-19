# 02 Mock Isolation 리포트

## 단계/대상 문서

- 단계: 02 mock/sample 격리
- 대상 문서: `docs/frontend/refactor/02-mock-isolation.md`
- 추가 안전 지시: 02 문서에 반영 완료
- 선행 상태: 01-utils-wiring은 `CONDITIONAL PASS`

## 변경한 파일

- `docs/frontend/refactor/02-mock-isolation.md`
  - 02 추가 안전 지시 16개 항목과 리포트 필수 검색/기록 항목을 문서에 추가했다.

- `lib/api/evidence-detail.ts`
  - `features.mockApi`가 true일 때만 mock 상세 API를 호출하도록 API 모듈 레이어에 mock/real 분기를 추가했다.
  - real 모드에서는 API 실패를 mock으로 대체하지 않고 그대로 에러를 전파한다.

- `lib/mock/forensic-api.ts`
  - 기존 `lib/mock-forensic-api.ts`를 mock 전용 경로로 이동했다.
  - 파일 내용은 유지했다. 목적은 mock API 경계를 `lib/mock` 아래로 명확히 두는 것이다.

- `lib/mock/analysis-result.ts`
  - `components/analysis-result.tsx` 안에 있던 `sampleFrameRisks`, `sampleReasonGroups`, `buildSampleResultData`를 mock 전용 파일로 이동했다.
  - 화면 컴포넌트가 sample builder를 직접 보유하지 않도록 분리했다.

- `components/analysis-result.tsx`
  - sample builder를 제거했다.
  - 프레임 점수/탐지 근거가 없을 때 "분석 근거 없음" 빈 상태를 표시하도록 수정했다.
  - 기존 "정상 영상으로 판정되었습니다" 문구를 제거해, 근거 없음이 정상 판정처럼 보이지 않게 했다.

- `app/evidences/[id]/page.tsx`
  - `sampleFrameRisks`, `sampleReasonGroups` 직접 import를 제거했다.
  - real 상세 화면에서 `riskScore`로 프레임/근거 데이터를 생성하지 않게 했다.
  - `COMPLETED`인데 모델 근거가 없으면 `riskLabel`을 "분석 근거 없음"으로 표시한다.

- `app/cases/[id]/page.tsx`
  - `riskScore` 기반 `buildFrameRisks`, `buildSuspiciousSegments`, `buildDetectionFindings`, `fallbackModules`를 제거했다.
  - 모델 결과는 백엔드 `analysisInfo.moduleResults`가 있을 때만 표시한다.
  - 프레임별 위험도, 의심 구간, 탐지 근거 상세, 정상/의심 비교는 실제 데이터가 없으면 "분석 근거 없음" 상태로 표시한다.

## mock으로 격리한 파일

```text
lib/mock/analysis-result.ts
lib/mock/forensic-api.ts
```

참고: 현재 git 상태에서는 `lib/mock/`가 untracked로 보인다. 기존 파일 이동은 `D lib/mock-forensic-api.ts`와 `?? lib/mock/` 조합으로 나타난다.

## real 경로에서 제거한 더미 생성 로직

- `app/cases/[id]/page.tsx`
  - `buildFrameRisks(seed, riskScore)` 제거
  - `buildSuspiciousSegments(riskScore)` 제거
  - `buildDetectionFindings(riskScore)` 제거
  - `fallbackModules(riskScore)` 제거

- `app/evidences/[id]/page.tsx`
  - `sampleFrameRisks(evidenceId, riskScore)` 사용 제거
  - `sampleReasonGroups(...)` 사용 제거

- `components/analysis-result.tsx`
  - `sampleFrameRisks`, `sampleReasonGroups`, `buildSampleResultData` 제거 후 `lib/mock/analysis-result.ts`로 이동

## real vs mock 분기 위치

- `lib/api/evidence-detail.ts`
  - `fetchEvidenceDetail(evidenceId)`
    - `features.mockApi === true`: `mockFetchEvidenceDetail(evidenceId)`
    - `features.mockApi === false`: `/api/v1/evidences/{id}/detail`
  - `fetchCaseDetail(caseId)`
    - `features.mockApi === true`: `mockFetchCaseDetail(caseId)`
    - `features.mockApi === false`: `/api/v1/cases?caseKey=...`

- `lib/api/admin.ts`
  - 기존 `USE_MOCK_ADMIN = features.mockApi` 유지.
  - `withMockFallback`은 이름상 fallback이지만 `USE_MOCK_ADMIN`이 true일 때만 mock 반환. real 모드 API 실패를 mock으로 대체하지 않는다.

## 상태 UI별 조건

- `/cases/{id}` 딥페이크/모델 분석 탭
  - `analysisInfo.moduleResults.length > 0`: 실제 모델 결과 카드 표시
  - `PENDING`: "분석 대기"
  - `PROCESSING`: "분석 중"
  - `COMPLETED`이고 근거 데이터 없음: "분석 근거 없음"
  - `FAILED`: "분석 실패로 근거 데이터를 표시할 수 없습니다."
  - 알 수 없는 상태: "현재 AI 분석 결과를 사용할 수 없습니다."

- `/evidences/{id}`
  - `PENDING`/`PROCESSING`: 기존 분석 진행 화면 표시
  - `COMPLETED`이고 `moduleResults` 없음: 결과 요약 라벨 "분석 근거 없음", 프레임/근거 영역도 "분석 근거 없음"
  - `riskScore`는 백엔드 값이면 전체 요약 점수로만 사용

## 필수 검색 결과

### riskScore 기반 파생 생성기가 real 경로에 남아 있는지

명령:

```bash
rg -n "riskScore.*frame|riskScore.*segment|riskScore.*reason|buildFrameRisks|buildSuspiciousSegments|buildDetectionFindings|fallbackModules" app components lib --glob '*.ts' --glob '*.tsx'
```

결과:

```text
검색 결과 없음
```

판정: OK. real 경로에 `riskScore` 기반 프레임/구간/근거 생성기는 남아 있지 않다.

### sampleFrameRisks, sampleReasonGroups, buildSampleResultData 사용처

명령:

```bash
rg -n "sampleFrameRisks|sampleReasonGroups|buildSampleResultData" app components lib --glob '*.ts' --glob '*.tsx'
```

결과:

```text
lib/mock/analysis-result.ts:22:export function sampleFrameRisks(seed: number, riskScore: number): FrameRiskBar[] {
lib/mock/analysis-result.ts:34:export function sampleReasonGroups(isHigh: boolean): ReasonGroup[] {
lib/mock/analysis-result.ts:68:export function buildSampleResultData(params: {
lib/mock/analysis-result.ts:93:    frameRisks: sampleFrameRisks(seed, riskScore),
lib/mock/analysis-result.ts:94:    reasonGroups: tone === "green" ? [] : sampleReasonGroups(tone === "red"),
```

판정: OK. sample builder는 `lib/mock` 아래에만 남아 있고, 화면 컴포넌트 직접 import는 없다.

### lib/mock 또는 _mock import 사용처

명령:

```bash
rg -n "@/lib/mock|lib/mock|_mock" app components lib --glob '*.ts' --glob '*.tsx'
```

결과:

```text
lib/api/evidence-detail.ts:3:import { mockFetchCaseDetail, mockFetchEvidenceDetail } from "@/lib/mock/forensic-api"
```

판정: OK. mock import는 API 모듈 레이어에만 있다.

### features.mockApi 사용 위치

명령:

```bash
rg -n "features\\.mockApi" app components lib --glob '*.ts' --glob '*.tsx'
```

결과:

```text
lib/api/evidence-detail.ts:95:  if (features.mockApi) {
lib/api/evidence-detail.ts:103:  if (features.mockApi) {
lib/api/admin.ts:192:const USE_MOCK_ADMIN = features.mockApi
```

판정: OK. 신규 detail mock 분기는 API 모듈 레이어에 있다. admin mock 분기는 기존 구조이며 `features.mockApi` 게이트를 사용한다.

### real 모드에서 mock fallback이 존재하는지

확인 결과:

- `lib/api/evidence-detail.ts`: real 모드에서는 mock 호출 없음. API 실패 시 mock으로 대체하지 않음.
- `lib/api/admin.ts`: `withMockFallback`은 `USE_MOCK_ADMIN`이 true일 때만 fallback 반환. real 모드에서는 error를 throw.
- 화면 catch 블록에서 mock 데이터를 대체 반환하는 로직은 이번 02 대상 경로에서 발견하지 못했다.

판정: OK.

## npm run build 결과

명령:

```bash
npm run build
```

결과:

```text
exit code 0
Compiled successfully
```

주의:

- 빌드 로그상 `Skipping validation of types`로 표시된다. `next.config`의 타입 에러 무시 정책 때문에 별도 타입 검증과 동일하지 않다.

## 실행하지 못한 검증과 이유

- `npm run lint`
  - 실행 결과: exit code 127
  - 이유: `eslint: command not found`
  - 02 안전 지시에 따라 패키지 설치/수정으로 해결하지 않았다.

- `npm run typecheck`
  - `package.json`에 script 없음.

- 관련 테스트
  - `package.json`에 test script 없음.

## git status --short

```text
 M app/cases/[id]/page.tsx
 M app/evidences/[id]/page.tsx
 M components/analysis-result.tsx
 M docs/frontend/refactor/02-mock-isolation.md
 M lib/api/evidence-detail.ts
 M lib/formatters.ts
 D lib/mock-forensic-api.ts
 M next-env.d.ts
 M tsconfig.tsbuildinfo
?? docs/frontend/local-dev.md
?? docs/frontend/refactor/reports/01-utils-wiring.audit.report.md
?? lib/mock/
?? tmp-upload-test.mp4
```

참고:

- `lib/formatters.ts`, `docs/frontend/refactor/reports/01-utils-wiring.audit.report.md`는 01 사후 검증에서 생긴 변경이다.
- `next-env.d.ts`, `tsconfig.tsbuildinfo`, `docs/frontend/local-dev.md`, `tmp-upload-test.mp4`는 02 시작 전부터 있던 변경물이며 되돌리거나 정리하지 않았다.

## 남은 위험

- 백엔드 타입에 아직 `frame_scores`, `suspicious_segments`, `detection_reasons`, `reasonGroups` 필드가 없다. 해당 API가 생기면 타입과 UI 매핑을 별도로 추가해야 한다.
- `components/analysis-result.tsx`의 `evidenceState`, `evidenceMessage` 필드는 현재 빈 상태 확장을 위해 타입에 추가했지만, 실제 화면에서는 메시지 prop을 세밀하게 쓰지는 않는다. 03 컴포넌트 분리 때 정리 가능하다.
- `app/cases/[id]/page.tsx`에는 이제 사용되지 않는 카드/차트 보조 컴포넌트가 남아 있을 수 있다. 02 범위에서 대규모 컴포넌트 정리를 하지 않기 위해 제거하지 않았다. 03에서 정리 대상이다.
- lint/typecheck가 실행되지 않는 상태라 정적 unused 검증은 완료하지 못했다.

## 03으로 넘어가도 되는지 여부

조건부 가능.

02의 핵심 목표인 "real 모드에서 riskScore 기반 더미 근거를 만들지 않기"와 "mock 생성기를 `lib/mock`으로 격리하기"는 충족했다. 다만 03으로 넘어가기 전에 리뷰어는 아래를 확인하는 것이 좋다.

- `/cases/{id}` 딥페이크 탭에서 실제 `moduleResults`가 있는 경우 카드가 정상 표시되는지.
- `/cases/{id}`와 `/evidences/{id}`에서 근거가 없을 때 "분석 근거 없음"이 정상/원본 판정처럼 보이지 않는지.
- mock 모드에서 `lib/api/evidence-detail.ts`가 `lib/mock/forensic-api.ts`를 통해 데이터를 가져오는지.
- 03에서 unused helper/component 정리를 할 때 UI 레이아웃이 흔들리지 않는지.
