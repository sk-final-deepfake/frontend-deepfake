# 리팩토링 3 — 거대 컴포넌트 분리

> 순서: 01-utils-wiring → 02-mock-isolation → **03-component-split**
>
> 대상 repo: `/Users/kimmini/sk-final-deepfake/frontend-forensic`
>
> 위험도: 고위험
>
> 실행 방식: 전체를 한 번에 실행하지 않고, 03-A1 → 03-A2 → 03-A3 → 03-B → 03-C 순서로 단계별 진행

---

## 0. 목적

500줄을 넘는 거대 파일을 route-local `_components/`, `_hooks/`, `_lib/`로 분리한다.

단, 이번 리팩토링의 목적은 단순히 줄 수를 줄이는 것이 아니다.

핵심 목표는 다음과 같다.

```text
처음 보는 사람이 30초 안에
데이터 흐름, 상태 흐름, 실패 지점을 이해할 수 있게 만든다.
```

따라서 다음을 우선한다.

* page/container 파일에서 데이터 로딩 흐름이 보이게 하기
* 로딩/에러/빈 상태/성공 상태가 한눈에 보이게 하기
* API 호출과 UI 렌더링 책임을 구분하기
* mock/real 경계가 다시 섞이지 않게 하기
* state/effect 이동은 최소화하고, 표현 컴포넌트부터 분리하기

---

## 1. 절대 금지

다음 작업은 하지 않는다.

```text
- git reset
- git checkout
- git restore
- git clean
- git stash
- git switch
- git add
- git commit
- git push
- GitHub push
- 사용자 로컬 변경 되돌리기
- 전체 포맷팅
- 패키지 설치/삭제/업데이트
- lockfile 수정
- 큰 UI 재설계
- 상태관리 라이브러리 교체
- API 정책 변경
- mock 정책 변경
- 한 번에 여러 대형 파일 동시 분해
```

기존 변경물은 되돌리거나 정리하지 않는다.

```text
- next-env.d.ts
- tsconfig.tsbuildinfo
- docs/frontend/local-dev.md
- tmp-upload-test.mp4
- docs/frontend/refactor/reports/*
- lib/mock/*
- lib/formatters.ts
```

---

## 2. 현재 선행 상태

```text
01-utils-wiring: CONDITIONAL PASS
02-mock-isolation: CONDITIONAL PASS
현재 브랜치: local/upload-only-ui
```

02에서 이미 처리한 중요한 정책:

```text
- real 모드에서 riskScore 기반 가짜 분석 근거 생성 제거
- mock 생성기를 lib/mock 아래로 격리
- real API 실패를 mock 결과로 대체하지 않음
- COMPLETED + 근거 없음 상태를 "정상/원본"처럼 표현하지 않음
```

03에서는 위 정책을 절대 되살리지 않는다.

---

## 3. 공통 안전 지시

### 3-1. 02 정책 보존

다음 로직을 다시 만들지 않는다.

```text
- buildFrameRisks
- buildSuspiciousSegments
- buildDetectionFindings
- fallbackModules
- sampleFrameRisks를 화면에서 직접 import
- sampleReasonGroups를 화면에서 직접 import
- buildSampleResultData를 화면에서 직접 import
```

금지되는 방향:

```ts
// 금지
const frameRisks = buildFrameRisks(riskScore);
const suspiciousSegments = buildSuspiciousSegments(riskScore);
const findings = buildDetectionFindings(riskScore);
```

허용되는 방향:

```text
- 백엔드가 제공한 frame_scores가 있으면 표시
- 백엔드가 제공한 suspicious_segments가 있으면 표시
- 백엔드가 제공한 detection_reasons가 있으면 표시
- 없으면 상태 UI 표시
```

---

### 3-2. 줄 수 기준

500줄 이하는 절대 완료 조건이 아니다.

```text
각 파일은 가능한 한 500줄 이하를 목표로 한다.
다만 줄 수를 맞추기 위한 억지 분리는 하지 않는다.
응집도, 역할 명확성, 데이터 흐름 이해 가능성을 우선한다.
```

---

### 3-3. state/effect 이동 원칙

첫 분리에서는 state와 effect의 소유 위치를 가능한 한 유지한다.

우선순위:

```text
1. 타입, 상수, 순수 함수 분리
2. props만 받는 표현 컴포넌트 분리
3. Empty/Error/Skeleton 같은 상태 UI 분리
4. 그 다음 필요한 경우 custom hook 분리
```

처음부터 hook으로 옮기지 않는다.

특히 다음은 신중하게 다룬다.

```text
- useEffect 실행 순서
- cleanup
- polling
- AbortController
- Object URL cleanup
- file preview 상태
- request ref guard
- localStorage session persistence
```

---

### 3-4. `"use client"` 원칙

`"use client"`를 모든 새 파일에 무조건 추가하지 않는다.

```text
기존 client/server 경계를 의도 없이 변경하지 않는다.
hook, browser API, event handler를 직접 사용하는 파일에만 필요한지 판단한다.
```

---

### 3-5. 유지해야 할 속성

분리 전후 다음은 의도 없이 바꾸지 않는다.

```text
- props 이름
- callback 파라미터
- callback 호출 시점
- ref
- key
- id
- name
- role
- aria-*
- data-*
- button type
- form submit
- drag & drop
- 파일 선택
- 업로드 취소
- polling
- toast
- 라우팅
- 다운로드
- 탭 전환
- 증거 선택
- 복사 버튼
- 로딩/에러/빈 상태 문구
```

---

### 3-6. API 호출 보존

다음은 바꾸지 않는다.

```text
- API URL
- method
- request body
- 호출 횟수
- 호출 시점
- 인증 정책
- mock/real 분기 위치
```

특히 다음 함수의 동작은 유지한다.

```text
- fetchCaseDetail
- fetchEvidenceDetail
- uploadEvidence
- startEvidenceAnalysis
- fetchAnalysisStatus
- verifyCompare
- cancelCompareVerification
- downloadCompareReport
```

---

## 4. 작업 전 공통 명령

각 단계 시작 전 다음을 기록한다.

```bash
git status --short
git diff --name-status
git diff --stat
git diff --check
```

큰 파일 줄 수 확인:

```bash
wc -l 'app/cases/[id]/page.tsx' \
  app/main/_components/analysis-request-flow.tsx \
  app/compare/_components/compare-verification-flow.tsx \
  components/upload-panel.tsx \
  lib/api/admin.ts
```

주의:

```text
app/cases/[id]/page.tsx는 zsh에서 []가 glob으로 해석될 수 있으므로 반드시 따옴표로 감싼다.
```

---

## 5. 검증 명령

각 단계 완료 후 다음을 실행한다.

```bash
git diff --check
npm run build
```

가능하면 다음도 실행한다.

```bash
npm run lint
npm run typecheck
npm run test
```

현재 알려진 상태:

```text
- npm run lint는 eslint 바이너리 부재로 실패할 수 있음
- typecheck script는 없을 수 있음
- test script는 없을 수 있음
- npm run build는 통과해도 type validation이 skip될 수 있음
```

실패해도 패키지를 설치하거나 설정을 수정하지 말고, 리포트에 이유만 기록한다.

---

## 6. 대상 파일과 단계

---

# 03-A — `app/cases/[id]/page.tsx` 분리

현재 약 1600줄.

역할이 많이 섞여 있다.

```text
- 사건 상세 로딩
- 증거 선택
- 증거 상세 로딩
- 탭 UI
- 딥페이크 모델 결과 표시
- 무결성 표시
- 메타데이터 표시
- 보고서 표시
- 포맷 helper
- 상태/에러 처리
- copied timeout
```

03-A는 한 번에 끝내지 않고 아래처럼 나눈다.

---

## 03-A0 — 사전 정리

목표:

```text
03 작업 전 검증 상태를 깨끗하게 만든다.
```

작업:

```text
- docs/frontend/refactor/03-component-split.md의 trailing whitespace가 git diff --check를 깨면 해당 공백만 제거
- 전체 포맷팅 금지
- git diff --check 통과 확인
- app/cases/[id]/page.tsx 줄 수 기록
```

검증:

```bash
git diff --check
wc -l 'app/cases/[id]/page.tsx'
```

---

## 03-A1 — Header / Summary / Evidence 선택 영역 분리

목표:

```text
page.tsx 상단의 사건 요약, 증거 요약, 증거 선택 UI를 분리한다.
state/effect/API 호출은 page.tsx에 유지한다.
```

우선 분리 후보:

```text
- SummaryMetaItem
- EvidenceSummaryCard
- CaseHero 또는 header 계열 컴포넌트
- EvidenceSelector
- SummaryTab 일부
```

예상 구조:

```text
app/cases/[id]/_components/
  case-hero.tsx
  evidence-selector.tsx
  evidence-summary-card.tsx
  summary-meta-item.tsx
  summary-tab.tsx
```

주의:

```text
- selectedEvidenceId 상태는 page.tsx에 유지
- evidenceDetail 상태는 page.tsx에 유지
- fetchCaseDetail / fetchEvidenceDetail 호출 방식 변경 금지
- 401/404 에러 메시지 변경 금지
- 탭 전환 동작 변경 금지
```

검증:

```text
- 사건 상세 진입
- 증거 선택
- 증거 상세 로딩
- Summary 탭 표시
- npm run build
```

---

## 03-A2 — Deepfake Model 탭 분리

목표:

```text
딥페이크 분석 탭의 표현 컴포넌트를 분리한다.
02에서 제거한 fake evidence 생성 로직은 절대 되살리지 않는다.
```

분리 후보:

```text
- DeepfakeModelTab
- RingGauge
- FrameRiskChart
- ModelResultCard
- SuspiciousSegmentCard
- DetectionFindingCard
```

예상 구조:

```text
app/cases/[id]/_components/
  deepfake-model-tab.tsx
  ring-gauge.tsx
  frame-risk-chart.tsx
  model-result-card.tsx
  suspicious-segment-card.tsx
  detection-finding-card.tsx
```

주의:

```text
- riskScore만으로 frame/segment/finding 생성 금지
- moduleResults가 있을 때만 모델 결과 표시
- COMPLETED + 근거 없음은 "분석 근거 없음"으로 표시
- 정상/원본/딥페이크 아님처럼 단정하지 않기
```

검증 검색:

```bash
rg -n "buildFrameRisks|buildSuspiciousSegments|buildDetectionFindings|fallbackModules|sampleFrameRisks|sampleReasonGroups|buildSampleResultData" app components lib --glob '*.ts' --glob '*.tsx'
```

기대:

```text
- 화면 컴포넌트에서 sample builder 직접 사용 없음
- riskScore 기반 fake evidence 생성 없음
```

---

## 03-A3 — Integrity / Metadata / Report 탭 분리

목표:

```text
무결성, 메타데이터, 보고서 탭을 표현 컴포넌트로 분리한다.
```

분리 후보:

```text
- IntegrityTab
- MetadataReportTab
- MetaTable
- ManifestRow
- VerificationQr
- InfoBox
```

예상 구조:

```text
app/cases/[id]/_components/
  integrity-tab.tsx
  metadata-report-tab.tsx
  meta-table.tsx
  manifest-row.tsx
  verification-qr.tsx
  info-box.tsx
```

주의:

```text
- 복사 버튼 동작 유지
- copied timeout 유지
- 메타데이터 표시 문구 유지
- 무결성/검증 상태 문구 유지
- aria/data 속성 유지
```

---

## 03-A4 — page.tsx 마무리 정리

목표:

```text
page.tsx에서 데이터 로딩, 상태 분기, 증거 선택, 탭 조립 흐름이 보이게 한다.
```

허용:

```text
- 사용하지 않는 import 제거
- 03-A에서 생긴 중복 타입 정리
- route-local component import 정리
```

금지:

```text
- API 호출 정책 변경
- state/effect 소유 위치 대규모 이동
- mock/real 정책 변경
- 디자인 변경
```

완료 기준:

```text
- page.tsx에서 사건 조회 → 증거 선택 → 증거 상세 조회 → 탭 표시 흐름이 보인다.
- 02의 "분석 근거 없음" 정책이 유지된다.
- riskScore 기반 fake evidence 생성이 부활하지 않는다.
- npm run build 통과
```

---

# 03-B — `app/main/_components/analysis-request-flow.tsx` 분리

현재 약 1300줄.

역할:

```text
- 파일 선택
- 업로드
- 분석 시작
- polling
- preview
- demo result UI
- uploadOnlyMode 라우팅
- 취소 상태
```

우선 분리 후보:

```text
app/main/_components/
  upload-step.tsx
  media-metadata-preview.tsx
  media-preview.tsx
  analyzing-step.tsx
  cancelled-step.tsx
```

주의:

```text
- 처음부터 hook으로 빼지 않는다.
- polling, preview cleanup, uploadOnlyMode 라우팅은 유지한다.
- URL.revokeObjectURL 동작 변경 금지
- startEvidenceAnalysis / uploadEvidence / fetchAnalysisStatus 호출 방식 변경 금지
- demo result/mock hash 프리셋이 fake 결과로 부활하지 않게 한다.
```

hook 후보는 후순위:

```text
app/main/_hooks/use-analysis-upload.ts
```

단, hook 추출은 UI 분리 후 안정성이 확인된 뒤 진행한다.

---

# 03-C — `app/compare/_components/compare-verification-flow.tsx` 분리

역할:

```text
- 사건 선택
- 증거 hydrate
- 비교 파일 업로드
- 비교 요청
- 취소
- 결과 표시
- PDF 다운로드
```

우선 분리 후보:

```text
app/compare/_components/
  source-evidence-selector.tsx
  compare-file-uploader.tsx
  compare-processing-panel.tsx
  compare-result-panel.tsx
```

주의:

```text
- request token/ref cancel guard 변경 금지
- cancelCompareVerification 호출 방식 변경 금지
- report blob cleanup 변경 금지
- 늦은 응답이 결과를 덮지 않도록 기존 방어 로직 유지
```

hook 후보는 후순위:

```text
app/compare/_hooks/use-compare-verification.ts
```

---

# 03-D — `components/upload-panel.tsx` 분리

역할:

```text
- shared 업로드 UI
- localStorage session
- polling
- 분석 시작/중단
- 메타 콜백
```

분리 후보:

```text
components/upload-panel/
  upload-dropzone.tsx
  upload-file-list.tsx
  uploaded-result-card.tsx
  upload-action-bar.tsx
  upload-status-panel.tsx
```

주의:

```text
- localStorage session schema 변경 금지
- dedupe by hash 유지
- polling key 유지
- cancel confirm 유지
- parent callbacks 유지
- flatMap 타입 이슈는 이 파일 분리 중 직접 관련된 최소 범위에서만 수정
- 관련 없는 타입 오류를 함께 고치지 않기
```

---

# 03-E — `lib/api/admin.ts` 분리

주의:

```text
이 단계는 컴포넌트 분리가 아니라 API 모듈 분리다.
가능하면 03-D 이후 별도 단계로 진행한다.
```

현재 문제:

```text
- admin 타입
- mock data
- fallback
- query mapping
- 모든 admin endpoint
```

이 한 파일에 섞여 있다.

분리 후보:

```text
lib/api/admin/
  index.ts
  users.ts
  logs.ts
  invite-codes.ts
  stats.ts
  profile.ts
  evidences.ts
  approvals.ts
  types.ts
  mock.ts
```

주의:

```text
- 기존 import 경로가 깨지지 않게 public export 유지
- 필요한 경우 lib/api/admin.ts에서 re-export
- 호출부 대량 변경 피하기
- real 모드에서 API 실패를 mock으로 대체하지 않기
- 표준 클라이언트 lib/api/client.ts 사용 유지
```

---

## 7. 단계별 리포트 규칙

각 단계는 끝날 때마다 리포트를 작성한다.

리포트 위치:

```text
docs/frontend/refactor/reports/
```

파일명 예시:

```text
03-a0-precheck.report.md
03-a1-cases-summary.report.md
03-a2-cases-deepfake-tab.report.md
03-a3-cases-integrity-metadata.report.md
03-a4-cases-page-final.report.md
03-b-main-analysis-flow.report.md
03-c-compare-flow.report.md
03-d-upload-panel.report.md
03-e-admin-api.report.md
```

각 리포트에 포함할 내용:

```text
# 단계명 리포트

## 판정
PASS / CONDITIONAL PASS / FAIL

## 변경한 파일

## 분리한 컴포넌트 목록

## 새 파일 구조

## 줄 수
- 변경 전:
- 변경 후:
- 새 파일별 줄 수:

## 유지한 동작

## 02 mock/real 정책 유지 여부

## fake evidence 생성 로직 부활 여부

## 검증 명령 결과
| 명령 | exit code | 결과 |
|---|---:|---|

## 실행하지 못한 검증과 이유

## 남은 위험

## 다음 단계로 넘어가도 되는지 여부
```

---

## 8. 최종 완료 기준

03 전체 완료 기준:

```text
- 대상 파일들이 route-local _components/_hooks/_lib로 적절히 분리됨
- page/container 파일에서 데이터 흐름, 상태 흐름, 실패 지점이 보임
- UI/동작 변화 없음
- 02 mock/real 정책 유지
- riskScore 기반 fake evidence 생성 로직 부활 없음
- API 요청 URL/method/body/호출 시점 변경 없음
- polling/cleanup/ref guard/localStorage session 동작 유지
- npm run build 통과
- git diff --check 통과
- lint/typecheck/test 실행 불가 시 이유 기록
```

03 완료 후에도 다음은 별도 후속 작업으로 분리한다.

```text
- lint 의존성 복구
- typecheck script 추가
- 테스트 도입
- next.config.mjs의 ignoreBuildErrors 정책 검토
- strict 타입 전환
- 대규모 디자인 개선
- 성능 측정 기반 최적화
```

---

## 9. 지금 바로 실행할 첫 단계

첫 실행은 03 전체가 아니라 아래만 진행한다.

```text
03-A0 → 03-A1
```

즉:

```text
1. 03 문서 trailing whitespace 제거
2. git diff --check 통과 확인
3. app/cases/[id]/page.tsx에서 Header / Summary / Evidence 선택 영역만 분리
4. npm run build
5. 03-A1 리포트 작성
6. 멈춤
```

03-A2 이후는 03-A1 리포트 검토 후 진행한다.
