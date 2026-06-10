"use client"

import { useState } from "react"
import { UploadPanel } from "@/components/upload-panel"
import { CapabilitiesSection } from "@/components/capabilities-section"
import { RecentAnalyses } from "@/components/recent-analyses"
import { MetadataInfo } from "@/components/metadata-info"
import type { UploadResult } from "@/lib/evidence-api"

export function MainDashboard() {
  const [uploads, setUploads] = useState<UploadResult[]>([])
  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null)
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)

  function handleUploadComplete(results: UploadResult[]) {
    if (results.length === 0) return
    setUploads((prev) => [...results, ...prev])
    setLastUpload(results[results.length - 1])
    setStatsRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <UploadPanel onUploadComplete={handleUploadComplete} />
        <CapabilitiesSection refreshKey={statsRefreshKey} />
      </div>

      <div className="space-y-6 lg:col-span-1">
        <MetadataInfo upload={lastUpload} />
        <RecentAnalyses uploads={uploads} />
      </div>
    </div>
  )
}
