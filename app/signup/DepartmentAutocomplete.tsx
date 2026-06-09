// 담당: 김민희
// 역할: 소속 기관/부서 자동완성 입력 (기관 유형 종속 → 해당 유형 부서만 검색)
// 주의: 위치기반(geolocation) 미사용. mock 데이터 기반.
"use client"

import { useState } from "react"
import { Building2, Search } from "lucide-react"
import { filterDepartments, type OrgType } from "./organizationData"

export default function DepartmentAutocomplete({
  orgType,
  value,
  onChange,
}: {
  orgType: OrgType | ""
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  // 기관 유형이 선택돼야 부서 입력 가능
  const disabled = !orgType
  const results = orgType ? filterDepartments(orgType, value) : []

  const select = (dept: string) => {
    onChange(dept)
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className={`rounded-xl border border-border bg-card ${disabled ? "opacity-60" : ""}`}>
        <div className="flex h-12 items-center gap-3 px-4">
          <Building2 className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)} // 항목 클릭 여유
            placeholder={disabled ? "기관 유형을 먼저 선택하세요" : "소속 기관 / 부서 검색"}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
          />
          {!disabled && <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        </div>
      </div>

      {/* 자동완성 드롭다운 (선택한 기관 유형의 부서만) */}
      {open && !disabled && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
          {results.map((dept) => (
            <li key={dept}>
              <button
                type="button"
                // onMouseDown: input의 blur 보다 먼저 실행되어 선택이 유지됨
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(dept)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                {dept}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
