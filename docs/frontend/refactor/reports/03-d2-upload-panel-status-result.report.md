# 03-D2 upload panel status/result 분리 리포트

## 판정

CONDITIONAL PASS

사유: `components/upload-panel.tsx`에서 업로드 진행/에러 상태, 성공 결과 목록/카드, 하단 action bar를 props-only 컴포넌트로 분리했다. localStorage session, hydrate/save effect, polling, 분석 시작/취소, API 호출, parent callback 위치는 원 파일에 유지했다. `npm run build`는 통과했지만 `npm run lint`는 `eslint` 실행 파일 부재로 실패했고, `typecheck`/`test` script는 없다.

## 변경한 파일

- `components/upload-panel.tsx`
  - 업로드 진행/에러 UI를 `UploadStatusPanel` 호출로 대체했다.
  - 성공 결과 목록/카드 UI를 `UploadResultList` 호출로 대체했다.
  - 하단 action bar를 `UploadActionBar` 호출로 대체했다.
  - API 호출, polling, session persistence, parent callback은 그대로 유지했다.
- `components/upload-panel/upload-status-panel.tsx`
  - 업로드 진행률과 global error 표시를 분리했다.
- `components/upload-panel/upload-result-list.tsx`
  - 업로드 완료/분석 현황 목록과 안내 문구를 분리했다.
- `components/upload-panel/upload-result-card.tsx`
  - 개별 성공 결과 카드, 분석 상태 badge, 분석 중단 버튼, 분석 진행률 표시를 분리했다.
- `components/upload-panel/upload-action-bar.tsx`
  - 새 사건 시작, 분석 시작, 업로드 시작 버튼 영역을 분리했다.
- `docs/frontend/refactor/reports/03-d2-upload-panel-status-result.report.md`
  - 03-D2 작업과 검증 결과를 기록했다.

## 분리한 컴포넌트 목록

- `UploadStatusPanel`
  - `isUploading`, `progress`, `error`만 받아 진행률과 에러 문구를 표시한다.
- `UploadResultList`
  - `fileStates`, `displayedSuccessStates`, `hasAnalyzedFiles`, `isBusy`, `canCancelAnalysisFile`, `onCancelAnalysisFile`을 받아 결과 목록을 표시한다.
- `UploadResultCard`
  - 개별 업로드 결과 카드와 분석 상태 표시를 담당한다.
- `UploadActionBar`
  - 새 사건 시작, 분석 시작, 업로드 시작 버튼 표시를 담당한다.

## 새 파일 구조

```text
components/
├── upload-panel.tsx
└── upload-panel/
    ├── upload-dropzone.tsx
    ├── upload-file-list.tsx
    ├── upload-file-card.tsx
    ├── upload-status-panel.tsx
    ├── upload-result-list.tsx
    ├── upload-result-card.tsx
    └── upload-action-bar.tsx
```

## upload-panel.tsx 줄 수

- 변경 전: 758줄
- 변경 후: 633줄

## 새 파일별 줄 수

- `components/upload-panel/upload-action-bar.tsx`: 85줄
- `components/upload-panel/upload-result-list.tsx`: 61줄
- `components/upload-panel/upload-result-card.tsx`: 85줄
- `components/upload-panel/upload-status-panel.tsx`: 33줄

참고: 03-D1에서 추가된 파일 줄 수는 `upload-dropzone.tsx` 74줄, `upload-file-list.tsx` 30줄, `upload-file-card.tsx` 94줄이다.

## 유지한 동작

- 업로드 시작 버튼: `UploadActionBar`로 이동했지만 `onUpload={handleUpload}`, disabled 조건, title 문구, 버튼 문구 유지.
- 분석 상태 표시: `UploadResultCard`로 이동했지만 `AnalysisStatusBadge` 상태 분기 유지.
- 진행률 표시: 업로드 진행률은 `UploadStatusPanel`, 분석 진행률은 `UploadResultCard`로 이동. `progress` state와 값 계산 위치는 유지.
- 성공 결과 카드: `UploadResultCard`로 이동. 증거 ID, 사건명, 해시 축약 표시, 카드 class 유지.
- 분석 취소: 버튼 UI만 이동. `cancelAnalysisFile`과 `cancelAnalysis` 호출 위치는 원 파일에 유지.
- 에러 표시: `UploadStatusPanel`로 이동. `globalError` state 소유와 설정 위치 유지.
- 기존 state/effect/API 호출 위치: 유지.
- parent callback 호출 위치: `onMetadataChange`, `onAnalyzeComplete` 모두 원 파일에 유지.

## session / polling / cleanup 보존 여부

- localStorage session 변경 여부: 변경 없음. `loadMainUploadPanelSession`, `saveMainUploadPanelSession`, `clearMainUploadPanelSession` 위치 유지.
- hydrate/save effect 변경 여부: 변경 없음.
- polling 변경 여부: 변경 없음. `pollingKey`, `pollStatuses`, `setInterval`, `clearInterval`, `fetchAnalysisStatus` 위치 유지.
- cancel flow 변경 여부: 변경 없음. `cancelAnalysisFile`, `cancelAnalysis` 위치 유지.
- API 호출 시점 변경 여부: 변경 없음. `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus`, `cancelAnalysis` 호출 위치 유지.
- dedupe by hash 변경 여부: 변경 없음. `dedupeResultsByHash` 유지.

## flatMap 타입 이슈 처리 여부

- 수정하지 않았다.
- 이유: `buildMetadataItems`의 `flatMap`은 이번 D2 분리 대상인 상태/결과/action bar JSX와 직접 관련이 없고, `npm run build`도 통과했다. 사용자 지시대로 관련 없는 타입 오류는 함께 고치지 않았다.

## 검색 결과

### session / polling / API / callback 검색

```text
components/upload-panel.tsx:4:import { useCallback, useEffect, useRef, useState } from "react"
components/upload-panel.tsx:21:  cancelAnalysis,
components/upload-panel.tsx:22:  fetchAnalysisStatus,
components/upload-panel.tsx:23:  startEvidenceAnalysis,
components/upload-panel.tsx:24:  uploadEvidence,
components/upload-panel.tsx:66:  onMetadataChange?: (items: MetadataDisplayItem[]) => void
components/upload-panel.tsx:67:  onAnalyzeComplete?: (results: UploadResult[], startedCount: number) => void
components/upload-panel.tsx:71:  return fileStates.flatMap((state, index) => {
components/upload-panel.tsx:98:function dedupeResultsByHash(results: UploadResult[]): UploadResult[] {
components/upload-panel.tsx:121:export function UploadPanel({ onMetadataChange, onAnalyzeComplete }: UploadPanelProps) {
components/upload-panel.tsx:135:  useEffect(() => {
components/upload-panel.tsx:163:              evidenceIds.map((id) => fetchAnalysisStatus(id).catch(() => null))
components/upload-panel.tsx:192:  useEffect(() => {
components/upload-panel.tsx:193:    onMetadataChange?.(buildMetadataItems(fileStates))
components/upload-panel.tsx:197:  const pollingKey = stoppableEvidenceIds.join(",")
components/upload-panel.tsx:217:  useEffect(() => {
components/upload-panel.tsx:220:    const pollStatuses = async () => {
components/upload-panel.tsx:224:          fetchAnalysisStatus(id).catch(() => null)
components/upload-panel.tsx:250:    const interval = setInterval(() => {
components/upload-panel.tsx:319:  const cancelAnalysisFile = async (index: number) => {
components/upload-panel.tsx:332:      await cancelAnalysis(target.result.evidenceId)
components/upload-panel.tsx:383:        const result = await uploadEvidence(item.file, trimmedCaseName)
components/upload-panel.tsx:433:    const uniqueResults = dedupeResultsByHash(
components/upload-panel.tsx:441:      const response = await startEvidenceAnalysis(evidenceIds, trimmedCaseName)
components/upload-panel.tsx:469:        onAnalyzeComplete?.(analyzedResults, response.startedCount)
```

### 분리 컴포넌트 검색

```text
components/upload-panel/upload-status-panel.tsx:9:export function UploadStatusPanel({
components/upload-panel/upload-result-card.tsx:15:export function UploadResultCard({
components/upload-panel/upload-action-bar.tsx:21:export function UploadActionBar({
components/upload-panel.tsx:11:import { UploadActionBar } from "@/components/upload-panel/upload-action-bar"
components/upload-panel.tsx:14:import { UploadResultList } from "@/components/upload-panel/upload-result-list"
components/upload-panel.tsx:15:import { UploadStatusPanel } from "@/components/upload-panel/upload-status-panel"
components/upload-panel.tsx:599:          <UploadStatusPanel
components/upload-panel.tsx:605:          <UploadResultList
components/upload-panel.tsx:616:      <UploadActionBar
components/upload-panel/upload-result-list.tsx:4:import { UploadResultCard } from "@/components/upload-panel/upload-result-card"
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

- `npm run lint`: script는 있으나 `eslint` 실행 파일이 없어 실패했다. 패키지 설치는 금지되어 있어 수정하지 않았다.
- `npm run typecheck`: package script가 없다.
- `npm run test`: package script가 없다.

## 남은 위험

- `npm run build`가 type validation을 skip하므로 별도 타입 검증 공백이 남는다.
- `UploadFileCardState`와 `FileUploadState`가 구조적으로 맞는 상태로 여러 파일에서 사용되고 있다. 이후 D3에서 타입 전용 파일을 검토할 수 있다.
- `upload-panel.tsx`에는 아직 state/effect/API 흐름이 남아 있어 633줄이다. 다만 이번 단계 목표인 표현 영역 분리는 완료했다.

## 03-D3로 넘어가도 되는지 여부

가능하다. 단, 03-D3에서도 localStorage session, polling, API 호출, parent callback 위치를 유지하고, 타입 정리나 마무리 점검 범위로만 진행해야 한다.
