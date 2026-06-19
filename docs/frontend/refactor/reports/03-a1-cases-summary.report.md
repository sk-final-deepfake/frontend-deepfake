# 03-A1 cases summary 분리 리포트

## 판정

CONDITIONAL PASS

`app/cases/[id]/page.tsx`에서 Header / Summary / Evidence 선택 영역의 props-only 표현 컴포넌트만 분리했다. `fetchCaseDetail`, `fetchEvidenceDetail`, 상태/effect, 탭 조립, 복사 상태, 02의 "분석 근거 없음" 분기는 `page.tsx`에 유지했다.

조건부 판정 사유:

- `npm run build`와 ` ㅁgit diff --check`는 통과했다.
- `npm run lint`는 `eslint: command not found`로 실패했다.
- `npm run typecheck`, `npm run test`는 script가 없다.
- 워크트리에 01/02 단계 및 기존 생성물 변경이 이미 섞여 있어, 03-A1 단독 diff만으로 깔끔한 상태는 아니다.

## 변경한 파일

03-A1에서 직접 변경/추가한 파일:

- `app/cases/[id]/page.tsx`
  - 사건 헤더, 증거 선택, 증거 요약 카드, Summary 탭 표현 컴포넌트를 route-local 파일로 분리하고 import 연결.
  - state/effect/API 호출/탭 조립/복사 상태/딥페이크·무결성·메타데이터 탭은 유지.

- `app/cases/[id]/_components/case-hero.tsx`
  - 사건명, 사건 ID, 생성일/상태/증거 수 요약 칩 표시.

- `app/cases/[id]/_components/evidence-selector.tsx`
  - 좌측 증거 파일 목록과 선택 버튼 UI 표시.

- `app/cases/[id]/_components/evidence-summary-card.tsx`
  - 선택된 증거의 파일명, 배지, 기본 메타, 실패 사유 표시.

- `app/cases/[id]/_components/summary-meta-item.tsx`
  - 증거 요약 카드 내부의 라벨/값 메타 행 표시.

- `app/cases/[id]/_components/summary-tab.tsx`
  - Summary 탭의 판정 요약, 분석 결과 요약, 보고서 상태, 진행 요약 표시.

작업 전부터 변경되어 있던 파일은 되돌리거나 정리하지 않았다.

## 분리한 컴포넌트 목록

- `CaseHero`
- `EvidenceSelector`
- `EvidenceThumbnail`
- `EvidenceSummaryCard`
- `SummaryMetaItem`
- `SummaryTab`
- `CompactPanel`
- `InfoLine`
- `ModuleMini`
- `ProgressTimeline`

## 새 파일 구조

```text
app/cases/[id]/_components/
  case-hero.tsx
  evidence-selector.tsx
  evidence-summary-card.tsx
  summary-meta-item.tsx
  summary-tab.tsx
```

## page.tsx 줄 수

- 변경 전: 1643
- 변경 후: 1286

## 새 파일별 줄 수

```text
  53 app/cases/[id]/_components/case-hero.tsx
 113 app/cases/[id]/_components/evidence-selector.tsx
  67 app/cases/[id]/_components/evidence-summary-card.tsx
  21 app/cases/[id]/_components/summary-meta-item.tsx
 160 app/cases/[id]/_components/summary-tab.tsx
```

## 유지한 동작

- 사건 상세 로딩
  - `fetchCaseDetail` 호출 위치와 호출 조건을 변경하지 않았다.

- 증거 선택
  - `selectedEvidenceId` state는 `page.tsx`에 유지했다.
  - `EvidenceSelector`는 `onSelect={setSelectedEvidenceId}`만 props로 받아 기존 버튼 클릭 흐름을 유지한다.

- 증거 상세 로딩
  - `fetchEvidenceDetail` 호출 위치와 의존성 배열을 변경하지 않았다.

- Summary 탭 표시
  - 기존 Summary 탭 JSX를 route-local 표현 컴포넌트로 이동했다.

- 탭 전환
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` 구조와 default value는 `page.tsx`에 그대로 유지했다.

- 401/404 에러 메시지
  - `getErrorMessage`, `ApiError`, `isUnauthorizedError` 로직은 변경하지 않았다.

- “분석 근거 없음” 분기
  - 02에서 만든 `DeepfakeModelTab`의 근거 없음 분기와 메시지를 변경하지 않았다.

- 복사 버튼 동작
  - `copied` state, `copyHash`, timeout, `IntegrityTab`의 `onCopyHash` 전달을 변경하지 않았다.

## 02 mock/real 정책 유지 여부

- fake evidence 생성 로직 부활 여부
  - 부활 없음.

- riskScore 기반 frame/segment/finding 생성 여부
  - 생성 없음.

- mock import 위치 변화 여부
  - 이번 03-A1에서는 mock import 위치를 변경하지 않았다.
  - 기존 02 결과대로 `lib/api/evidence-detail.ts`가 `@/lib/mock/forensic-api`를 API 레이어에서만 import한다.

## 검색 결과

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

판정:

- sample builder는 `lib/mock/analysis-result.ts`에만 존재한다.
- 화면 컴포넌트 직접 import는 없다.
- `buildFrameRisks`, `buildSuspiciousSegments`, `buildDetectionFindings`, `fallbackModules`는 검색되지 않는다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git status --short` | 0 | 기존 01/02 변경과 03-A1 신규 `_components` 변경이 함께 표시됨 |
| `git diff --name-status` | 0 | 작업 전 기존 변경 확인 |
| `git diff --stat` | 0 | 작업 전 기존 변경 확인 |
| `git diff --check` | 0 | 공백 오류 없음 |
| `wc -l 'app/cases/[id]/page.tsx'` | 0 | 작업 전 1643, 작업 후 1286 |
| `rg -n "buildFrameRisks|buildSuspiciousSegments|buildDetectionFindings|fallbackModules|sampleFrameRisks|sampleReasonGroups|buildSampleResultData" app components lib --glob '*.ts' --glob '*.tsx'` | 0 | sample builder는 `lib/mock/analysis-result.ts`에만 존재 |
| `npm run build` | 0 | Next.js production build 통과. 로그상 type validation은 skip |
| `npm run lint` | 127 | `eslint: command not found` |
| `npm run typecheck` | 1 | `Missing script: "typecheck"` |
| `npm run test` | 1 | `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- lint
  - `npm run lint` script는 있으나 로컬에서 `eslint` 바이너리를 찾지 못해 실패.
  - 패키지 설치/수정 금지라 해결하지 않음.

- typecheck
  - `package.json`에 `typecheck` script가 없어 실행 불가.

- test
  - `package.json`에 `test` script가 없어 실행 불가.

## 남은 위험

- `page.tsx`는 아직 1286줄로 크다. 이번 단계는 A1만 진행했기 때문에 Deepfake/Integrity/Metadata/Report 탭 분리는 남아 있다.
- Summary 탭을 별도 파일로 옮기면서 className과 문구는 그대로 유지했지만, 시각 회귀는 브라우저에서 한 번 확인하는 것이 좋다.
- build는 통과했지만 type validation이 skip되므로, 정식 typecheck 스크립트가 생기기 전까지 타입 회귀 검증은 제한적이다.
- 워크트리에 01/02 변경과 기존 생성물이 섞여 있으므로, 리뷰 시 03-A1 변경 파일만 구분해서 봐야 한다.

## 03-A2로 넘어가도 되는지 여부

조건부 가능.

03-A1의 목표인 Header / Summary / Evidence 선택 영역 분리는 완료했고, 02 mock/real 정책은 유지됐다. 다만 03-A2에 들어가기 전 브라우저에서 `/cases/{id}`의 사건 헤더, 좌측 증거 선택, Summary 탭 표시가 이전과 같은지 한 번 확인하는 것을 권장한다.
