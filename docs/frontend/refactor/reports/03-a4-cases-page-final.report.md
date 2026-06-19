# 03-A4 cases page 마무리 리포트

## 판정

CONDITIONAL PASS

사유:
- `app/cases/[id]/page.tsx`에서 A1/A2/A3 분리 후 남은 명확한 미사용 import/helper/component를 제거했다.
- `git diff --check`와 `npm run build`는 통과했다.
- `npm run lint`는 `eslint` 바이너리 부재, `typecheck`/`test`는 script 부재로 실행 검증이 불가했다.
- `npm run build`는 통과했지만 현재 Next 설정상 type validation이 skip된다.

## 변경한 파일

- `app/cases/[id]/page.tsx`
  - 분리 이후 정의만 남은 미사용 helper/component와 관련 import를 제거했다.
  - 사건 조회, 증거 선택, 증거 상세 조회, 탭 조립, 복사 상태 소유 위치는 변경하지 않았다.
- `docs/frontend/refactor/reports/03-a4-cases-page-final.report.md`
  - 03-A4 마무리 정리와 검증 결과를 기록했다.

## 정리한 항목

### 제거한 미사용 import

- `type LucideIcon`
  - `StatusPanel` 제거 후 사용처 없음.
- `Badge`
  - 미사용 `CocTimelineItem` 제거 후 사용처 없음.
- `CocLog`
  - 미사용 CoC helper 제거 후 사용처 없음.
- `cn`
  - A3 분리 이후 `page.tsx` 내 호출 없음.

### 제거한 미사용 helper/component

- `formatDuration`
  - 검색 결과 정의만 있고 실제 사용처 없음.
- `StatusPanel`
  - 검색 결과 정의만 있고 실제 사용처 없음.
- `InfoBox`
  - 검색 결과 정의만 있고 실제 사용처 없음.
- `formatClockTime`
  - 미사용 CoC helper에서만 사용되어 함께 제거.
- `getCocEventTitle`
  - 미사용 `CocTimelineItem` 내부에서만 사용되어 함께 제거.
- `getCocDetail`
  - 미사용 `CocTimelineItem` 내부에서만 사용되어 함께 제거.
- `CocTimelineItem`
  - 검색 결과 정의만 있고 실제 렌더링 사용처 없음.

### 유지한 항목과 이유

- `getRiskClassName`
  - `EvidenceWorkspace`에서 탭 props 조립에 사용 중.
- `buildProgressSteps`
  - `SummaryTab`에 전달되는 진행 상태 props 생성에 사용 중.
- `getStatusLabel`, `getCaseStatusLabel`, `normalizeStatus`
  - Summary/selector/header 상태 표시 흐름에 사용 중.
- `copyHash`, `copied` state
  - Integrity 탭 복사 버튼 동작을 유지하기 위해 `page.tsx`에 남김.

## page.tsx 줄 수

- 변경 전: 538
- 변경 후: 425

## 현재 cases/[id] 파일 구조

```text
app/cases/[id]/
  page.tsx
  _components/
    case-hero.tsx
    deepfake-model-tab.tsx
    evidence-selector.tsx
    evidence-summary-card.tsx
    integrity-tab.tsx
    metadata-report-tab.tsx
    summary-meta-item.tsx
    summary-tab.tsx
```

## page.tsx에 남은 책임

- 데이터 로딩: `fetchCaseDetail`, `fetchEvidenceDetail` 호출과 결과 state 설정
- 상태 분기: 사건 로딩/사건 에러/증거 상세 로딩/증거 상세 에러/빈 상태
- 증거 선택: `selectedEvidenceId` 소유 및 `EvidenceSelector`에 전달
- 증거 상세 로딩: 선택된 evidenceId 변경에 따른 상세 요청
- 탭 조립: Summary/Deepfake/Integrity/MetadataReport 탭 컴포넌트 props 조립
- 에러 처리: 401/404 포함 `getErrorMessage` 유지
- 복사 상태: `copied` state와 `copyHash` timeout 유지

## 유지한 동작

- 사건 상세 로딩
- 증거 선택
- 증거 상세 로딩
- 탭 전환
- Deepfake 탭
- Integrity 탭
- Metadata/Report 탭
- 401/404 에러 메시지
- “분석 근거 없음” 분기
- 복사 버튼 동작

## 02 mock/real 정책 유지 여부

- fake evidence 생성 로직 부활 여부: 부활하지 않음
- riskScore 기반 frame/segment/finding 생성 여부: 생성하지 않음
- mock import 위치 변화 여부: 변화 없음. mock import는 API layer인 `lib/api/evidence-detail.ts`에서만 확인됨.

## 검색 결과

### fake evidence 검색 결과

명령:

```bash
rg -n "buildFrameRisks|buildSuspiciousSegments|buildDetectionFindings|fallbackModules|sampleFrameRisks|sampleReasonGroups|buildSampleResultData" app components lib --glob '*.ts' --glob '*.tsx'
```

결과:

```text
lib/mock/analysis-result.ts:22:export function sampleFrameRisks(seed: number, riskScore: number): FrameRiskBar[] {
lib/mock/analysis-result.ts:34:export function sampleReasonGroups(isHigh: boolean): ReasonGroup[] {
lib/mock/analysis-result.ts:68:export function buildSampleResultData(params: {
lib/mock/analysis-result.ts:93:    frameRisks: sampleFrameRisks(seed, riskScore),
lib/mock/analysis-result.ts:94:    reasonGroups: tone === "green" ? [] : sampleReasonGroups(tone === "red"),
```

해석:
- fake/sample builder는 `lib/mock/analysis-result.ts` mock 전용 파일에만 존재한다.
- `app/cases/[id]/page.tsx`와 화면 컴포넌트에서 직접 사용하지 않는다.

### mock import 검색 결과

명령:

```bash
rg -n "@/lib/mock|lib/mock|_mock" app components lib --glob '*.ts' --glob '*.tsx'
```

결과:

```text
lib/api/evidence-detail.ts:3:import { mockFetchCaseDetail, mockFetchEvidenceDetail } from "@/lib/mock/forensic-api"
```

해석:
- mock import는 API module layer에만 있다.
- 화면 컴포넌트로 mock import가 퍼지지 않았다.

### formatDuration / StatusPanel / InfoBox 사용처 확인 결과

명령:

```bash
rg -n "formatDuration|StatusPanel|InfoBox" 'app/cases/[id]/page.tsx' 'app/cases/[id]/_components' --glob '*.tsx'
```

결과:

```text
검색 결과 없음
```

해석:
- 세 후보는 실제 사용처가 없어 제거 완료했다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git diff --check` | 0 | 통과 |
| `npm run build` | 0 | 통과. Next build compiled successfully. 타입 검증은 기존 설정대로 skipped |
| `npm run lint` | 127 | 실패. `eslint: command not found` |
| `npm run typecheck` | 1 | 실패. `Missing script: "typecheck"` |
| `npm run test` | 1 | 실패. `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- `npm run lint`: `eslint` 바이너리가 없어 실행 불가. 패키지 설치 금지 지시에 따라 조치하지 않음.
- `npm run typecheck`: `package.json`에 `typecheck` script가 없어 실행 불가.
- `npm run test`: `package.json`에 `test` script가 없어 실행 불가.

## 남은 위험

- `npm run build`가 통과했지만 type validation이 skip되어 정적 타입 검증은 별도 확인이 필요하다.
- 브라우저 클릭 테스트는 수행하지 않았다. 다만 API 호출, state/effect 소유 위치, 탭 조립 props, 복사 callback 구조는 변경하지 않았다.
- 현재 git 상태에는 01/02/03-A1/A2/A3에서 발생한 기존 변경과 untracked 파일이 함께 남아 있다. 이번 A4에서는 `app/cases/[id]/page.tsx`와 이 리포트만 추가로 변경했다.

## 03-B로 넘어가도 되는지 여부

가능.

단, 03-B에서도 02 mock/real 정책을 유지하고, upload/polling/API 호출 시점 변경 없이 표현 컴포넌트 분리부터 진행해야 한다.

## git status --short

```text
 M app/cases/[id]/page.tsx
 M app/evidences/[id]/page.tsx
 M components/analysis-result.tsx
 M docs/frontend/refactor/02-mock-isolation.md
 M docs/frontend/refactor/03-component-split.md
 M lib/api/evidence-detail.ts
 M lib/formatters.ts
 D lib/mock-forensic-api.ts
 M next-env.d.ts
 M tsconfig.tsbuildinfo
?? app/cases/[id]/_components/
?? docs/frontend/local-dev.md
?? docs/frontend/refactor/reports/01-utils-wiring.audit.report.md
?? docs/frontend/refactor/reports/02-mock-isolation.report.md
?? docs/frontend/refactor/reports/03-a1-cases-summary.report.md
?? docs/frontend/refactor/reports/03-a2-cases-deepfake-tab.report.md
?? docs/frontend/refactor/reports/03-a3-cases-integrity-metadata.report.md
?? docs/frontend/refactor/reports/03-a4-cases-page-final.report.md
?? lib/mock/
?? tmp-upload-test.mp4
```
