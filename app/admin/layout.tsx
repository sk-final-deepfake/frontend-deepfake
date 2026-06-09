import { SiteHeader } from "@/components/site-header"
import { AdminNav } from "@/app/admin/_components/admin-nav"
import { AdminToastProvider } from "@/app/admin/_components/admin-toast-provider"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-background">
        <SiteHeader variant="admin" />
        <AdminNav />
        {children}
      </div>
    </AdminToastProvider>
  )
}
