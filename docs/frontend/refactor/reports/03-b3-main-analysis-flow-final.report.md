# 03-B3 main analysis flow 마무리 리포트

## 판정

CONDITIONAL PASS

사유: `git diff --check`와 `npm run build`는 통과했다. 다만 `npm run lint`는 로컬 `eslint` 실행 파일 부재로 실패했고, `npm run typecheck` / `npm run test`는 package script가 없어 실행하지 못했다. 현재 Next build도 type validation을 skip한다.

## 변경한 파일

- `app/main/_components/analysis-request-flow.tsx`
  - `AnalysisResultPreview`에 `showDemoResult={features.mockApi}`를 전달해 demo result 표시 조건을 명시했다.
  - upload/polling/API/cleanup/state/effect 소유 위치는 변경하지 않았다.
- `app/main/_components/analysis-result-preview.tsx`
  - 기존 demo result 렌더링을 `DemoAnalysisResult` 내부로 묶었다.
  - real 모드에서는 fake score/hash/frame/reason 대신 상태 안내 UI(`AnalysisResultUnavailable`)를 표시하도록 했다.
- `docs/frontend/refactor/reports/03-b3-main-analysis-flow-final.report.md`
  - 03-B3 수행 결과와 검증 내역을 기록했다.

## 정리한 항목

- 제거한 미사용 import/helper
  - 이번 B3에서 새로 제거한 미사용 import/helper는 없다.
  - B1/B2에서 이미 큰 표현 컴포넌트와 관련 import 정리가 이루어진 상태였고, 이번 단계에서는 명확히 미사용인 항목을 추가로 발견하지 못했다.
- 유지한 항목과 이유
  - `resultPresets`, demo frame/reason 데이터, `getMockHash`, `getMockTxHash`는 `features.mockApi`일 때만 표시되는 demo preview 경로에서 기존 동작을 보존하기 위해 유지했다.
  - `AnalysisResultPreview`는 아직 real API 결과 데이터를 직접 받지 않는다. 실제 분석 완료 경로는 `/evidences/{id}` 상세 페이지 이동이므로, real 모드 preview는 안내 UI로 제한했다.

## demo/mock result 경계 확인

- `resultPresets` 위치
  - `app/main/_components/analysis-result-preview.tsx`
- `getMockHash` / `getMockTxHash` 위치
  - `app/main/_components/analysis-result-preview.tsx`
- demo frame/reason 데이터 위치
  - `app/main/_components/analysis-result-preview.tsx`
- real 모드에서 표시되는지 여부
  - 표시되지 않음. `analysis-request-flow.tsx`에서 `showDemoResult={features.mockApi}`를 넘기며, false일 때 `AnalysisResultUnavailable`이 표시된다.
- mock/demo 모드에서만 표시되는지 여부
  - `features.mockApi === true`일 때만 `DemoAnalysisResult`가 렌더되고, 이때 기존 `resultPresets`, demo frame/reason, mock hash/tx hash가 사용된다.
- 확인 필요 항목
  - 향후 실제 API 결과를 main 화면에서 직접 미리보기로 보여줄 계획이 있다면, `AnalysisResultPreview`에 실제 result prop을 추가하고 demo preset과 별도 경로로 분리해야 한다.

## real 모드 결과 표시 정책

- 실제 API 결과 있을 때
  - 현재 main upload flow에서는 직접 표시하지 않고, polling 완료 시 `/evidences/{evidenceId}` 상세 페이지로 이동한다.
- 실제 결과 없을 때
  - fake score, fake frame risk, fake reason, fake hash, fake tx hash를 표시하지 않는다.
  - 대신 “분석 요청이 완료되었습니다.”, “상세 분석 결과는 증거 상세 화면에서 확인할 수 있습니다.”, “현재 표시할 분석 근거가 없습니다.” 안내 UI를 표시한다.
- uploadOnlyMode일 때
  - 기존 라우팅을 유지한다. 업로드 성공 후 `/evidences/{evidenceId}`로 이동하며, 실패 시 기존 업로드 성공 메시지를 표시한다.
- mockApi일 때
  - 기존 demo result preview를 표시한다.

## analysis-request-flow.tsx 줄 수

- 변경 전: 483
- 변경 후: 484

## 관련 파일별 줄 수

- `app/main/_components/analysis-request-flow.tsx`: 484
- `app/main/_components/analysis-result-preview.tsx`: 286
- `app/main/_components/analysis-progress-panel.tsx`: 51
- `app/main/_components/analysis-cancelled-panel.tsx`: 84
- `app/main/_components/upload-step.tsx`: 245
- `app/main/_components/media-preview.tsx`: 120
- `app/main/_components/media-metadata-preview.tsx`: 159

## 유지한 동작

- 파일 선택: 변경 없음.
- 드롭존: 변경 없음.
- 미디어 프리뷰: 변경 없음.
- 메타데이터 표시: 변경 없음.
- 업로드 시작: `uploadEvidence` 호출 위치와 조건 변경 없음.
- 분석 진행: `AnalysisProgressPanel` 렌더링 경로 유지.
- polling: `fetchAnalysisStatus` polling effect 유지.
- 취소: `cancelAnalysis`와 `AnalysisCancelledPanel` 렌더링 경로 유지.
- 결과 미리보기: mockApi에서는 기존 demo preview 유지, real 모드에서는 fake 결과 대신 안내 UI 표시.
- uploadOnlyMode 라우팅: 변경 없음.
- URL cleanup: `URL.createObjectURL` / `URL.revokeObjectURL` 위치와 동작 변경 없음.

## polling / cleanup 보존 여부

- polling 변경 여부: 변경 없음. `window.setInterval`과 cleanup은 `analysis-request-flow.tsx`에 유지했다.
- URL cleanup 변경 여부: 변경 없음. Object URL 생성/해제 로직은 원 파일에 유지했다.
- API 호출 시점 변경 여부: 변경 없음. `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus` 호출 위치와 시점은 유지했다.
- uploadOnlyMode 라우팅 변경 여부: 변경 없음. `features.uploadOnlyMode` 분기와 `/evidences/{id}` 이동 로직은 유지했다.

## 검색 결과

- demo/mock 검색 결과
  - `analysis-result-preview.tsx`에 `resultPresets`, demo frame/reason, `getMockHash`, `getMockTxHash`가 남아 있다.
  - `analysis-request-flow.tsx`에는 `showDemoResult={features.mockApi}`와 API 응답 `hashValue` 참조만 있다.
  - `media-metadata-preview.tsx`에는 업로드 해시 표시용 `hashValue` fallback 문구가 있다.
- features.mockApi 검색 결과
  - `analysis-request-flow.tsx`: `showDemoResult={features.mockApi}`
  - `lib/features.ts`: `mockApi` 정의
  - `lib/api/evidence-detail.ts`, `lib/api/admin.ts`: 기존 mock API 분기
- polling/API/cleanup 검색 결과
  - `analysis-request-flow.tsx`에 `useEffect`, `window.setInterval`, `window.setTimeout`, `URL.createObjectURL`, `URL.revokeObjectURL`, `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus`가 모두 남아 있다.

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

- `analysis-result-preview.tsx`는 아직 실제 API 분석 결과를 표시하는 컴포넌트가 아니라 mock/demo preview 또는 real 안내 UI 역할만 한다. 실제 결과 미리보기를 main 화면에 넣으려면 별도 데이터 계약이 필요하다.
- `npm run build`가 type validation을 skip하므로 타입 레벨 회귀는 별도 타입체크 환경이 마련되기 전까지 완전히 보장되지 않는다.
- 현재 작업 트리에 03-A/03-B 이전 단계 변경과 기타 기존 변경물이 함께 많으므로, 리뷰 시 03-B3의 핵심 변경은 `showDemoResult` prop과 `AnalysisResultUnavailable` 경계에 집중하는 것이 좋다.

## 03-C로 넘어가도 되는지 여부

가능하다. 단, 03-C 시작 전에는 main flow가 real 모드에서 fake 결과를 표시하지 않는다는 점과, 상세 결과 화면(`/evidences/{id}`)로 이동하는 실제 완료 플로우를 브라우저에서 한 번 더 확인하는 것을 권장한다.
