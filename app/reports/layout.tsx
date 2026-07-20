"use client"

import { UserAuthGuard } from "@/components/user-auth-guard"

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <UserAuthGuard>{children}</UserAuthGuard>
}
