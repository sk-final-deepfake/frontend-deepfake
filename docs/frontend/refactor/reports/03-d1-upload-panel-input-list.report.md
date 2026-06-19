# 03-D1 upload panel input/list 분리 리포트

## 판정

CONDITIONAL PASS

사유: `components/upload-panel.tsx`에서 업로드 드롭존과 단순 파일 목록/파일 카드 UI를 props-only 컴포넌트로 분리했다. localStorage session, hydrate/save effect, polling, 분석 시작/취소, API 호출, parent callback 위치는 원 파일에 유지했다. `npm run build`는 통과했지만 `npm run lint`는 `eslint` 실행 파일 부재로 실패했고, `typecheck`/`test` script는 없다.

## 변경한 파일

- `components/upload-panel.tsx`
  - 드롭존 JSX를 `UploadDropzone` 호출로 대체했다.
  - 단순 파일 목록 JSX를 `UploadFileList` 호출로 대체했다.
  - 분리 후 남은 명확한 미사용 import인 `formatFileSize`를 제거했다.
- `components/upload-panel/upload-dropzone.tsx`
  - 파일 선택 input과 drag/drop 영역을 props-only 컴포넌트로 분리했다.
- `components/upload-panel/upload-file-list.tsx`
  - 파일 목록 `<ul>` 렌더링과 key 유지 책임을 분리했다.
- `components/upload-panel/upload-file-card.tsx`
  - 개별 파일 카드, 파일 타입 아이콘, 파일 크기/상태 라벨 표시를 분리했다.
- `docs/frontend/refactor/reports/03-d1-upload-panel-input-list.report.md`
  - 03-D1 작업과 검증 결과를 기록했다.

## 분리한 컴포넌트 목록

- `UploadDropzone`
  - `inputRef`, `accept`, `isBusy`, `isDragging`, drag/drop/click/file-change callback만 받는다.
- `UploadFileList`
  - `fileStates`, `isBusy`, `onRemoveFile`만 받는다.
- `UploadFileCard`
  - 개별 파일 표시와 제거 버튼 표시만 담당한다.

## 새 파일 구조

```text
components/
├── upload-panel.tsx
└── upload-panel/
    ├── upload-dropzone.tsx
    ├── upload-file-list.tsx
    └── upload-file-card.tsx
```

## upload-panel.tsx 줄 수

- 변경 전: 850줄
- 변경 후: 758줄

## 새 파일별 줄 수

- `components/upload-panel/upload-dropzone.tsx`: 74줄
- `components/upload-panel/upload-file-list.tsx`: 30줄
- `components/upload-panel/upload-file-card.tsx`: 94줄

## 유지한 동작

- 파일 선택: `inputRef`, `acceptMap[kind]`, `multiple`, `disabled={isBusy}`, `onFileChange={addFiles}` 유지
- 드롭존: click, Enter/Space key, drag over/leave/drop callback 흐름 유지
- 파일 목록 표시: 기존 `fileStates.map` 기반 표시 유지
- 파일 제거: 기존 `removeFile(index)` 호출 유지
- 업로드 시작 버튼: 원 파일의 action bar에 그대로 유지
- 기존 state/effect/API 호출 위치: 유지
- parent callback 호출 위치: `onMetadataChange`, `onAnalyzeComplete` 모두 원 파일에 유지

## session / polling / cleanup 보존 여부

- localStorage session 변경 여부: 변경 없음. `loadMainUploadPanelSession`, `saveMainUploadPanelSession`, `clearMainUploadPanelSession` 위치 유지.
- hydrate/save effect 변경 여부: 변경 없음.
- polling 변경 여부: 변경 없음. `pollingKey`, `setInterval`, `clearInterval`, `fetchAnalysisStatus` 위치 유지.
- cancel flow 변경 여부: 변경 없음. `cancelAnalysisFile`, `cancelAnalysis` 위치 유지.
- API 호출 시점 변경 여부: 변경 없음. `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus`, `cancelAnalysis` 호출 위치 유지.
- dedupe by hash 변경 여부: 변경 없음. `dedupeResultsByHash` 유지.

## flatMap 타입 이슈 처리 여부

- 수정하지 않았다.
- 이유: `buildMetadataItems`의 `flatMap`은 이번 D1 분리 대상인 드롭존/파일 목록 JSX와 직접 관련이 없고, `npm run build`도 통과했다. 사용자 지시대로 관련 없는 타입 오류는 함께 고치지 않았다.

## 검색 결과

### session / polling / API / callback 검색

```text
components/upload-panel.tsx:4:import { useCallback, useEffect, useRef, useState } from "react"
components/upload-panel.tsx:27:  cancelAnalysis,
components/upload-panel.tsx:28:  fetchAnalysisStatus,
components/upload-panel.tsx:29:  startEvidenceAnalysis,
components/upload-panel.tsx:30:  uploadEvidence,
components/upload-panel.tsx:72:  onMetadataChange?: (items: MetadataDisplayItem[]) => void
components/upload-panel.tsx:73:  onAnalyzeComplete?: (results: UploadResult[], startedCount: number) => void
components/upload-panel.tsx:77:  return fileStates.flatMap((state, index) => {
components/upload-panel.tsx:104:function dedupeResultsByHash(results: UploadResult[]): UploadResult[] {
components/upload-panel.tsx:127:export function UploadPanel({ onMetadataChange, onAnalyzeComplete }: UploadPanelProps) {
components/upload-panel.tsx:141:  useEffect(() => {
components/upload-panel.tsx:169:              evidenceIds.map((id) => fetchAnalysisStatus(id).catch(() => null))
components/upload-panel.tsx:198:  useEffect(() => {
components/upload-panel.tsx:199:    onMetadataChange?.(buildMetadataItems(fileStates))
components/upload-panel.tsx:203:  const pollingKey = stoppableEvidenceIds.join(",")
components/upload-panel.tsx:223:  useEffect(() => {
components/upload-panel.tsx:226:    const pollStatuses = async () => {
components/upload-panel.tsx:230:          fetchAnalysisStatus(id).catch(() => null)
components/upload-panel.tsx:256:    const interval = setInterval(() => {
components/upload-panel.tsx:325:  const cancelAnalysisFile = async (index: number) => {
components/upload-panel.tsx:338:      await cancelAnalysis(target.result.evidenceId)
components/upload-panel.tsx:389:        const result = await uploadEvidence(item.file, trimmedCaseName)
components/upload-panel.tsx:439:    const uniqueResults = dedupeResultsByHash(
components/upload-panel.tsx:447:      const response = await startEvidenceAnalysis(evidenceIds, trimmedCaseName)
components/upload-panel.tsx:475:        onAnalyzeComplete?.(analyzedResults, response.startedCount)
```

### 분리 컴포넌트 검색

```text
components/upload-panel.tsx:16:import { UploadDropzone } from "@/components/upload-panel/upload-dropzone"
components/upload-panel.tsx:17:import { UploadFileList } from "@/components/upload-panel/upload-file-list"
components/upload-panel.tsx:577:      <UploadDropzone
components/upload-panel.tsx:599:          <UploadFileList
components/upload-panel/upload-dropzone.tsx:19:export function UploadDropzone({
components/upload-panel/upload-file-list.tsx:12:export function UploadFileList({
components/upload-panel/upload-file-list.tsx:20:        <UploadFileCard
components/upload-panel/upload-file-card.tsx:33:export function UploadFileCard({
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
- `UploadFileCardState`는 부모의 `FileUploadState`와 구조적으로 맞춘 타입이다. 이후 타입 전용 파일을 만들 수 있지만, 이번 단계에서는 파일을 늘리지 않기 위해 유지했다.
- 성공 결과 카드와 action bar는 이번 D1 범위 밖이라 아직 `upload-panel.tsx`에 남아 있다.

## 03-D2로 넘어가도 되는지 여부

가능하다. 단, 03-D2에서도 localStorage session, polling, API 호출, parent callback 위치를 유지하고, 이번에 남긴 성공 결과 카드/action bar 등 명확한 다음 표현 영역만 분리해야 한다.
