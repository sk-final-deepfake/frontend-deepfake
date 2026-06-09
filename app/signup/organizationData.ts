// 담당: 김민희
// 역할: 회원가입 - 기관 유형 / 소속 기관·부서 mock 데이터
//
// ⚠️ 현재는 위치기반 추천을 사용하지 않으며(geolocation 미사용),
//    아래 목록은 딥페이크·디지털포렌식·사이버수사 관련 mock 데이터입니다.
//    실제 운영에서는 기관 조직도 DB / API 로 교체할 수 있도록 구조만 열어둡니다.
//    예) export async function fetchDepartments(orgType): Promise<string[]> { ... }

// 기관 유형 (value 는 백엔드 enum 과 매핑)
export const ORG_TYPES = [
  { value: "POLICE", label: "경찰기관" },
  { value: "PROSECUTION", label: "검찰기관" },
  { value: "NFS", label: "국과수/감정기관" },
  { value: "PUBLIC_SECURITY", label: "공공기관 감사/보안" },
  { value: "ETC", label: "기타" },
] as const

export type OrgType = (typeof ORG_TYPES)[number]["value"]

// 기관 유형별 소속 기관/부서 mock 목록 (종속 드롭다운: 유형 선택 → 해당 부서만 노출)
export const DEPARTMENTS_BY_TYPE: Record<OrgType, string[]> = {
  POLICE: [
    "경찰청 사이버수사국",
    "경찰청 국가수사본부 사이버수사국",
    "서울경찰청 사이버수사과",
    "서울경찰청 디지털포렌식계",
    "서울경찰청 여성청소년범죄수사대",
    "경기남부경찰청 사이버수사과",
    "경기남부경찰청 디지털포렌식계",
    "인천경찰청 사이버수사과",
    "부산경찰청 사이버수사과",
    "대구경찰청 사이버수사과",
    "강남경찰서 사이버수사팀",
    "서초경찰서 사이버수사팀",
    "마포경찰서 사이버수사팀",
    "수원남부경찰서 사이버수사팀",
  ],
  PROSECUTION: ["대검찰청 디지털수사과", "서울중앙지검 디지털포렌식팀"],
  NFS: ["국립과학수사연구원 디지털과"],
  PUBLIC_SECURITY: ["기관 내부 감사팀", "기관 정보보안팀"],
  ETC: [],
}

// 선택한 기관 유형의 부서 목록 (+ 직접 입력용 '기타' 항상 포함)
export function getDepartments(orgType: OrgType): string[] {
  return [...DEPARTMENTS_BY_TYPE[orgType], "기타"]
}

// 유형 범위 안에서 포함 검색 (대소문자/공백 무시)
export function filterDepartments(orgType: OrgType, query: string): string[] {
  const list = getDepartments(orgType)
  const q = query.trim().replace(/\s+/g, "").toLowerCase()
  if (!q) return list
  return list.filter((d) => d.replace(/\s+/g, "").toLowerCase().includes(q))
}

// 기관에서 발급하는 초대(승인) 코드 mock 목록
// 실제 운영에서는 발급 코드 검증 API로 교체. (예: POST /invite/validate)
export const VALID_INVITE_CODES = [
  "FSAI-POLICE-2026",
  "FSAI-PROSECUTION-2026",
  "FSAI-NFS-2026",
  "FSAI-SECURITY-2026",
]

export function isValidInviteCode(code: string): boolean {
  return VALID_INVITE_CODES.includes(code.trim().toUpperCase())
}
