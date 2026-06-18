import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { CompareVerificationFlow } from "@/app/compare/_components/compare-verification-flow"

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 dark:bg-background dark:text-foreground">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <CompareVerificationFlow />
      </main>
      <SiteFooter />
    </div>
  )
}
