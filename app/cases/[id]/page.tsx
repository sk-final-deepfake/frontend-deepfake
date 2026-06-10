"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ShieldCheck,
  ShieldAlert,
  FileVideo,
  Activity,
  Clock,
  Hash,
  Info,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { AnalysisStatusBadge } from "@/components/analysis-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ApiError } from "@/lib/api/client"
import {
  fetchCaseDetail,
  fetchEvidenceDetail,
  type CaseDetailData,
  type EvidenceDetailData,
} from "@/lib/api/evidence-detail"
import { cn } from "@/lib/utils"

function isEvidenceId(value: string) {
  return /^\d+$/.test(value)
}

function hasCompletedAnalysis(analysisInfo: EvidenceDetailData["analysisInfo"]) {
  return (
    analysisInfo.status === "COMPLETED" &&
    analysisInfo.riskScore != null &&
    analysisInfo.confidenceScore != null
  )
}

export default function EvidenceDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<EvidenceDetailData | null>(null)
  const [caseDetail, setCaseDetail] = useState<CaseDetailData | null>(null)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadEvidenceDetail = useCallback(async (evidenceId: number) => {
    const detail = await fetchEvidenceDetail(evidenceId)
    setData(detail)
    setSelectedEvidenceId(evidenceId)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) return

      setLoading(true)
      setErrorMessage(null)
      setCaseDetail(null)

      const rawId = decodeURIComponent(String(id))

      try {
        if (isEvidenceId(rawId)) {
          const evidenceId = Number(rawId)
          if (!cancelled) {
            await loadEvidenceDetail(evidenceId)
          }
          return
        }

        const caseData = await fetchCaseDetail(rawId)
        if (cancelled) return

        setCaseDetail(caseData)
        const firstEvidenceId = caseData.evidences[0]?.evidenceId
        if (!firstEvidenceId) {
          setData(null)
          setErrorMessage("이 사건에 조회할 수 있는 증거가 없습니다.")
          return
        }

        await loadEvidenceDetail(firstEvidenceId)
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError) {
          if (error.status === 401) {
            setErrorMessage("상세 정보를 보려면 로그인이 필요합니다.")
          } else if (error.status === 404) {
            setErrorMessage(error.message || "요청한 증거 또는 사건을 찾을 수 없습니다.")
          } else {
            setErrorMessage(error.message || "분석 상세 정보를 불러오지 못했습니다.")
          }
        } else {
          setErrorMessage("분석 상세 정보를 불러오지 못했습니다.")
        }
        setData(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id, loadEvidenceDetail])

  async function handleSelectEvidence(evidenceId: number) {
    if (selectedEvidenceId === evidenceId) return

    setLoading(true)
    setErrorMessage(null)
    try {
      await loadEvidenceDetail(evidenceId)
    } catch {
      setErrorMessage("선택한 증거 정보를 불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="animate-pulse text-muted-foreground">분석 데이터를 불러오는 중입니다...</p>
      </div>
    )
  }

  if (errorMessage || !data) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">{errorMessage ?? "데이터를 불러올 수 없습니다."}</p>
        <Button variant="outline" render={<Link href="/main" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
          메인으로 돌아가기
        </Button>
      </div>
    )
  }

  const { evidenceInfo, integrityInfo, analysisInfo, cocLogs } = data
  const analysisCompleted = hasCompletedAnalysis(analysisInfo)

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/mypage" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
          내 분석 기록
        </Button>
      </div>

      {caseDetail && caseDetail.evidences.length > 1 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{caseDetail.caseName}</CardTitle>
            <CardDescription>사건에 포함된 증거 {caseDetail.evidences.length}건</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {caseDetail.evidences.map((item) => (
              <Button
                key={item.evidenceId}
                size="sm"
                variant={selectedEvidenceId === item.evidenceId ? "default" : "outline"}
                onClick={() => handleSelectEvidence(item.evidenceId)}
              >
                {item.fileName}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {evidenceInfo.caseName || caseDetail?.caseName || "사건명 없음"}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">분석 상세</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FileVideo className="size-6" />
            {evidenceInfo.fileName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <AnalysisStatusBadge status={analysisInfo.status} />
          {integrityInfo.chainValid ? (
            <Badge
              variant="outline"
              className="flex items-center gap-1.5 border-green-200 bg-green-50 px-3 py-1.5 text-green-700"
            >
              <ShieldCheck className="size-4" />
              무결성 검증 완료
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1.5">
              <ShieldAlert className="size-4" />
              무결성 훼손 주의
            </Badge>
          )}
          <Badge variant="secondary" className="px-3 py-1.5">
            ID: {evidenceInfo.evidenceId}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          className={cn(
            "lg:col-span-2",
            analysisCompleted ? "border-t-4 border-t-red-500" : "border-t-4 border-t-amber-500"
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">
                  {analysisCompleted ? "종합 위험도 판독" : "분석 진행 상태"}
                </CardTitle>
                <CardDescription>
                  {analysisCompleted
                    ? "AI 모델들의 분석 결과를 종합한 최종 수치입니다."
                    : "AI 모델 연동 전까지는 분석 대기·진행 상태만 표시됩니다."}
                </CardDescription>
              </div>
              {analysisCompleted && analysisInfo.riskLevel ? (
                <Badge
                  className={
                    analysisInfo.riskLevel === "HIGH"
                      ? "bg-red-600"
                      : analysisInfo.riskLevel === "MEDIUM"
                        ? "bg-yellow-600"
                        : "bg-green-600"
                  }
                >
                  {analysisInfo.riskLevel} RISK
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisCompleted ? (
              <div className="flex flex-col items-center gap-8 py-4 md:flex-row">
                <div className="relative flex size-40 items-center justify-center">
                  <svg className="size-full -rotate-90 transform">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-muted/20"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * (analysisInfo.riskScore ?? 0)) / 100}
                      className="text-red-500 transition-all duration-1000 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{analysisInfo.riskScore}%</span>
                    <span className="text-xs text-muted-foreground">위험지수</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="rounded-lg border border-muted bg-muted/30 p-4">
                    <p className="text-sm italic leading-relaxed text-foreground">
                      &quot;{analysisInfo.summary}&quot;
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="mb-1 block text-xs text-muted-foreground">신뢰도</span>
                      <div className="flex items-center gap-2">
                        <Progress value={analysisInfo.confidenceScore ?? 0} className="h-2 flex-1" />
                        <span className="text-sm font-medium">{analysisInfo.confidenceScore}%</span>
                      </div>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-muted-foreground">상태</span>
                      <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                        <Activity className="size-4" />
                        {analysisInfo.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6">
                <p className="text-sm leading-relaxed text-foreground">{analysisInfo.summary}</p>
                {analysisInfo.requestedAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    분석 요청: {new Date(analysisInfo.requestedAt).toLocaleString("ko-KR")}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">엔진별 판독 상세</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisInfo.moduleResults.length > 0 ? (
              analysisInfo.moduleResults.map((module, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border bg-card/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase">
                      {module.moduleName.replace(/_/g, " ")}
                    </span>
                    {module.detected ? (
                      <Badge variant="destructive" className="h-5 text-[10px]">
                        DETECTED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="h-5 text-[10px]">
                        CLEAN
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={module.score * 100} className="h-1.5 flex-1" />
                    <span className="font-mono text-xs">{(module.score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                분석이 완료되면 엔진별 판독 결과가 여기에 표시됩니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="metadata" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <Info className="size-4" />
                포렌식 메타데이터
              </TabsTrigger>
              <TabsTrigger value="integrity" className="flex items-center gap-2">
                <Hash className="size-4" />
                무결성 증명
              </TabsTrigger>
            </TabsList>

            <TabsContent value="metadata" className="mt-2 rounded-md border bg-card p-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs text-muted-foreground">해상도</label>
                  <span className="text-sm font-medium">
                    {evidenceInfo.technicalMetadata.width} x {evidenceInfo.technicalMetadata.height}
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">프레임레이트</label>
                  <span className="text-sm font-medium">{evidenceInfo.technicalMetadata.fps} FPS</span>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">코덱</label>
                  <span className="text-sm font-medium uppercase">
                    {evidenceInfo.technicalMetadata.codec}
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">길이</label>
                  <span className="text-sm font-medium">
                    {evidenceInfo.technicalMetadata.durationSec}초
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">파일 크기</label>
                  <span className="text-sm font-medium">
                    {(evidenceInfo.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">추출 상태</label>
                  <Badge variant="secondary" className="border-none text-[10px]">
                    {evidenceInfo.technicalMetadata.extractionStatus}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="integrity" className="mt-2 space-y-4 rounded-md border bg-card p-4">
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="size-3" />
                  원본 증거 해시 ({integrityInfo.hashAlgorithm})
                </label>
                <div className="break-all rounded border bg-muted p-3 font-mono text-xs">
                  {integrityInfo.originalHash}
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <ShieldCheck className="size-8 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-900">CoC 해시 체인 유효함</p>
                  <p className="text-xs text-green-700">
                    업로드 시점부터 현재까지 데이터의 변경이 없음을 보증합니다.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="size-5" />
              사법적 타임라인
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-muted">
              {cocLogs.map((log) => (
                <div key={log.logId} className="relative flex items-start gap-4">
                  <div className="absolute left-0 z-10 mt-1.5 flex size-10 items-center justify-center rounded-full border-2 border-primary bg-background">
                    <div className="size-2 rounded-full bg-primary" />
                  </div>
                  <div className="ml-12">
                    <time className="font-mono text-[10px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("ko-KR")}
                    </time>
                    <p className="text-sm font-semibold">{log.eventType}</p>
                    <p className="text-xs text-muted-foreground">{log.description}</p>
                    <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                      <Hash className="size-2.5" />
                      {log.currentLogHash}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
