# 03-B1 main upload preview 분리 리포트

## 판정

CONDITIONAL PASS

사유:
- `app/main/_components/analysis-request-flow.tsx`에서 파일 선택/드롭존/미디어 프리뷰/메타데이터 프리뷰 표현 영역을 route-local 컴포넌트로 분리했다.
- `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus`, polling, URL cleanup은 모두 원 파일에 남겼다.
- `git diff --check`와 `npm run build`는 통과했다.
- `npm run lint`는 `eslint` 바이너리 부재, `typecheck`/`test`는 script 부재로 실행 검증이 불가했다.

## 변경한 파일

- `app/main/_components/analysis-request-flow.tsx`
  - 기존 업로드/프리뷰 JSX를 route-local 표현 컴포넌트 호출로 교체했다.
  - state/effect/API/polling/cleanup 로직은 유지했다.
- `app/main/_components/upload-step.tsx`
  - 업로드 안내, 사건명 입력, 드롭존, 선택 파일 목록, 업로드 시작 버튼 UI를 분리했다.
- `app/main/_components/media-preview.tsx`
  - 영상 썸네일/미리보기 버튼과 전체 화면 preview dialog UI를 분리했다.
- `app/main/_components/media-metadata-preview.tsx`
  - 메타데이터/코멘트 탭 표시와 metadata row UI를 분리했다.
- `docs/frontend/refactor/reports/03-b1-main-upload-preview.report.md`
  - 03-B1 작업 결과와 검증 내역을 기록했다.

## 분리한 컴포넌트 목록

- `UploadStep`
- `MediaMetadataPreviewContent`
- `MediaPreview`
- `VideoPreviewDialog`
- `MetadataRow`

`MediaMetadataPreview` wrapper는 `analysis-request-flow.tsx`에 남겼다. `activeTab`, `previewEvidence` 같은 프리뷰 UI 상태를 원 파일에 유지하기 위해서다.

## 새 파일 구조

```text
app/main/_components/
  analysis-request-flow.tsx
  upload-step.tsx
  media-preview.tsx
  media-metadata-preview.tsx
```

## analysis-request-flow.tsx 줄 수

- 변경 전: 1328
- 변경 후: 849

## 새 파일별 줄 수

- `app/main/_components/upload-step.tsx`: 245
- `app/main/_components/media-preview.tsx`: 120
- `app/main/_components/media-metadata-preview.tsx`: 159

## 유지한 동작

- 파일 선택: `fileInputRef`, `onFileChange`, input `type/file/multiple/accept` 유지
- 드롭존: `role`, `tabIndex`, click, keydown, dragOver, drop callback 유지
- 미디어 프리뷰: preview URL 기반 `<video>` 표시와 dialog 표시 유지
- 메타데이터 표시: 파일명, 형식, MIME, 크기, 해상도, 업로드 시간, SHA-256, 모델 표시 유지
- 파일 제거: `onRemoveFile(index)` 호출과 remove button type/aria-label 유지
- 업로드 시작 버튼: `onStart`, disabled 조건, title 문구 유지
- 기존 state/effect/API 호출 위치: `analysis-request-flow.tsx`에 유지

## polling / cleanup 보존 여부

- polling 변경 여부: 변경 없음. `fetchAnalysisStatus`와 `window.setInterval`은 `analysis-request-flow.tsx`에 그대로 남음.
- URL cleanup 변경 여부: 변경 없음. `URL.createObjectURL`, `URL.revokeObjectURL`, `revokeEvidencePreviewUrls`는 원 파일에 그대로 남음.
- API 호출 시점 변경 여부: 변경 없음. `uploadEvidence`, `startEvidenceAnalysis`, `fetchAnalysisStatus` 호출 위치와 흐름은 원 파일에 그대로 남음.

## mock/demo 잔존 확인

### resultPresets/mock/sample/demo/hash 검색 결과

명령:

```bash
rg -n "resultPresets|mock|sample|demo|hash" app/main/_components/analysis-request-flow.tsx app/main/_components/upload-step.tsx app/main/_components/media-preview.tsx app/main/_components/media-metadata-preview.tsx
```

결과:

```text
app/main/_components/analysis-request-flow.tsx:40:  hashValue?: string
app/main/_components/analysis-request-flow.tsx:103:const resultPresets = [
app/main/_components/analysis-request-flow.tsx:276:            hashValue: result.hashValue,
app/main/_components/analysis-request-flow.tsx:687:  return resultPresets[index % resultPresets.length]
app/main/_components/analysis-request-flow.tsx:762:  const hashes = [
app/main/_components/analysis-request-flow.tsx:768:  return hashes[index % hashes.length]
app/main/_components/analysis-request-flow.tsx:772:  const hashes = ["0x8f3a...92c", "0x44bd...1af", "0x91e0...7c2"]
app/main/_components/analysis-request-flow.tsx:773:  return hashes[index % hashes.length]
app/main/_components/media-metadata-preview.tsx:102:                  <MetadataRow label="SHA-256" value={evidence.hashValue ?? "분석 시작 시 생성"} accent />
```

해석:
- 기존 result/demo 관련 로직은 원 파일에 남아 있으며 이번 단계에서 새 fake 결과 로직을 추가하지 않았다.
- 새 파일에는 실제 업로드 응답 `hashValue`를 표시하는 metadata row만 있다.

### fake 결과 부활 여부

- 부활하지 않음.
- `riskScore` 기반 fake frame/segment/finding 생성기나 새로운 mock fallback을 추가하지 않았다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
|---|---:|---|
| `git diff --check` | 0 | 통과 |
| `npm run build` | 0 | 통과. Next build compiled successfully. 타입 검증은 기존 설정대로 skipped |
| `npm run lint` | 127 | 실패. `eslint: command not found` |
| `npm run typecheck` | 1 | 실패. `Missing script: "typecheck"` |
| `npm run test` | 1 | 실패. `Missing script: "test"` |

## 실행하지 못한 검증과 이유

- `npm run lint`: `eslint` 바이너리가 없어 실행 불가. 패키지 설치 금지 지시에 따라 조치하지 않음.
- `npm run typecheck`: `package.json`에 `typecheck` script가 없어 실행 불가.
- `npm run test`: `package.json`에 `test` script가 없어 실행 불가.

## 남은 위험

- `npm run build`는 통과했지만 Next 설정상 type validation이 skip되어 정적 타입 검증은 별도 확인이 필요하다.
- `MediaMetadataPreview` wrapper에 프리뷰 UI state를 남기는 방식으로 상태 소유권은 보존했지만, 브라우저에서 파일 선택/프리뷰 dialog/코멘트 입력 클릭 테스트는 별도로 확인하는 것이 좋다.
- 기존 `resultPresets`, mock hash 계열 result 화면 로직은 03-B1 범위 밖이라 건드리지 않았다. 03-B2 이후 demo/result 경계 검토가 필요할 수 있다.

## 03-B2로 넘어가도 되는지 여부

가능.

단, 03-B2에서도 polling, uploadOnlyMode 라우팅, API 호출 시점, URL cleanup을 변경하지 않고 표현 컴포넌트 분리부터 이어가야 한다.

## git status --short

```text
 M app/cases/[id]/page.tsx
 M app/evidences/[id]/page.tsx
 M app/main/_components/analysis-request-flow.tsx
 M components/analysis-result.tsx
 M docs/frontend/refactor/02-mock-isolation.md
 M docs/frontend/refactor/03-component-split.md
 M lib/api/evidence-detail.ts
 M lib/formatters.ts
 D lib/mock-forensic-api.ts
 M next-env.d.ts
 M tsconfig.tsbuildinfo
?? app/cases/[id]/_components/
?? app/main/_components/media-metadata-preview.tsx
?? app/main/_components/media-preview.tsx
?? app/main/_components/upload-step.tsx
?? docs/frontend/local-dev.md
?? docs/frontend/refactor/reports/01-utils-wiring.audit.report.md
?? docs/frontend/refactor/reports/02-mock-isolation.report.md
?? docs/frontend/refactor/reports/03-a1-cases-summary.report.md
?? docs/frontend/refactor/reports/03-a2-cases-deepfake-tab.report.md
?? docs/frontend/refactor/reports/03-a3-cases-integrity-metadata.report.md
?? docs/frontend/refactor/reports/03-a4-cases-page-final.report.md
?? docs/frontend/refactor/reports/03-b1-main-upload-preview.report.md
?? lib/mock/
?? tmp-upload-test.mp4
```
