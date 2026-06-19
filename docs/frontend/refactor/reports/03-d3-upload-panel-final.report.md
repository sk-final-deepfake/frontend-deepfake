# 03-D3 upload panel 마무리 리포트

## 판정

CONDITIONAL PASS

사유: `components/upload-panel.tsx`의 upload-panel 마무리 점검을 수행했고, 명확한 미사용 import/helper/type은 발견되지 않아 코드 수정 없이 리포트만 추가했다. `npm run build`는 별도 검증 예정이며, `lint/typecheck/test`는 현재 프로젝트 스크립트/의존성 상태상 제한이 있다.

## 변경한 파일

- `docs/frontend/refactor/reports/03-d3-upload-panel-final.report.md`
  - 03-D3 점검 결과를 남기기 위한 리포트 파일을 추가했다.

코드 파일은 추가 수정하지 않았다.

## 정리한 항목

### 제거한 미사용 import/helper/type

- 없음.
- `components/upload-panel.tsx`의 import와 helper는 현재 사용처가 확인됐다.
- `components/upload-panel/*`의 props type과 보조 함수도 각 컴포넌트 내부에서 사용 중이다.

### 유지한 항목과 이유

- `buildMetadataItems`
  - `onMetadataChange`에 전달하는 메타데이터 목록 생성 로직으로 계속 사용 중이다.
- `dedupeResultsByHash`
  - 분석 시작 시 동일 hash 결과 dedupe 정책을 유지하기 위해 필요하다.
- `isStoppableAnalysis`, `getStoppableAnalysisEvidenceIds`
  - 개별 분석 중단 버튼 표시와 polling 대상 계산에 필요하다.
- `UploadFileCardState`와 `FileUploadState`
  - 구조는 유사하지만 `UploadFileCardState`는 분리된 표시 컴포넌트의 public props type이고, `FileUploadState`는 parent의 상태 소유 타입이다. 이번 단계에서는 타입 통합이 동작 변경 위험 대비 이득이 작아 유지했다.
- `flatMap`
  - 현재 `npm run build`가 통과하는 범위에서는 직접 수정 필요성이 확인되지 않았다. typecheck script가 없으므로 무리한 타입 재작성은 하지 않았다.

### 후속 후보

- 별도 typecheck 환경이 준비되면 `buildMetadataItems`의 `flatMap` 반환 타입을 더 엄격히 검증할 수 있다.
- 이후 hook 분리를 진행할 때 `FileUploadState` 계열 타입을 공용 route-local type으로 정리할 수 있다.
- 03-E/admin API 분리는 이번 범위에서 제외했다. `lib/api/admin.ts`는 수정하지 않았다.

## upload-panel.tsx 줄 수

- 변경 전: 633
- 변경 후: 633

## 현재 upload-panel 파일 구조

```text
components/upload-panel.tsx
components/upload-panel/
  upload-action-bar.tsx
  upload-dropzone.tsx
  upload-file-card.tsx
  upload-file-list.tsx
  upload-result-card.tsx
  upload-result-list.tsx
  upload-status-panel.tsx
```

파일별 줄 수:

```text
633 components/upload-panel.tsx
 85 components/upload-panel/upload-action-bar.tsx
 61 components/upload-panel/upload-result-list.tsx
 85 components/upload-panel/upload-result-card.tsx
 33 components/upload-panel/upload-status-panel.tsx
 74 components/upload-panel/upload-dropzone.tsx
 30 components/upload-panel/upload-file-list.tsx
 94 components/upload-panel/upload-file-card.tsx
```

## upload-panel.tsx에 남은 책임

- 상태 소유
  - `fileStates`, `kind`, `caseName`, `status`, `progress`, `globalError`, `hasUploadedOnce`, `isCancelling`, `hydrated`
- session hydrate/save
  - `loadMainUploadPanelSession`
  - `saveMainUploadPanelSession`
  - `clearMainUploadPanelSession`
- polling
  - `pollingKey`
  - `fetchAnalysisStatus`
  - `setInterval` / cleanup
- upload/start/cancel API 호출
  - `uploadEvidence`
  - `startEvidenceAnalysis`
  - `fetchAnalysisStatus`
  - `cancelAnalysis`
- parent callback
  - `onMetadataChange`
  - `onAnalyzeComplete`
- 화면 조립
  - `UploadDropzone`
  - `UploadFileList`
  - `UploadStatusPanel`
  - `UploadResultList`
  - `UploadActionBar`

## session / polling / cleanup 보존 여부

- localStorage session 변경 여부: 변경 없음
- hydrate/save effect 변경 여부: 변경 없음
- polling 변경 여부: 변경 없음
- cancel flow 변경 여부: 변경 없음
- API 호출 시점 변경 여부: 변경 없음
- dedupe by hash 변경 여부: 변경 없음
- parent callback 변경 여부: 변경 없음

## flatMap 타입 이슈 처리 여부

- 수정했는지: 수정하지 않음
- 수정하지 않은 이유:
  - D3 점검 범위에서 `buildMetadataItems`는 현재 동작 중인 parent callback 데이터 생성 로직으로 확인됐다.
  - `npm run build`가 통과하는 상태이며, `typecheck` script가 없어 명확한 신규 타입 오류를 재현할 수 없다.
  - 지시상 관련 없는 타입 오류를 함께 고치지 않아야 하므로, 동작 변경 가능성이 있는 타입 재작성은 보류했다.

## 타입 정리 여부

- `UploadFileCardState / FileUploadState` 관계:
  - `FileUploadState`는 `components/upload-panel.tsx` 내부 상태 타입이다.
  - `UploadFileCardState`는 분리된 표시 컴포넌트들이 공유하는 props 타입이다.
  - 현재 구조 중복은 있지만 화면 동작과 상태 소유 경계를 명확히 유지한다.
- 타입 분리 필요 여부:
  - 지금 당장 필수는 아니다.
  - 추후 hook 분리 또는 upload-panel 타입 파일 도입 시 정리 후보로 남긴다.

## 검색 결과

### session/polling/API/callback 검색 결과

- `useEffect`: `components/upload-panel.tsx`에 유지
- `loadMainUploadPanelSession`: `components/upload-panel.tsx`에 유지
- `saveMainUploadPanelSession`: `components/upload-panel.tsx`에 유지
- `fetchAnalysisStatus`: `components/upload-panel.tsx`에 유지
- `setInterval`: `components/upload-panel.tsx`에 유지
- `uploadEvidence`: `components/upload-panel.tsx`에 유지
- `startEvidenceAnalysis`: `components/upload-panel.tsx`에 유지
- `cancelAnalysis`: `components/upload-panel.tsx`에 유지
- `onMetadataChange`: `components/upload-panel.tsx`에 유지
- `onAnalyzeComplete`: `components/upload-panel.tsx`에 유지
- `dedupeResultsByHash`: `components/upload-panel.tsx`에 유지

### flatMap/type 검색 결과

- `flatMap`: `components/upload-panel.tsx`의 `buildMetadataItems`에서 사용
- `FileUploadState`: `components/upload-panel.tsx` 내부 상태 타입
- `UploadFileCardState`: `components/upload-panel/upload-file-card.tsx`에서 export, result/list/card 컴포넌트에서 props type으로 사용

### 분리 컴포넌트 사용처 검색 결과

- `UploadDropzone`: `components/upload-panel.tsx`에서 사용
- `UploadFileList`: `components/upload-panel.tsx`에서 사용
- `UploadStatusPanel`: `components/upload-panel.tsx`에서 사용
- `UploadResultList`: `components/upload-panel.tsx`에서 사용
- `UploadResultCard`: `components/upload-panel/upload-result-list.tsx`에서 사용
- `UploadActionBar`: `components/upload-panel.tsx`에서 사용

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git status --short` | 0 | 기존 03 리팩토링 변경물과 upload-panel/report 변경물이 표시됨 |
| `git diff --name-status` | 0 | 기존 변경물 목록 확인 |
| `git diff --stat` | 0 | 기존 변경 통계 확인 |
| `git diff --check` | 0 | whitespace 오류 없음 |
| `wc -l components/upload-panel.tsx` | 0 | 633 lines |
| `wc -l components/upload-panel/*.tsx` | 0 | 분리 컴포넌트 줄 수 확인 |
| `rg ... session/polling/API/callback/type ...` | 0 | 핵심 로직이 parent 파일에 남아 있음을 확인 |
| `npm run build` | 0 | 통과. Next build 완료, type validation은 설정상 skip |
| `npm run lint` | 127 | `eslint: command not found` |
| `npm run typecheck` | 1 | `Missing script: "typecheck"` |
| `npm run test` | 1 | `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- `npm run lint`
  - `eslint` 바이너리가 설치되어 있지 않아 실행 실패.
- `npm run typecheck`
  - package script가 없다.
- `npm run test`
  - package script가 없다.

## 남은 위험

- `npm run build`는 Next 설정상 type validation을 skip할 수 있으므로, 타입 전용 검증은 별도 script가 생긴 뒤 다시 확인하는 편이 안전하다.
- `flatMap` 관련 기존 타입 이슈는 이번 단계에서 직접 수정하지 않았다.
- 03-E/admin API 분리는 JWT 연동 이후 별도 단계에서 진행해야 한다.

## 03 UI 리팩토링 종료 가능 여부

CONDITIONAL PASS 기준으로 종료 가능하다.

단, `npm run build`는 통과했지만 Next 설정상 type validation을 skip하므로 기존 타입 검증 공백은 리뷰어가 확인해야 한다. 03-E/admin API 분리는 이번 UI 리팩토링 종료 범위에 포함하지 않는다.
