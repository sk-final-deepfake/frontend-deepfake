# 03-A3 cases integrity metadata 분리 리포트

## 판정

CONDITIONAL PASS

사유:
- `IntegrityTab`, `MetadataReportTab` 표현 컴포넌트 분리는 완료했고 `npm run build`는 통과했다.
- `npm run lint`는 `eslint: command not found`, `npm run typecheck`/`npm run test`는 script 부재로 실행 검증이 불가했다.
- `page.tsx`에 이번 A3 범위 밖의 기존 미사용 helper(`formatDuration`, `StatusPanel`, `InfoBox`)가 남아 있어 03-A4에서 정리 확인이 필요하다.

## 변경한 파일

- `app/cases/[id]/page.tsx`
  - 무결성/메타데이터·보고서 탭 JSX를 route-local 컴포넌트 import로 교체했다.
  - 데이터 로딩, 증거 선택, 탭 조립, `copied` 상태와 `copyHash` 동작은 유지했다.
- `app/cases/[id]/_components/integrity-tab.tsx`
  - `IntegrityTab`과 내부 보조 컴포넌트 `ManifestRow`를 분리했다.
  - 해시 복사 버튼은 `copied`, `onCopyHash` props만 받아 기존 상태 소유권을 유지했다.
- `app/cases/[id]/_components/metadata-report-tab.tsx`
  - `MetadataReportTab`과 내부 보조 컴포넌트 `ReportInfoItem`, `MetaTable`, `VerificationQr`를 분리했다.
  - 메타데이터 포맷 helper는 기존 출력과 동일하게 탭 파일 내부로 이동했다.
- `docs/frontend/refactor/reports/03-a3-cases-integrity-metadata.report.md`
  - 03-A3 작업 결과와 검증 내역을 기록했다.

## 분리한 컴포넌트 목록

- `IntegrityTab`
- `ManifestRow`
- `MetadataReportTab`
- `ReportInfoItem`
- `MetaTable`
- `VerificationQr`

`InfoBox`는 현재 활성 사용처가 없어 이동하지 않고 기존 위치에 남겼다. 03-A4의 미사용 코드 정리 단계에서 제거 여부를 판단하는 것이 안전하다.

## 새 파일 구조

```text
app/cases/[id]/_components/
  integrity-tab.tsx
  metadata-report-tab.tsx
```

## page.tsx 줄 수

- 변경 전: 972
- 변경 후: 538

## 새 파일별 줄 수

- `app/cases/[id]/_components/integrity-tab.tsx`: 185
- `app/cases/[id]/_components/metadata-report-tab.tsx`: 256

## 유지한 동작

- 무결성 탭 표시: `IntegrityTab`으로 이동, 기존 문구/레이아웃/클래스 유지
- 메타데이터 탭 표시: `MetadataReportTab`으로 이동, 기존 표 구조/문구/클래스 유지
- 보고서/검증 정보 표시: `VerificationQr`, `ReportInfoItem`을 탭 내부 보조 컴포넌트로 유지
- 복사 버튼 동작: `page.tsx`의 `copyHash`, `copied`, timeout 상태는 이동하지 않음
- copied timeout: 기존 `useEffect` 유지
- 탭 전환: `TabsContent`와 탭 조립 흐름 유지
- 401/404 에러 메시지: `getErrorMessage`와 에러 UI 변경 없음
- “분석 근거 없음” 분기: A2의 `DeepfakeModelTab` 정책 변경 없음

## 02 mock/real 정책 유지 여부

- fake evidence 생성 로직 부활 여부: 부활하지 않음
- riskScore 기반 frame/segment/finding 생성 여부: 생성하지 않음
- mock import 위치 변화 여부: 변경 없음

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

해석:
- 검색 결과는 `lib/mock/analysis-result.ts` mock 전용 파일에만 존재한다.
- `app/cases/[id]/page.tsx`와 route-local `_components`에는 fake evidence 생성기 직접 import/사용이 없다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
| -- | --------: | -- |
| `git diff --check` | 0 | 통과 |
| `npm run build` | 0 | 통과. Next build compiled successfully. 타입 검증은 기존 설정대로 skipped |
| `npm run lint` | 127 | 실패. `eslint: command not found` |
| `npm run typecheck` | 1 | 실패. `Missing script: "typecheck"` |
| `npm run test` | 1 | 실패. `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- `npm run lint`: `eslint` 바이너리가 없어 실행 불가. 패키지 설치/수정 금지 지시에 따라 조치하지 않음.
- `npm run typecheck`: `package.json`에 `typecheck` script가 없어 실행 불가.
- `npm run test`: `package.json`에 `test` script가 없어 실행 불가.

## 남은 위험

- 빌드는 통과했지만 Next 설정상 타입 검증이 skip되어 정적 타입 회귀를 완전히 보장하지 못한다.
- `page.tsx`에 기존 미사용 helper로 보이는 `formatDuration`, `StatusPanel`, `InfoBox`가 남아 있다. 이번 A3 범위를 넘지 않기 위해 제거하지 않았고, 03-A4에서 import/미사용 함수 정리를 확인해야 한다.
- UI를 브라우저에서 직접 클릭 검증하지는 못했다. 탭 전환, 복사 버튼은 코드상 상태 소유권과 callback 호출 구조를 유지했다.

## 03-A4로 넘어가도 되는지 여부

가능.

단, 03-A4에서는 `page.tsx`의 남은 미사용 import/helper 정리와 route-local component import 정리를 우선 확인하는 것이 좋다. API 호출, state/effect, mock/real 정책은 계속 변경하지 않아야 한다.

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
?? lib/mock/
?? tmp-upload-test.mp4
```
