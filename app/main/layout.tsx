"use client"

import { UserAuthGuard } from "@/components/user-auth-guard"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <UserAuthGuard>{children}</UserAuthGuard>
}
