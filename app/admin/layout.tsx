import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AdminToastProvider } from "@/app/admin/_components/admin-toast-provider"
import { AdminAuthGuard } from "@/app/admin/_components/admin-auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAuthGuard>
      <AdminToastProvider>
        <div className="flex min-h-screen flex-col bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
          <SiteHeader variant="admin" />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </AdminToastProvider>
    </AdminAuthGuard>
  )
}
