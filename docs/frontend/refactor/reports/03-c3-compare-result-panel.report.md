# 03-C3 compare result panel 분리 리포트

## 판정

CONDITIONAL PASS

사유: 비교 결과 표시 영역은 props-only 컴포넌트로 분리했고, `downloadCompareReport`, blob URL 생성/해제, request ref guard, API 호출 위치는 원 파일에 유지했다. `npm run build`는 통과했다. 다만 `npm run lint`는 `eslint: command not found`, `npm run typecheck`와 `npm run test`는 스크립트 부재로 실행되지 않았다.

## 변경한 파일

- `app/compare/_components/compare-verification-flow.tsx`
  - 비교 결과 JSX를 `CompareResultPanel` 호출로 대체했다.
  - `downloadCompareReport`, `URL.createObjectURL`, `URL.revokeObjectURL`, 다운로드 에러/로딩 state는 기존 `ResultStep`에 유지했다.
- `app/compare/_components/compare-result-panel.tsx`
  - 비교 결과 요약, 판정 배너, 결과 상세 테이블, 다운로드 버튼 표시를 props-only 표현 컴포넌트로 분리했다.
  - `getCompareItemResultLabel`, `getVerdictDisplay`는 해당 파일 내부 보조 함수로 이동했다.
- `docs/frontend/refactor/reports/03-c3-compare-result-panel.report.md`
  - 03-C3 작업 내용과 검증 결과를 기록했다.

## 분리한 컴포넌트 목록

- `CompareResultPanel`
  - `result`, `downloadError`, `isDownloading`, `onReset`, `onDownloadReport`만 props로 받는다.
  - 다운로드 실행 함수와 blob cleanup은 직접 소유하지 않는다.
- 내부 보조 함수
  - `getCompareItemResultLabel`
  - `getVerdictDisplay`

## 새 파일 구조

```text
app/compare/_components/
├── compare-verification-flow.tsx
├── source-evidence-selector.tsx
├── compare-file-uploader.tsx
├── compare-processing-panel.tsx
└── compare-result-panel.tsx
```

## compare-verification-flow.tsx 줄 수

- 변경 전: 654줄
- 변경 후: 473줄

참고: 현재 세션 재개 시점에는 03-C3 일부가 이미 적용되어 `wc -l`이 473줄로 측정됐다. 03-C2 완료 기준선은 사용자 지시와 이전 리포트 기준 654줄이다.

## 새 파일별 줄 수

- `app/compare/_components/compare-result-panel.tsx`: 186줄
- `app/compare/_components/compare-file-uploader.tsx`: 158줄
- `app/compare/_components/compare-processing-panel.tsx`: 73줄
- `app/compare/_components/source-evidence-selector.tsx`: 326줄

## 유지한 동작

- 비교 결과 표시: 유지
- 유사도/검증 결과 표시: 기존 summary count와 verdict label 표시 유지
- 결과 상세 표시: 기존 item table 표시 유지
- 보고서 다운로드 버튼: 기존 버튼 문구, disabled 조건, callback 연결 유지
- 다운로드 에러 처리: 기존 `downloadError` 상태와 표시 유지
- 기존 state/effect/API 호출 위치: 유지

## ref guard / cleanup 보존 여부

- request token/ref 변경 여부: 변경 없음. `compareRequestRef`, `activeCompareRequestTokenRef`는 `compare-verification-flow.tsx`에 유지.
- cancellation guard 변경 여부: 변경 없음. `cancelCompareVerification` 호출 위치 유지.
- blob cleanup 변경 여부: 변경 없음. `URL.createObjectURL`/`URL.revokeObjectURL`은 `compare-verification-flow.tsx`의 `handleDownloadReport`에 유지.
- downloadCompareReport 호출 시점 변경 여부: 변경 없음. 다운로드 버튼 클릭 시 전달된 `onDownloadReport`가 기존 `handleDownloadReport`를 호출.
- API 호출 시점 변경 여부: 변경 없음. `verifyCompare`, `cancelCompareVerification`, `downloadCompareReport`, `fetchMyAnalysisHistory`, `fetchCaseDetail` 호출 위치 유지.

## mock/real 정책 유지 여부

- real 실패를 mock/demo 결과로 대체하는 코드가 생겼는지: 없음.
- fake 결과 생성 로직이 추가됐는지: 없음.

## 검색 결과

### download/blob cleanup 검색 결과

```text
app/compare/_components/compare-verification-flow.tsx:12:  downloadCompareReport,
app/compare/_components/compare-verification-flow.tsx:391:      const blob = await downloadCompareReport(result.compareId)
app/compare/_components/compare-verification-flow.tsx:392:      const url = URL.createObjectURL(blob)
app/compare/_components/compare-verification-flow.tsx:399:      URL.revokeObjectURL(url)
```

`compare-result-panel.tsx`에는 `downloadCompareReport`, `URL.createObjectURL`, `URL.revokeObjectURL`가 없다.

### request guard 검색 결과

```text
app/compare/_components/compare-verification-flow.tsx:82:  const compareRequestRef = useRef(0)
app/compare/_components/compare-verification-flow.tsx:83:  const activeCompareRequestTokenRef = useRef<string | null>(null)
app/compare/_components/compare-verification-flow.tsx:169:    const requestId = compareRequestRef.current + 1
app/compare/_components/compare-verification-flow.tsx:174:    compareRequestRef.current = requestId
app/compare/_components/compare-verification-flow.tsx:175:    activeCompareRequestTokenRef.current = requestToken
app/compare/_components/compare-verification-flow.tsx:183:      if (compareRequestRef.current !== requestId) return
app/compare/_components/compare-verification-flow.tsx:188:      if (compareRequestRef.current !== requestId) return
app/compare/_components/compare-verification-flow.tsx:192:      if (compareRequestRef.current === requestId) {
app/compare/_components/compare-verification-flow.tsx:193:        activeCompareRequestTokenRef.current = null
app/compare/_components/compare-verification-flow.tsx:199:    const requestToken = activeCompareRequestTokenRef.current
app/compare/_components/compare-verification-flow.tsx:204:    compareRequestRef.current += 1
app/compare/_components/compare-verification-flow.tsx:205:    activeCompareRequestTokenRef.current = null
app/compare/_components/compare-verification-flow.tsx:212:    compareRequestRef.current += 1
app/compare/_components/compare-verification-flow.tsx:213:    activeCompareRequestTokenRef.current = null
```

### 결과 패널 검색 결과

```text
app/compare/_components/compare-result-panel.tsx:15:export function CompareResultPanel({
app/compare/_components/compare-result-panel.tsx:148:function getCompareItemResultLabel(result: string) {
app/compare/_components/compare-result-panel.tsx:158:function getVerdictDisplay(verdict: CompareVerdict, verdictLabel: string) {
app/compare/_components/compare-verification-flow.tsx:408:    <CompareResultPanel
```

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git diff --check` | 0 | 공백 오류 없음 |
| `npm run build` | 0 | Next.js production build 통과. type validation은 프로젝트 설정상 skip됨 |
| `npm run lint` | 127 | `eslint: command not found` |
| `npm run typecheck` | 1 | `Missing script: "typecheck"` |
| `npm run test` | 1 | `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- `npm run lint`: package script는 있으나 로컬에 `eslint` 실행 파일이 없어 실패했다. 패키지 설치는 금지되어 있어 수정하지 않았다.
- `npm run typecheck`: script가 없다.
- `npm run test`: script가 없다.

## 남은 위험

- `compare-result-panel.tsx`는 기존 결과 JSX를 그대로 route-local 표현 컴포넌트로 옮긴 수준이라 동작 위험은 낮다.
- `npm run build`가 type validation을 skip하므로, 별도 typecheck가 없는 상태에서는 타입 검증 공백이 남는다.
- 현재 working tree에는 03-C3 외의 이전 단계 변경과 기존 변경물이 함께 남아 있어, 최종 커밋 전 범위 확인이 필요하다.

## 03-C4로 넘어가도 되는지 여부

가능하다. 단, 03-C4에서도 API/ref/blob cleanup/state 소유 위치를 유지하고, 이번처럼 표시 컴포넌트 정리 범위로만 진행하는 조건이다.
