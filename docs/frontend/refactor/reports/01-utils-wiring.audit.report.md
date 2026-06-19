# 01 Utils Wiring 사후 검증

## 판정
- CONDITIONAL PASS

01 단계 변경분을 현재 코드 기준으로 다시 읽어 검증했다. 명확한 회귀 1건(`formatDateTime(0)`이 빈 값으로 처리되는 문제)을 01 범위 안에서 최소 수정했다. 이후 `npm run build`는 통과했다.

조건부 판정인 이유는 다음과 같다.
- `npm run lint` 스크립트는 존재하지만 로컬에 `eslint` 실행 파일이 없어 실행 실패했다.
- `typecheck` 및 테스트 스크립트가 없어 별도 타입 검사와 테스트는 실행하지 못했다.
- 01 변경이 들어간 체크포인트 커밋(`1f54f8f`)에는 01 유틸 배선 외 문서/화면 변경도 같이 섞여 있어, 단계 단위 diff가 순수하지 않다.

## 검토한 실제 변경 파일

01 유틸 배선과 직접 관련된 파일을 코드 기준으로 확인했다.

- `lib/formatters.ts`: 날짜/파일 크기/시간 포맷 공통 유틸. 숫자 `0` 날짜 입력 회귀를 수정했다.
- `lib/status-labels.ts`: 분석 상태, 위험도 라벨, 위험도 톤 매핑 확인.
- `lib/api/errors.ts`: API 오류 메시지/인증 오류 판별 helper 확인.
- `lib/features.ts`: `NEXT_PUBLIC_*` feature flag 집중화 확인.
- `app/cases/[id]/page.tsx`: 상태/위험도/파일 크기/날짜/error helper 배선 확인. 일부 로컬 포맷터는 화면 출력 보존을 위해 유지됨.
- `app/evidences/[id]/page.tsx`: 401/404 처리 보존 및 API 오류 helper 배선 확인.
- `app/compare/_components/compare-verification-flow.tsx`: 파일 크기 포맷 옵션, 상태 라벨 배선 확인.
- `app/main/_components/analysis-request-flow.tsx`: feature flag, 파일 크기/날짜 포맷 배선 확인.
- `components/upload-panel.tsx`: 파일 크기 포맷 옵션 확인.
- `components/metadata-info.tsx`: 파일 크기 포맷 옵션 확인.
- `app/signup/page.tsx`: `ApiError.details?.[0]?.reason` 사용과 fallback helper 확인.
- `app/mypage/edit/page.tsx`: status/errorCode별 기존 처리 보존 확인.
- `app/admin/**/*.tsx`, `lib/api/admin.ts`: feature flag 및 포맷터 배선 일부 확인.

참고로 01 체크포인트 커밋에는 위 파일 외에도 `docs/frontend/refactor/02-mock-isolation.md`, `docs/frontend/refactor/03-component-split.md`, 여러 admin 화면, API 파일 삭제/정리 등이 포함되어 있었다. 이번 사후 검증은 01 범위의 유틸 배선 회귀만 대상으로 봤다.

## 작업 시작 전 이미 변경되어 있던 파일

감사 시작 시점의 `git status --short` 기준:

```text
 M next-env.d.ts
 M tsconfig.tsbuildinfo
?? docs/frontend/local-dev.md
?? tmp-upload-test.mp4
```

위 파일들은 이번 01 감사가 시작되기 전부터 존재하던 변경/생성물로 보였고, 되돌리거나 정리하지 않았다.

## 발견한 문제

1. `lib/formatters.ts`의 `formatDateTime` / `formatDateTimeWithSeconds`가 `if (!value)`를 사용해 숫자 `0`을 fallback `"-"`로 표시했다.
   - 위험도: 낮음
   - 이유: 현재 주요 호출부는 ISO 문자열이나 `Date.now()`라 즉시 화면 회귀는 확인되지 않았지만, 함수 타입이 `number`를 허용하므로 epoch `0` 같은 유효 입력을 빈 값으로 처리하는 포맷터 회귀 가능성이 있다.

2. `npm run lint`가 실행되지 않는다.
   - 위험도: 중간
   - 이유: 스크립트는 존재하지만 `eslint` 바이너리가 없어 `sh: eslint: command not found`로 실패한다. 패키지 설치/수정은 금지되어 있어 조치하지 않았다.

3. 01 체크포인트 커밋의 범위가 순수하지 않다.
   - 위험도: 중간
   - 이유: 01 유틸 배선 외 문서와 다수 UI/API 변경이 같은 커밋에 섞여 있어, 리뷰어가 단계별 책임 범위를 볼 때 주의가 필요하다.

## 추가로 수정한 내용

`lib/formatters.ts`만 최소 수정했다.

- `formatDateTime`: `!value` 대신 `value === null || value === undefined || value === ""`만 fallback 처리.
- `formatDateTimeWithSeconds`: 동일하게 숫자 `0`을 유효 입력으로 보존.

파일 크기 포맷터는 수정하지 않았다. `formatFileSize(0)`은 옵션 `zeroLabel` 정책을 따르며, 실제 0 표시가 필요한 호출부는 `zeroLabel: "0 B"`를 넘기는 형태로 이미 배선되어 있었다. 기본값을 바꾸면 기존 화면의 `"-"` 표시 정책이 의도치 않게 바뀔 수 있어 유지했다.

## 검증 명령 결과

| 명령 | exit code | 결과 |
| --- | ---: | --- |
| `git status --short` | 0 | 감사 시작 시 `next-env.d.ts`, `tsconfig.tsbuildinfo`, `docs/frontend/local-dev.md`, `tmp-upload-test.mp4` 변경/생성 확인. 추가 수정 후 `lib/formatters.ts`도 변경됨. |
| `git diff --name-status` | 0 | 시작 시 `next-env.d.ts`, `tsconfig.tsbuildinfo`; 추가 수정 후 `lib/formatters.ts` 포함. |
| `git diff --stat` | 0 | 시작 시 2 files, 2 insertions, 2 deletions; 추가 수정 후 3 files, 4 insertions, 4 deletions. |
| `git diff --check` | 0 | 공백 오류 없음. 추가 수정 후 재실행도 통과. |
| `npm run lint` | 127 | `eslint: command not found`. 스크립트는 있으나 로컬 실행 파일 없음. |
| `npm run build` | 0 | Next.js production build 통과. 빌드 로그상 type validation은 skip됨. |

## 회귀 점검 결과

- 포맷터
  - 숫자 `0`: 날짜 포맷터에서 회귀 가능성을 발견해 수정했다.
  - `null`, `undefined`, 빈 문자열: fallback 유지.
  - invalid date: `String(value)` 반환 유지로 런타임 오류 없음.
  - 날짜/시간대: 공통 포맷은 로컬 `Date` 기반 `YYYY.MM.DD HH:mm` 유지. 기존 출력과 다른 화면은 로컬 포맷터를 유지하고 있어 무리하게 통합하지 않았다.
  - 파일 크기/퍼센트/confidence: 파일 크기는 호출부별 `minUnit`, `maxUnit`, `zeroLabel`, `trimTrailingZero` 옵션을 확인했다. 퍼센트/confidence 전용 공통화는 01 범위에서 새로 강제하지 않았다.

- 상태 라벨
  - `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` 매핑 확인.
  - 알 수 없는 status는 성공/정상으로 뭉개지지 않고 원문 status로 fallback된다.
  - 화면별 기존 문구가 달랐던 곳은 wrapper로 `"대기"`, `"처리 중"` 등을 보존했다.
  - 상태 라벨 유틸 자체는 Tailwind 동적 문자열 조합을 생성하지 않는다.

- API 오류 처리
  - `ApiError.details` 객체 전체를 사용자 화면에 그대로 뿌리는 곳은 확인되지 않았다.
  - signup은 `details?.[0]?.reason`만 사용하고 fallback은 `getApiErrorMessage`를 탄다.
  - 401/404 등 화면별 기존 분기(`로그인이 만료되었습니다`, `사건을 찾을 수 없습니다`)는 유지되어 있었다.
  - 네트워크/일반 Error는 `getApiErrorMessage`에서 `Error.message`를 반환한다. 기존에도 유사하게 message를 노출하던 흐름이라 01 회귀로 보지는 않았지만, 보안 리뷰 단계에서는 더 보수적인 사용자 메시지 정책을 검토할 수 있다.
  - `console.log`/`console.error` 기반 토큰, 경로, 내부 서버 메시지 노출은 01 관련 변경에서 발견하지 못했다.

- UI 문구
  - 상태 문구는 화면별 wrapper로 기존 문구를 보존한 부분이 확인됐다.
  - 날짜/파일 크기 포맷은 출력 차이가 큰 화면에서 로컬 formatter가 유지되어 있었다.
  - 01 범위에서 UI 재설계나 문구 대량 변경은 추가로 하지 않았다.

- 타입 및 빌드
  - `npm run build` 통과.
  - 별도 `typecheck` 스크립트가 없고, build는 type validation을 skip하므로 이번 감사에서 새 tsc 에러 유무는 명령으로 확정하지 못했다.
  - 기존에 알려진 toast 계열 및 `components/upload-panel.tsx(99,29)` flatMap 타입 이슈는 이번 감사 범위에서 다루지 않았다.

## 실행하지 못한 검증과 이유

- `npm run typecheck`: `package.json`에 script 없음.
- 관련 테스트: `package.json`에 test script 없음.
- `npm run lint`: script는 있으나 `eslint` 실행 파일이 없어 실패. 패키지 설치/수정 금지로 해결하지 않음.

## 02 단계 시작 가능 여부

02 단계 시작은 가능하다. 다만 아래 조건을 공유한 상태에서 진행하는 것을 권장한다.

- `lib/formatters.ts`의 숫자 `0` 날짜 처리 수정분을 01 사후 패치로 인정한다.
- lint/typecheck 검증 공백은 별도로 해결 전까지 남은 리스크로 둔다.
- 02에서는 01 체크포인트 커밋에 섞인 비-01 변경을 다시 확대하지 말고, mock/sample 격리 범위만 다룬다.

## 02 검증자가 특히 확인할 사항

- `features.mockApi`와 `features.uploadOnlyMode` 외에 mock/sample 데이터가 운영 경로로 새는지 확인.
- 01에서 유지한 화면별 status wrapper가 02 mock 격리 과정에서 삭제되거나 문구가 바뀌지 않는지 확인.
- `getApiErrorMessage`가 백엔드 내부 메시지를 과하게 노출하는 정책은 보안 정리 단계에서 별도 검토.
- `npm run lint` 실행 불가 상태는 02 전후로 계속 같은지 확인.
- `next-env.d.ts`, `tsconfig.tsbuildinfo`, `docs/frontend/local-dev.md`, `tmp-upload-test.mp4`는 감사 전부터 있던 변경물이므로 02 작업자가 섞어 커밋하지 않도록 주의.
