"use client"

import { useEffect, useState } from "react"
import { Copy, Plus, Ticket } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAdminToast } from "@/app/admin/_components/admin-toast-provider"
import type { InviteCode } from "@/app/admin/_types/admin"
import {
  generateInviteCode,
  getInviteCodes,
  saveInviteCodes,
} from "@/app/admin/_lib/invite-codes-storage"

function getStatusBadge(status: InviteCode["status"]) {
  switch (status) {
    case "UNUSED":
      return (
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
          미사용
        </Badge>
      )
    case "USED":
      return (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
          사용됨
        </Badge>
      )
    case "EXPIRED":
      return (
        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
          만료
        </Badge>
      )
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

export default function AdminInviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const { toast } = useAdminToast()

  useEffect(() => {
    setCodes(getInviteCodes())
  }, [])

  function persist(next: InviteCode[]) {
    setCodes(next)
    saveInviteCodes(next)
  }

  function handleGenerate() {
    const today = new Date()
    const newCode: InviteCode = {
      id: crypto.randomUUID(),
      code: generateInviteCode(),
      createdAt: today.toISOString().slice(0, 10),
      expiresAt: addDays(today, 30),
      status: "UNUSED",
    }
    persist([newCode, ...codes])
    toast({
      title: "생성코드 발급 완료",
      description: `${newCode.code} 코드가 저장되었습니다.`,
    })
  }

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(code)
    toast({
      title: "복사 완료",
      description: "생성코드가 클립보드에 복사되었습니다.",
    })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            유효 생성코드 관리
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            회원가입용 코드를 생성하고 localStorage에 저장합니다. (API 연동 전 mock)
          </p>
        </div>
        <Button onClick={handleGenerate}>
          <Plus data-icon="inline-start" />
          코드 생성
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <Ticket className="size-4 text-primary" />
        <span className="text-muted-foreground">미사용 코드</span>
        <span className="font-semibold text-foreground">
          {codes.filter((c) => c.status === "UNUSED").length}개
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead>만료일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-medium">{item.code}</TableCell>
                <TableCell className="text-muted-foreground">{item.createdAt}</TableCell>
                <TableCell className="text-muted-foreground">{item.expiresAt}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-muted-foreground">{item.usedBy ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(item.code)}>
                    <Copy className="size-3" />
                    복사
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}
