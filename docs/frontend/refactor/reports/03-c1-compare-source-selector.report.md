# 03-C1 compare source selector 분리 리포트

## 판정

CONDITIONAL PASS

사유: `git diff --check`와 `npm run build`는 통과했다. 다만 `npm run lint`는 로컬 `eslint` 실행 파일 부재로 실패했고, `npm run typecheck` / `npm run test`는 package script가 없어 실행하지 못했다. 현재 Next build도 type validation을 skip한다.

## 변경한 파일

- `app/compare/_components/compare-verification-flow.tsx`
  - source evidence 선택 영역 JSX를 `SourceEvidenceSelector` 호출로 대체했다.
  - `SourceCase`, `SourceEvidence` 타입을 route-local 표현 컴포넌트에서 재사용할 수 있도록 export했다.
  - 사건 목록 로드, 증거 hydrate, 검색 상태, 선택 상태, API 호출, request guard, 취소/다운로드 로직은 원 파일에 유지했다.
- `app/compare/_components/source-evidence-selector.tsx`
  - 사건 목록, 사건 검색, 증거 검색, 증거 선택, 선택 상태 표시, 다음 단계 버튼 UI를 props-only 컴포넌트로 분리했다.
  - source 선택 UI 전용 `EvidencePreview`, `getEvidenceMediaLabel`, `getEvidencePreviewTone`을 함께 이동했다.
- `docs/frontend/refactor/reports/03-c1-compare-source-selector.report.md`
  - 03-C1 수행 결과와 검증 내역을 기록했다.

## 분리한 컴포넌트 목록

- `SourceEvidenceSelector`
- `EvidencePreview` (`source-evidence-selector.tsx` 내부 보조 컴포넌트)

## 새 파일 구조

```text
app/compare/_components/
├── compare-verification-flow.tsx
└── source-evidence-selector.tsx
```

## compare-verification-flow.tsx 줄 수

- 변경 전: 1185
- 변경 후: 869

## 새 파일별 줄 수

- `app/compare/_components/source-evidence-selector.tsx`: 326

## 유지한 동작

- 사건 목록 로드: `fetchMyAnalysisHistory` 호출과 초기 hydrate 흐름을 원 파일에 유지했다.
- 증거 hydrate: `fetchCaseDetail` 호출 위치와 `selectCase` 흐름을 원 파일에 유지했다.
- 검색: `caseQuery`, `evidenceQuery` state는 원 파일에 유지하고 props로 전달했다.
- 사건/증거 선택: `selectedCaseId`, `selectedEvidenceId` state는 원 파일에 유지하고 callback으로 전달했다.
- 선택 상태 표시: 기존 선택 조건과 className을 새 컴포넌트로 그대로 이동했다.
- 다음 단계 이동: `onNext={() => setStep("upload")}` 호출 위치를 원 파일에 유지했다.
- 기존 state/effect/API 호출 위치: source/selected/query/loading/error state와 `useEffect`는 이동하지 않았다.

## ref guard / cleanup 보존 여부

- request token/ref 변경 여부: 변경 없음. `compareRequestRef`, `activeCompareRequestTokenRef`는 원 파일에 유지했다.
- cancellation guard 변경 여부: 변경 없음. 초기 목록 로드의 `cancelled` guard와 비교 요청 `requestId` guard는 원 파일에 유지했다.
- blob cleanup 변경 여부: 변경 없음. `downloadCompareReport` 후 `URL.createObjectURL` / `URL.revokeObjectURL` 흐름은 원 파일에 유지했다.
- API 호출 시점 변경 여부: 변경 없음. `verifyCompare`, `cancelCompareVerification`, `downloadCompareReport`, `fetchMyAnalysisHistory`, `fetchCaseDetail` 호출 위치와 시점은 유지했다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git diff --check` | 0 | whitespace error 없음 |
| `npm run build` | 0 | Next.js production build 통과. 단 type validation은 skip됨 |
| `npm run lint` | 127 | `eslint: command not found` |
| `npm run typecheck` | 1 | `Missing script: "typecheck"` |
| `npm run test` | 1 | `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- `npm run lint`: script는 있으나 로컬 `eslint` 실행 파일이 없어 실패했다. 패키지 설치는 금지되어 있어 추가 조치하지 않았다.
- `npm run typecheck`: package script가 없다.
- `npm run test`: package script가 없다.

## 남은 위험

- `source-evidence-selector.tsx`는 `compare-verification-flow.tsx`에서 exported type을 import한다. runtime import는 아니지만, 향후 타입이 커지면 route-local `_types` 분리를 고려할 수 있다.
- `npm run build`가 type validation을 skip하므로 타입 레벨 회귀는 별도 타입체크 환경이 마련되기 전까지 완전히 보장되지 않는다.
- 현재 작업 트리에 이전 03-A/03-B 변경과 기타 기존 변경물이 함께 많다. 03-C1 리뷰 시에는 `compare-verification-flow.tsx`와 `source-evidence-selector.tsx` 중심으로 확인하는 것이 좋다.

## 03-C2로 넘어가도 되는지 여부

가능하다. 단, 03-C2에서도 `verifyCompare`, `cancelCompareVerification`, `downloadCompareReport`, request token/ref guard, blob cleanup은 계속 원 파일에 남기는 방향으로 진행해야 한다.
