"use client"

import { useMemo, useState } from "react"
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
import { Loader2, CheckCircle, XCircle, Trash2, Search, Pencil } from "lucide-react"
import { MOCK_ADMIN_USERS } from "@/app/admin/_data/mock-admin"
import type { AdminUser, UserStatus } from "@/app/admin/_types/admin"
import { DeleteUserDialog } from "@/app/admin/_components/delete-user-dialog"
import {
  EditUserDialog,
  type UserEditPayload,
} from "@/app/admin/_components/edit-user-dialog"

const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_ADMIN_USERS)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | UserStatus>("ALL")
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const { toast } = useAdminToast()

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.displayName.includes(search) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "ALL" || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleAction(userId: string, action: "APPROVE" | "REJECT") {
    setProcessingId(`${userId}-${action}`)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, status: action === "APPROVE" ? "APPROVED" : "REJECTED" }
            : user
        )
      )
      toast({
        title: action === "APPROVE" ? "가입 승인 완료" : "가입 반려 완료",
        description: `사용자 계정이 ${action === "APPROVE" ? "승인" : "반려"}되었습니다.`,
      })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleEdit(payload: UserEditPayload) {
    if (!editTarget) return
    setProcessingId(`${editTarget.id}-EDIT`)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editTarget.id
            ? {
                ...user,
                displayName: payload.displayName,
                email: payload.email,
                department: payload.department,
              }
            : user
        )
      )
      toast({
        title: "계정 정보 수정 완료",
        description: payload.newPassword
          ? `${editTarget.username} 정보 및 비밀번호가 수정되었습니다. (mock)`
          : `${editTarget.username} 계정 정보가 수정되었습니다.`,
      })
      setEditTarget(null)
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setProcessingId(`${deleteTarget.id}-DELETE`)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id))
      toast({
        title: "계정 삭제 완료",
        description: `${deleteTarget.username} 계정이 삭제되었습니다.`,
      })
      setDeleteTarget(null)
    } finally {
      setProcessingId(null)
    }
  }

  function getStatusBadge(status: UserStatus) {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-700">
            대기 중
          </Badge>
        )
      case "APPROVED":
        return (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
            승인됨
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="outline" className="border-rose-200 bg-rose-100 text-rose-700">
            반려됨
          </Badge>
        )
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          전체 계정 관리
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사용자 계정을 검색·필터링하고 정보 수정, 승인, 반려, 삭제할 수 있습니다.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="아이디, 이름, 이메일 검색"
            className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "ALL" | UserStatus)
            setPage(1)
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="ALL">전체 상태</option>
          <option value="PENDING">대기 중</option>
          <option value="APPROVED">승인됨</option>
          <option value="REJECTED">반려됨</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>아이디</TableHead>
              <TableHead>이름 / 이메일</TableHead>
              <TableHead>소속</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  조건에 맞는 계정이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              pagedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono font-medium">{user.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.displayName}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell className="text-muted-foreground">{user.joinedAt}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditTarget(user)}
                        disabled={processingId !== null}
                      >
                        <Pencil className="size-3" />
                        수정
                      </Button>
                      {user.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(user.id, "APPROVE")}
                            disabled={processingId !== null}
                          >
                            {processingId === `${user.id}-APPROVE` ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3" />
                            )}
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(user.id, "REJECT")}
                            disabled={processingId !== null}
                          >
                            {processingId === `${user.id}-REJECT` ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <XCircle className="size-3" />
                            )}
                            반려
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(user)}
                        disabled={processingId !== null}
                      >
                        <Trash2 className="size-3" />
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          총 {filteredUsers.length}명 · {page}/{totalPages} 페이지
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      </div>

      <EditUserDialog
        user={editTarget}
        open={editTarget !== null}
        loading={processingId?.endsWith("-EDIT") ?? false}
        onSave={handleEdit}
        onCancel={() => setEditTarget(null)}
      />

      <DeleteUserDialog
        username={deleteTarget?.username ?? ""}
        open={deleteTarget !== null}
        loading={processingId?.endsWith("-DELETE") ?? false}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  )
}
