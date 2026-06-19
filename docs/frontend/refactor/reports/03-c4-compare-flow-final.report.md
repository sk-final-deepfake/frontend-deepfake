# 03-C4 compare flow 마무리 리포트

## 판정

CONDITIONAL PASS

사유: `compare-verification-flow.tsx`의 남은 책임과 사용처를 확인했고, 명확하게 제거할 미사용 import/helper/type은 발견되지 않았다. request guard, 취소, 다운로드, blob cleanup, API 호출 위치는 모두 원 파일에 유지했다. `npm run build`는 통과했지만 `npm run lint`는 `eslint` 실행 파일 부재로 실패했고, `typecheck`/`test` script는 없다.

## 변경한 파일

- `docs/frontend/refactor/reports/03-c4-compare-flow-final.report.md`
  - 03-C4 사후 점검과 검증 결과를 기록했다.

03-C4에서 `app/compare/_components/compare-verification-flow.tsx`의 코드 수정은 하지 않았다. 검색 결과상 제거할 명확한 미사용 항목이 없고, step 렌더링 흐름도 source → upload → processing → result 순서가 유지되어 있어 추가 변경이 불필요하다고 판단했다.

## 정리한 항목

### 제거한 미사용 import/helper/type

- 없음.

### 유지한 항목과 이유

- `useEffect`, `useRef`, `useState`, `DragEvent`: 원 파일의 로딩, 진행률, request guard, 파일 드롭 핸들러에서 사용 중.
- `CompareResult`: `compareResult` state와 `ResultStep` props에서 사용 중.
- `SourceEvidence`, `SourceCase`, `UploadedCompareFile`: route-local 하위 컴포넌트들이 import하는 exported type이라 유지.
- `getCaseStatusLabel`, `getMediaTypeLabel`, `formatDateTimeLabel`, `formatFileSize`: 사건/증거 hydrate와 파일 크기 라벨 생성에 사용 중.
- `ResultStep`: 다운로드 상태와 blob cleanup을 원 파일에 유지하기 위한 얇은 컨테이너라 유지.
- `getCompareItemResultLabel`, `getVerdictDisplay`: `compare-result-panel.tsx` 내부에서 실제 사용 중.
- `CompareFileSummary`: `compare-processing-panel.tsx` 내부에서 실제 사용 중.
- `EvidencePreview`, `getEvidenceMediaLabel`, `getEvidencePreviewTone`: `source-evidence-selector.tsx` 내부에서 실제 사용 중.

### 후속 후보

- `SourceEvidence`, `SourceCase`, `UploadedCompareFile` 타입은 이후 `03-D` 이후 별도 route-local type 파일로 이동 가능하다. 이번 단계에서는 타입 분리 금지에 가까운 범위라 유지했다.
- `ResultStep`은 다운로드 상태를 포함하므로 지금은 원 파일에 남기는 게 안전하다. 추후 다운로드 로직까지 별도 hook으로 분리하는 단계가 생기면 이동 후보가 될 수 있다.

## compare-verification-flow.tsx 줄 수

- 변경 전: 473줄
- 변경 후: 473줄

## 현재 compare 파일 구조

```text
app/compare/_components/
├── compare-verification-flow.tsx
├── source-evidence-selector.tsx
├── compare-file-uploader.tsx
├── compare-processing-panel.tsx
└── compare-result-panel.tsx
```

## compare-verification-flow.tsx에 남은 책임

- 사건 목록 로딩: `fetchMyAnalysisHistory`
- 증거 hydrate: `fetchCaseDetail`, `mapCaseDetailToSourceCase`
- 검색/선택 상태: `selectedCaseId`, `selectedEvidenceId`, `caseQuery`, `evidenceQuery`
- 파일 상태: `compareFile`, `fileInputRef`, `handleFileChange`, `handleDrop`
- 비교 요청 상태: `compareResult`, `compareError`, `progress`, `step`
- request guard: `compareRequestRef`, `activeCompareRequestTokenRef`
- 취소: `cancelCompare`, `cancelCompareVerification`
- 다운로드: `ResultStep`, `downloadCompareReport`
- blob cleanup: `URL.createObjectURL`, `URL.revokeObjectURL`
- step 조립: `SourceEvidenceSelector`, `CompareFileUploader`, `CompareProcessingPanel`, `ResultStep`

## 유지한 동작

- 사건 목록 로드: 유지
- 증거 선택: 유지
- 비교 파일 선택: 유지
- 비교 요청: 유지
- 비교 취소: 유지
- 결과 표시: 유지
- 보고서 다운로드: 유지
- 에러 처리: 유지

## ref guard / cleanup 보존 여부

- request token/ref 변경 여부: 변경 없음.
- cancellation guard 변경 여부: 변경 없음.
- blob cleanup 변경 여부: 변경 없음.
- downloadCompareReport 호출 시점 변경 여부: 변경 없음.
- API 호출 시점 변경 여부: 변경 없음.

## 검색 결과

### request guard 검색 결과

```text
app/compare/_components/compare-verification-flow.tsx:3:import { useEffect, useRef, useState, type DragEvent } from "react"
app/compare/_components/compare-verification-flow.tsx:11:  cancelCompareVerification,
app/compare/_components/compare-verification-flow.tsx:13:  verifyCompare,
app/compare/_components/compare-verification-flow.tsx:81:  const fileInputRef = useRef<HTMLInputElement>(null)
app/compare/_components/compare-verification-flow.tsx:82:  const compareRequestRef = useRef(0)
app/compare/_components/compare-verification-flow.tsx:83:  const activeCompareRequestTokenRef = useRef<string | null>(null)
app/compare/_components/compare-verification-flow.tsx:85:  useEffect(() => {
app/compare/_components/compare-verification-flow.tsx:138:  useEffect(() => {
app/compare/_components/compare-verification-flow.tsx:169:    const requestId = compareRequestRef.current + 1
app/compare/_components/compare-verification-flow.tsx:174:    compareRequestRef.current = requestId
app/compare/_components/compare-verification-flow.tsx:175:    activeCompareRequestTokenRef.current = requestToken
app/compare/_components/compare-verification-flow.tsx:182:      const result = await verifyCompare(selectedEvidenceId, compareFile.file, requestToken)
app/compare/_components/compare-verification-flow.tsx:183:      if (compareRequestRef.current !== requestId) return
app/compare/_components/compare-verification-flow.tsx:188:      if (compareRequestRef.current !== requestId) return
app/compare/_components/compare-verification-flow.tsx:192:      if (compareRequestRef.current === requestId) {
app/compare/_components/compare-verification-flow.tsx:193:        activeCompareRequestTokenRef.current = null
app/compare/_components/compare-verification-flow.tsx:199:    const requestToken = activeCompareRequestTokenRef.current
app/compare/_components/compare-verification-flow.tsx:201:      void cancelCompareVerification(requestToken).catch(() => undefined)
app/compare/_components/compare-verification-flow.tsx:204:    compareRequestRef.current += 1
app/compare/_components/compare-verification-flow.tsx:205:    activeCompareRequestTokenRef.current = null
app/compare/_components/compare-verification-flow.tsx:212:    compareRequestRef.current += 1
app/compare/_components/compare-verification-flow.tsx:213:    activeCompareRequestTokenRef.current = null
```

### download/blob cleanup 검색 결과

```text
app/compare/_components/compare-verification-flow.tsx:12:  downloadCompareReport,
app/compare/_components/compare-verification-flow.tsx:391:      const blob = await downloadCompareReport(result.compareId)
app/compare/_components/compare-verification-flow.tsx:392:      const url = URL.createObjectURL(blob)
app/compare/_components/compare-verification-flow.tsx:399:      URL.revokeObjectURL(url)
```

### 보조 함수 사용처 검색 결과

```text
app/compare/_components/compare-result-panel.tsx:35:  const verdict = getVerdictDisplay(result.verdict, result.summary.verdictLabel)
app/compare/_components/compare-result-panel.tsx:110:                      {getCompareItemResultLabel(item.result)}
app/compare/_components/compare-result-panel.tsx:148:function getCompareItemResultLabel(result: string) {
app/compare/_components/compare-result-panel.tsx:158:function getVerdictDisplay(verdict: CompareVerdict, verdictLabel: string) {
app/compare/_components/compare-processing-panel.tsx:45:        <CompareFileSummary label="원본" name={sourceEvidence.name} detail={String(sourceEvidence.id)} />
app/compare/_components/compare-processing-panel.tsx:46:        <CompareFileSummary label="대상" name={compareFile?.name ?? "비교 파일"} detail={compareFile?.sizeLabel ?? "-"} />
app/compare/_components/compare-processing-panel.tsx:65:function CompareFileSummary({ label, name, detail }: { label: string; name: string; detail: string }) {
app/compare/_components/source-evidence-selector.tsx:221:                    <EvidencePreview evidence={evidence} isSelected={isSelected} />
app/compare/_components/source-evidence-selector.tsx:234:                        {getEvidenceMediaLabel(evidence)}
app/compare/_components/source-evidence-selector.tsx:280:function EvidencePreview({
app/compare/_components/source-evidence-selector.tsx:287:  const toneClassName = getEvidencePreviewTone(evidence.id)
app/compare/_components/source-evidence-selector.tsx:308:function getEvidenceMediaLabel(_evidence: SourceEvidence) {
app/compare/_components/source-evidence-selector.tsx:312:function getEvidencePreviewTone(evidenceId: number) {
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
- 현재 working tree에는 03-C4 외의 이전 단계 변경과 기존 변경물이 함께 남아 있어, 최종 커밋 전 범위 확인이 필요하다.
- 타입 export가 원 파일에 남아 있어 파일 책임이 완전히 순수 컨테이너만은 아니다. 다만 이번 단계에서는 타입 분리를 하지 않는 조건이므로 유지했다.

## 03-D로 넘어가도 되는지 여부

가능하다. 단, 03-D에서도 mock/real 정책과 API 호출 위치를 유지하고, 이번 단계에서 확인한 request guard/download/blob cleanup 위치를 다시 보존해야 한다.
