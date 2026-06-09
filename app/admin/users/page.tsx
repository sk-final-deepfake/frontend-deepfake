"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { SiteHeader } from "@/components/site-header"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react"

type UserStatus = "PENDING" | "APPROVED" | "REJECTED"

interface User {
  id: string
  username: string
  email: string
  department: string
  joinedAt: string
  status: UserStatus
}

const MOCK_USERS: User[] = [
  {
    id: "1",
    username: "admin_kim",
    email: "kim@police.go.kr",
    department: "사이버수사과",
    joinedAt: "2026-06-01",
    status: "PENDING",
  },
  {
    id: "2",
    username: "lee_forensic",
    email: "lee@nfs.go.kr",
    department: "디지털분석팀",
    joinedAt: "2026-06-03",
    status: "PENDING",
  },
  {
    id: "3",
    username: "park_invest",
    email: "park@prosecution.go.kr",
    department: "과학수사부",
    joinedAt: "2026-05-28",
    status: "APPROVED",
  },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAction = async (userId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(`${userId}-${action}`)
    
    try {
      // API 호출 시뮬레이션 (1.5초)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, status: action === "APPROVE" ? "APPROVED" : "REJECTED" }
            : user
        )
      )

      toast({
        title: action === "APPROVE" ? "가입 승인 완료" : "가입 반려 완료",
        description: `${userId} 사용자의 가입 요청이 ${action === "APPROVE" ? "승인" : "반려"}되었습니다.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "처리 실패",
        description: "요청을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">대기 중</Badge>
      case "APPROVED":
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">승인됨</Badge>
      case "REJECTED":
        return <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">반려됨</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <SiteHeader variant="admin" />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
              관리자 가입 승인 관리
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-muted-foreground">
              신규 관리자 계정의 가입 요청을 검토하고 승인 또는 반려할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm dark:bg-card border border-border">
             <UserPlus className="size-5 text-primary" />
             <span className="text-sm font-medium">대기 중: {users.filter(u => u.status === 'PENDING').length}명</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white dark:bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-muted/50">
              <TableRow>
                <TableHead className="w-[150px]">아이디</TableHead>
                <TableHead>이름/이메일</TableHead>
                <TableHead>소속 부서</TableHead>
                <TableHead>가입 요청일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono font-medium">{user.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">사용자 {user.id}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell className="text-muted-foreground">{user.joinedAt}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    {user.status === "PENDING" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                          onClick={() => handleAction(user.id, "APPROVE")}
                          disabled={processingId !== null}
                        >
                          {processingId === `${user.id}-APPROVE` ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 size-3" />
                          )}
                          승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                          onClick={() => handleAction(user.id, "REJECT")}
                          disabled={processingId !== null}
                        >
                          {processingId === `${user.id}-REJECT` ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <XCircle className="mr-1 size-3" />
                          )}
                          반려
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">처리 완료</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}
