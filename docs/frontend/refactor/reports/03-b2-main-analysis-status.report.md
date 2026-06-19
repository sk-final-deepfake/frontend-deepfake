# 03-B2 main analysis status 분리 리포트

## 판정

CONDITIONAL PASS

사유: `npm run build`와 `git diff --check`는 통과했다. 다만 `npm run lint`는 로컬 `eslint` 실행 파일 부재로 실패했고, `npm run typecheck` / `npm run test`는 package script가 없어 실행하지 못했다. Next build도 현재 설정상 type validation을 skip한다.

## 변경한 파일

- `app/main/_components/analysis-request-flow.tsx`
  - 분석 진행/중단/결과 미리보기 JSX를 새 표현 컴포넌트 호출로 대체했다.
  - state/effect/API/polling/URL cleanup/라우팅 로직은 원 파일에 유지했다.
- `app/main/_components/analysis-progress-panel.tsx`
  - 분석 진행 화면과 진행률/분석 이력/분석 중단 버튼 UI를 props-only 컴포넌트로 분리했다.
- `app/main/_components/analysis-cancelled-panel.tsx`
  - 분석 중단 상태 화면과 중단 단계 표시 UI를 props-only 컴포넌트로 분리했다.
- `app/main/_components/analysis-result-preview.tsx`
  - 결과 미리보기 화면과 파일 전환 내비게이터 UI를 props-only 컴포넌트로 분리했다.
  - 기존 `resultPresets`, mock hash/tx hash, demo frame/reason 데이터는 새 fake 결과를 추가하지 않고 기존 동작 보존 목적으로 함께 이동했다.
- `docs/frontend/refactor/reports/03-b2-main-analysis-status.report.md`
  - 03-B2 수행 결과와 검증 내역을 기록했다.

## 분리한 컴포넌트 목록

- `AnalysisProgressPanel`
- `AnalysisCancelledPanel`
- `AnalysisResultPreview`
- `ResultFileNavigator` (`analysis-result-preview.tsx` 내부 보조 컴포넌트)

## 새 파일 구조

```text
app/main/_components/
├── analysis-request-flow.tsx
├── analysis-progress-panel.tsx
├── analysis-cancelled-panel.tsx
├── analysis-result-preview.tsx
├── upload-step.tsx
├── media-preview.tsx
└── media-metadata-preview.tsx
```

## analysis-request-flow.tsx 줄 수

- 변경 전: 849
- 변경 후: 483

## 새 파일별 줄 수

- `app/main/_components/analysis-progress-panel.tsx`: 51
- `app/main/_components/analysis-cancelled-panel.tsx`: 84
- `app/main/_components/analysis-result-preview.tsx`: 250

## 유지한 동작

- 분석 진행 화면: `AnalysisProgressPanel`로 분리했고, 기존 `AnalysisProgress` 호출과 에러 메시지 표시를 유지했다.
- 진행률 표시: `progress` prop을 그대로 받아 기존 width/텍스트 계산 방식을 유지했다.
- 취소 상태 화면: `AnalysisCancelledPanel`로 분리했고, 중단 단계 문구와 다시 분석/분석 이력 버튼을 유지했다.
- 결과 미리보기: `AnalysisResultPreview`로 분리했고, 기존 demo result preset 기반 결과 미리보기 동작을 유지했다.
- 업로드 완료 후 상태 전환: `analysis-request-flow.tsx`의 `startAnalysis`, `setStep`, upload-only 라우팅 흐름을 이동하지 않았다.
- 기존 state/effect/API 호출 위치: `step`, `uploadItems`, `caseName`, `progress`, `analysisError`, `activeEvidenceIndex`, `useEffect`, `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus`는 모두 `analysis-request-flow.tsx`에 남겼다.

## polling / cleanup 보존 여부

- polling 변경 여부: 변경 없음. `window.setInterval`과 cleanup은 `analysis-request-flow.tsx`에 유지했다.
- URL cleanup 변경 여부: 변경 없음. `URL.createObjectURL` / `URL.revokeObjectURL`은 `analysis-request-flow.tsx`에 유지했다.
- API 호출 시점 변경 여부: 변경 없음. `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus` 호출 위치와 시점은 원 파일에 유지했다.
- uploadOnlyMode 라우팅 변경 여부: 변경 없음. `features.uploadOnlyMode` 분기와 `/evidences/{id}` 이동 로직은 원 파일에 유지했다.

## mock/demo 잔존 확인

- `resultPresets/mock/sample/demo/hash` 검색 결과:
  - `analysis-result-preview.tsx`에 `resultPresets`, `getMockHash`, `getMockTxHash`가 존재한다.
  - `media-metadata-preview.tsx`에는 업로드 해시 표시용 `hashValue` fallback 문구가 존재한다.
  - `analysis-request-flow.tsx`에는 API 응답 `hashValue`, `cancelAnalysis`, 상태명 관련 참조만 남아 있다.
- fake 결과 부활 여부:
  - 새 fake 결과 생성 로직은 추가하지 않았다.
  - 기존 결과 미리보기용 demo preset만 `analysis-result-preview.tsx`로 이동했다.
- demo/mock 성격 코드 이동 위치와 이유:
  - `resultPresets`, demo frame risk, suspicious frame group, mock hash/tx hash는 결과 미리보기 JSX와 강하게 결합되어 있어 `analysis-result-preview.tsx` 내부로 이동했다.
  - 이번 단계 지시가 해당 로직 삭제가 아니라 표현 컴포넌트 분리였으므로 동작 보존을 우선했다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git diff --check` | 0 | whitespace error 없음 |
| `npm run build` | 0 | Next.js production build 통과. 단 type validation은 skip됨 |
| `npm run lint` | 127 | `eslint: command not found` |
| `npm run typecheck` | 1 | `Missing script: "typecheck"` |
| `npm run test` | 1 | `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- `npm run lint`: script는 있으나 로컬 의존성에 `eslint` 실행 파일이 없어 실패했다. 패키지 설치는 금지되어 있어 추가 조치하지 않았다.
- `npm run typecheck`: package script가 없다.
- `npm run test`: package script가 없다.

## 남은 위험

- `analysis-result-preview.tsx`에 기존 demo/mock result preset이 남아 있다. 03-B2 지시상 삭제 대상은 아니지만, 이후 03-B3 또는 mock/real 정리 단계에서 실제 API 결과 화면과 분리 여부를 다시 확인하는 것이 좋다.
- `npm run build`가 통과했지만 type validation이 skip되므로 타입 레벨 회귀는 별도 `tsc` 검증 환경이 마련되기 전까지 완전히 확인되지 않는다.
- untracked/modified 파일이 이미 많은 상태라, 이번 단계 변경분만 리뷰할 때는 `analysis-request-flow.tsx`와 새 `analysis-*` 컴포넌트 3개를 중심으로 확인해야 한다.

## 03-B3로 넘어가도 되는지 여부

가능하다. 단, 03-B3에서도 state/effect/API/polling/cleanup 이동은 신중하게 다루고, 현재 `analysis-result-preview.tsx`로 이동한 demo/mock preset의 책임 범위를 다시 확인해야 한다.
