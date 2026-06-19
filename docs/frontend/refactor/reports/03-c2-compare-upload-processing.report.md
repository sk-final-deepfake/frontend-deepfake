# 03-C2 compare upload processing 분리 리포트

## 판정

CONDITIONAL PASS

사유: `git diff --check`와 `npm run build`는 통과했다. 다만 `npm run lint`는 로컬 `eslint` 실행 파일 부재로 실패했고, `npm run typecheck` / `npm run test`는 package script가 없어 실행하지 못했다. 현재 Next build도 type validation을 skip한다.

## 변경한 파일

- `app/compare/_components/compare-verification-flow.tsx`
  - 비교 파일 업로드 UI를 `CompareFileUploader` 호출로 대체했다.
  - 비교 처리 중/취소/진행률 UI를 `CompareProcessingPanel` 호출로 대체했다.
  - `UploadedCompareFile` 타입을 route-local 표현 컴포넌트에서 재사용할 수 있도록 export했다.
  - 비교 요청, 취소, 다운로드, request token/ref guard, blob cleanup, state/effect/API 호출은 원 파일에 유지했다.
- `app/compare/_components/compare-file-uploader.tsx`
  - 비교 파일 선택, 드롭존, 파일 제거, 원본 기준 파일 표시, 비교 검증 시작 버튼 UI를 props-only 컴포넌트로 분리했다.
- `app/compare/_components/compare-processing-panel.tsx`
  - 비교 처리 중 화면, 진행률 표시, 검증 중지 버튼, 원본/대상 요약 UI를 props-only 컴포넌트로 분리했다.
- `docs/frontend/refactor/reports/03-c2-compare-upload-processing.report.md`
  - 03-C2 수행 결과와 검증 내역을 기록했다.

## 분리한 컴포넌트 목록

- `CompareFileUploader`
- `CompareProcessingPanel`
- `CompareFileSummary` (`compare-processing-panel.tsx` 내부 보조 컴포넌트)

## 새 파일 구조

```text
app/compare/_components/
├── compare-verification-flow.tsx
├── source-evidence-selector.tsx
├── compare-file-uploader.tsx
└── compare-processing-panel.tsx
```

## compare-verification-flow.tsx 줄 수

- 변경 전: 869
- 변경 후: 654

## 새 파일별 줄 수

- `app/compare/_components/compare-file-uploader.tsx`: 158
- `app/compare/_components/compare-processing-panel.tsx`: 73
- `app/compare/_components/source-evidence-selector.tsx`: 326

## 유지한 동작

- 비교 파일 선택: `handleFileChange`와 `fileInputRef` 소유 위치를 원 파일에 유지하고 props로 전달했다.
- 파일 제거: `onRemoveFile={() => setCompareFile(null)}` 호출 위치를 원 파일에 유지했다.
- 드롭존/업로드 UI: 기존 role, tabIndex, input 속성, `onDrop`, `onDragOver`, `onKeyDown`, `onClick` 동작을 새 컴포넌트로 그대로 이동했다.
- 비교 요청 버튼: `onStart={startCompare}` 호출 위치와 disabled 조건을 유지했다.
- 진행률 표시: `progress` state는 원 파일에 유지하고 props로 전달했다.
- 비교 취소: `onCancel={cancelCompare}` 호출 위치를 원 파일에 유지했다.
- 처리 중 상태: `step === "processing"` 분기와 progress effect는 원 파일에 유지했다.
- 기존 state/effect/API 호출 위치: `compareFile`, `compareResult`, `compareError`, `progress`, `step`, `useEffect`, `verifyCompare`, `cancelCompareVerification`, `downloadCompareReport`는 원 파일에 남겼다.

## ref guard / cleanup 보존 여부

- request token/ref 변경 여부: 변경 없음. `compareRequestRef`, `activeCompareRequestTokenRef`는 원 파일에 유지했다.
- cancellation guard 변경 여부: 변경 없음. 초기 목록 로드의 `cancelled` guard와 비교 요청 `requestId` guard는 원 파일에 유지했다.
- blob cleanup 변경 여부: 변경 없음. `downloadCompareReport` 후 `URL.createObjectURL` / `URL.revokeObjectURL` 흐름은 원 파일에 유지했다.
- API 호출 시점 변경 여부: 변경 없음. `verifyCompare`, `cancelCompareVerification`, `downloadCompareReport`, `fetchMyAnalysisHistory`, `fetchCaseDetail` 호출 위치와 시점은 유지했다.
- file URL cleanup 변경 여부: 해당 없음. 비교 파일 업로드 UI는 object URL을 생성하지 않으며, 새 파일에서도 URL 생성/해제 로직을 추가하지 않았다.

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

- `compare-file-uploader.tsx`와 `compare-processing-panel.tsx`는 `compare-verification-flow.tsx`에서 exported type을 import한다. runtime import는 아니지만, 타입이 더 늘어나면 route-local `_types` 분리를 고려할 수 있다.
- `npm run build`가 type validation을 skip하므로 타입 레벨 회귀는 별도 타입체크 환경이 마련되기 전까지 완전히 보장되지 않는다.
- 현재 작업 트리에 이전 03-A/03-B/03-C1 변경과 기타 기존 변경물이 함께 많다. 03-C2 리뷰 시에는 `compare-verification-flow.tsx`, `compare-file-uploader.tsx`, `compare-processing-panel.tsx` 중심으로 확인하는 것이 좋다.

## 03-C3로 넘어가도 되는지 여부

가능하다. 단, 03-C3에서도 `downloadCompareReport`, blob cleanup, result state, request token/ref guard는 계속 원 파일에 남기는 방향으로 진행해야 한다.
