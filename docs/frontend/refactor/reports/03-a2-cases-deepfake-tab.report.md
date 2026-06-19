# 03-A2 cases deepfake tab 분리 리포트

## 판정

CONDITIONAL PASS

`app/cases/[id]/page.tsx`에서 Deepfake Model 탭 관련 표현 컴포넌트를 route-local 파일로 분리했다. `page.tsx`에는 기존처럼 데이터 로딩, 상태 분기, 증거 선택, 탭 조립 흐름을 유지했다. 03-A3 이후 작업은 진행하지 않았다.

조건부 판정 사유:

- `git diff --check`와 `npm run build`는 통과했다.
- `npm run lint`는 `eslint: command not found`로 실패했다.
- `npm run typecheck`, `npm run test`는 script가 없다.
- 워크트리에 01/02/03-A1 변경과 기존 생성물이 섞여 있어, git diff 전체는 03-A2 단독 변경만 나타내지 않는다.

## 변경한 파일

03-A2에서 직접 변경/추가한 파일:

- `app/cases/[id]/page.tsx`
  - `DeepfakeModelTab`, `getAnalysisEvidenceMessage`, `AnalysisEvidenceEmptyState`, `RingGauge`, `FrameRiskChart`, `ModelResultCard`, `SuspiciousSegmentCard`, `DetectionFindingCard` 관련 정의를 제거하고 route-local 컴포넌트 import로 연결했다.
  - 탭 조립 구조, state/effect/API 호출은 유지했다.

- `app/cases/[id]/_components/deepfake-model-tab.tsx`
  - Deepfake Model 탭 JSX와 탭 내부 보조 컴포넌트를 한 파일로 이동했다.
  - `moduleResults`가 있을 때만 모델 결과 카드를 표시하고, 없으면 기존 "분석 근거 없음" 상태 UI를 표시한다.

## 분리한 컴포넌트 목록

- `DeepfakeModelTab`
- `AnalysisEvidenceEmptyState`
- `RingGauge`
- `FrameRiskChart`
- `ModelResultCard`
- `SuspiciousSegmentCard`
- `DetectionFindingCard`

참고:

- `FrameRiskChart`, `SuspiciousSegmentCard`, `DetectionFindingCard`는 02 이후 현재 화면에서 직접 사용되지는 않지만, 03-A2 문서의 Deepfake 탭 관련 보조 컴포넌트 범위에 포함되어 `deepfake-model-tab.tsx` 내부로 이동했다.
- 별도 파일로 과도하게 쪼개지 않고 `deepfake-model-tab.tsx` 내부 보조 컴포넌트로 유지했다.

## 새 파일 구조

```text
app/cases/[id]/_components/
  deepfake-model-tab.tsx
```

기존 03-A1 파일 구조:

```text
app/cases/[id]/_components/
  case-hero.tsx
  evidence-selector.tsx
  evidence-summary-card.tsx
  summary-meta-item.tsx
  summary-tab.tsx
```

## page.tsx 줄 수

- 변경 전: 1286
- 변경 후: 972

## 새 파일별 줄 수

```text
326 app/cases/[id]/_components/deepfake-model-tab.tsx
```

## 유지한 동작

- 딥페이크 모델 탭 표시
  - `TabsContent value="deepfake"` 구조를 `page.tsx`에 유지하고, 내부 표현만 `DeepfakeModelTab`으로 위임했다.

- 모델 결과 카드 표시
  - `analysisInfo.moduleResults.length > 0`일 때만 `ModelResultCard`를 렌더링한다.
  - 카드의 문구, Badge class, score 표시, `moduleName.replace(/_/g, " ")` 처리는 그대로 유지했다.

- 프레임 위험도 표시
  - 02 정책에 따라 실제 프레임 데이터가 없으면 기존 "분석 근거 없음" 상태 UI를 표시한다.
  - `riskScore` 기반 프레임 차트 생성은 부활시키지 않았다.

- 의심 구간 표시
  - 실제 의심 구간 데이터가 없으면 기존 "분석 근거 없음" 상태 UI를 표시한다.
  - `riskScore` 기반 의심 구간 생성은 부활시키지 않았다.

- 탐지 근거 표시
  - 실제 탐지 근거 데이터가 없으면 기존 "분석 근거 없음" 상태 UI를 표시한다.
  - `riskScore` 기반 탐지 근거 생성은 부활시키지 않았다.

- “분석 근거 없음” 분기
  - `PENDING`: "분석 대기"
  - `PROCESSING`: "분석 중"
  - `COMPLETED`: "분석 근거 없음"
  - `FAILED`: "분석 실패로 근거 데이터를 표시할 수 없습니다."
  - 알 수 없는 상태: "현재 AI 분석 결과를 사용할 수 없습니다."

- 탭 전환
  - `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`는 `page.tsx`에 그대로 유지했다.

## 02 mock/real 정책 유지 여부

- fake evidence 생성 로직 부활 여부
  - 부활 없음.

- riskScore 기반 frame/segment/finding 생성 여부
  - 생성 없음.
  - 03-A2에서는 `riskScore`를 기반으로 프레임, 의심 구간, 탐지 근거, reason group을 만들지 않았다.

- mock import 위치 변화 여부
  - 변화 없음.
  - 기존 02 결과대로 mock import는 API 모듈 레이어(`lib/api/evidence-detail.ts`)에 남아 있다.

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
- 화면 컴포넌트에서 sample builder를 직접 import하지 않는다.
- `buildFrameRisks`, `buildSuspiciousSegments`, `buildDetectionFindings`, `fallbackModules`는 검색되지 않는다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git status --short` | 0 | 기존 01/02/03-A1 변경과 03-A2 신규 파일이 함께 표시됨 |
| `git diff --name-status` | 0 | 기존 변경 포함. 새 `_components` 파일은 untracked라 name-status에는 아직 미표시 |
| `git diff --stat` | 0 | 기존 변경 포함. 새 untracked 파일은 stat에 아직 미포함 |
| `git diff --check` | 0 | 공백 오류 없음 |
| `wc -l 'app/cases/[id]/page.tsx'` | 0 | 작업 전 1286, 작업 후 972 |
| `rg -n "buildFrameRisks|buildSuspiciousSegments|buildDetectionFindings|fallbackModules|sampleFrameRisks|sampleReasonGroups|buildSampleResultData" app components lib --glob '*.ts' --glob '*.tsx'` | 0 | sample builder는 `lib/mock/analysis-result.ts`에만 존재 |
| `npm run build` | 0 | Next.js production build 통과. 로그상 type validation은 skip |
| `npm run lint` | 127 | `eslint: command not found` |
| `npm run typecheck` | 1 | `Missing script: "typecheck"` |
| `npm run test` | 1 | `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- lint
  - `npm run lint` script는 있으나 로컬에서 `eslint` 바이너리를 찾지 못해 실패.
  - 패키지 설치/수정 금지라 해결하지 않았다.

- typecheck
  - `package.json`에 `typecheck` script가 없어 실행 불가.

- test
  - `package.json`에 `test` script가 없어 실행 불가.

## 남은 위험

- `deepfake-model-tab.tsx` 내부에 현재 사용되지 않는 보조 컴포넌트(`FrameRiskChart`, `SuspiciousSegmentCard`, `DetectionFindingCard`)가 있다. 03-A2 지시에 따라 별도 파일로 쪼개지지 않고 내부 보조 컴포넌트로 이동했으며, 03-A4 또는 실제 백엔드 필드 연동 시 정리할 수 있다.
- `page.tsx`는 아직 972줄로 크다. Integrity / Metadata / Report 탭 분리는 03-A3 범위로 남아 있다.
- build는 통과했지만 type validation이 skip되므로, 별도 typecheck 스크립트가 생기기 전까지 타입 회귀 검증은 제한적이다.
- 브라우저에서 `/cases/{id}`의 Deepfake 탭 표시를 직접 확인하면 시각 회귀를 더 확실히 잡을 수 있다.

## 03-A3로 넘어가도 되는지 여부

조건부 가능.

03-A2의 목표인 Deepfake Model 탭 표현 컴포넌트 분리는 완료했고, 02 mock/real 정책도 유지됐다. 다만 03-A3로 넘어가기 전 브라우저에서 Deepfake 탭의 "모델 탐지 결과", "프레임별 위험도", "의심 구간", "탐지 근거 상세", "모델 정보" 영역이 이전과 동일하게 표시되는지 확인하는 것을 권장한다.
