"use client"

import { UserAuthGuard } from "@/components/user-auth-guard"

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  return <UserAuthGuard>{children}</UserAuthGuard>
}
