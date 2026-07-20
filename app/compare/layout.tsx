"use client"

import { UserAuthGuard } from "@/components/user-auth-guard"

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <UserAuthGuard>{children}</UserAuthGuard>
}
