'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileVideo, 
  Activity, 
  Clock, 
  Hash, 
  Info,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// --- Types (Based on Backend Schema) ---

interface TechnicalMetadata {
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  codec: string;
  extractionStatus: string;
}

interface EvidenceInfo {
  evidenceId: number;
  fileName: string;
  caseName: string;
  fileSize: number;
  uploadedAt: string;
  technicalMetadata: TechnicalMetadata;
}

interface IntegrityInfo {
  hashAlgorithm: string;
  originalHash: string;
  isChainValid: boolean;
  verificationStatus: string;
}

interface ModuleResult {
  moduleName: string;
  detected: boolean;
  score: number;
  details: string;
}

interface AnalysisInfo {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requestedAt: string;
  completedAt: string;
  riskScore: number;
  confidenceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  moduleResults: ModuleResult[];
}

interface CocLog {
  logId: number;
  eventType: string;
  userId: string;
  description: string;
  createdAt: string;
  currentLogHash: string;
}

interface EvidenceDetailData {
  evidenceInfo: EvidenceInfo;
  integrityInfo: IntegrityInfo;
  analysisInfo: AnalysisInfo;
  cocLogs: CocLog[];
}

// --- Component Start ---

export default function EvidenceDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<EvidenceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 백엔드 연동 전까지 Mock 데이터 사용 (제공해주신 JSON 기반)
    const mockData: EvidenceDetailData = {
      evidenceInfo: {
        evidenceId: Number(id),
        fileName: "deepfake_video_sample.mp4",
        caseName: "2026-서울-001 사건",
        fileSize: 45210880,
        uploadedAt: "2026-06-10T10:00:00",
        technicalMetadata: {
          width: 1920,
          height: 1080,
          durationSec: 15.5,
          fps: 30.0,
          codec: "h264",
          extractionStatus: "SUCCESS"
        }
      },
      integrityInfo: {
        hashAlgorithm: "SHA-256",
        originalHash: "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d",
        isChainValid: true,
        verificationStatus: "VERIFIED"
      },
      analysisInfo: {
        status: "COMPLETED",
        requestedAt: "2026-06-10T10:05:00",
        completedAt: "2026-06-10T10:12:00",
        riskScore: 88.5,
        confidenceScore: 96.2,
        riskLevel: "HIGH",
        summary: "영상 내 안면 변조(Face Swap) 흔적이 다수 발견되었으며, 음성 또한 합성된 것으로 의심됨.",
        moduleResults: [
          {
            moduleName: "face_swap_detection",
            detected: true,
            score: 0.92,
            details: "{\"frames_analyzed\": 450, \"fake_frames\": 380}"
          },
          {
            moduleName: "synthetic_voice_analysis",
            detected: true,
            score: 0.85,
            details: "{\"pitch_consistency\": \"low\", \"artifact_score\": 0.78}"
          }
        ]
      },
      cocLogs: [
        {
          logId: 1,
          eventType: "FILE_UPLOADED",
          userId: "SYSTEM_USER",
          description: "파일 업로드 완료: deepfake_video_sample.mp4",
          createdAt: "2026-06-10T10:00:00",
          currentLogHash: "a1b2c3d4..."
        },
        {
          logId: 2,
          eventType: "HASH_CREATED",
          userId: "SYSTEM_USER",
          description: "SHA-256 해시 생성 완료",
          createdAt: "2026-06-10T10:00:05",
          currentLogHash: "e5f6g7h8..."
        }
      ]
    };

    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 800);
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">분석 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!data) return <div>데이터를 불러올 수 없습니다.</div>;

  const { evidenceInfo, integrityInfo, analysisInfo, cocLogs } = data;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 1. Header & Integrity Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-muted-foreground">{evidenceInfo.caseName}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-primary">분석 결과</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileVideo className="w-6 h-6" />
            {evidenceInfo.fileName}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {integrityInfo.isChainValid ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              무결성 검증 완료 (Verified)
            </Badge>
          ) : (
            <Badge variant="destructive" className="px-3 py-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              무결성 훼손 주의 (Corrupted)
            </Badge>
          )}
          <Badge variant="secondary" className="px-3 py-1.5">
            ID: {evidenceInfo.evidenceId}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* 2. Main Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Risk Score Card */}
        <Card className="lg:col-span-2 border-t-4 border-t-red-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">종합 위험도 판독</CardTitle>
                <CardDescription>AI 모델들의 분석 결과를 종합한 최종 수치입니다.</CardDescription>
              </div>
              <Badge 
                className={
                  analysisInfo.riskLevel === 'HIGH' ? 'bg-red-600' : 
                  analysisInfo.riskLevel === 'MEDIUM' ? 'bg-yellow-600' : 'bg-green-600'
                }
              >
                {analysisInfo.riskLevel} RISK
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-8 py-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
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
                    strokeDashoffset={440 - (440 * analysisInfo.riskScore) / 100}
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
                <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                  <p className="text-sm leading-relaxed italic text-foreground">
                    &quot;{analysisInfo.summary}&quot;
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">신뢰도(Confidence)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={analysisInfo.confidenceScore} className="h-2 flex-1" />
                      <span className="text-sm font-medium">{analysisInfo.confidenceScore}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">상태</span>
                    <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                      <Activity className="w-4 h-4" /> {analysisInfo.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Engine Specific Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">엔진별 판독 상세</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisInfo.moduleResults.map((module, idx) => (
              <div key={idx} className="p-3 border rounded-lg bg-card/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold uppercase">{module.moduleName.replace(/_/g, ' ')}</span>
                  {module.detected ? (
                    <Badge variant="destructive" className="text-[10px] h-5">DETECTED</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5">CLEAN</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={module.score * 100} className="h-1.5 flex-1" />
                  <span className="text-xs font-mono">{(module.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
            <div className="pt-2 text-[11px] text-muted-foreground flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              각 엔진은 독립적인 딥러닝 모델로 구성되어 있으며, 종합 위험도는 가중치 알고리즘을 통해 계산됩니다.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Bottom Tabs: Meta & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="metadata" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <Info className="w-4 h-4" /> 포렌식 메타데이터
              </TabsTrigger>
              <TabsTrigger value="integrity" className="flex items-center gap-2">
                <Hash className="w-4 h-4" /> 무결성 증명
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="metadata" className="p-4 border rounded-md bg-card mt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                <div>
                  <label className="text-xs text-muted-foreground block">해상도</label>
                  <span className="text-sm font-medium">{evidenceInfo.technicalMetadata.width} x {evidenceInfo.technicalMetadata.height}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">프레임레이트</label>
                  <span className="text-sm font-medium">{evidenceInfo.technicalMetadata.fps} FPS</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">코덱</label>
                  <span className="text-sm font-medium uppercase">{evidenceInfo.technicalMetadata.codec}</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">길이</label>
                  <span className="text-sm font-medium">{evidenceInfo.technicalMetadata.durationSec}초</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">파일 크기</label>
                  <span className="text-sm font-medium">{(evidenceInfo.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block">추출 상태</label>
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 border-none">
                    {evidenceInfo.technicalMetadata.extractionStatus}
                  </Badge>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="integrity" className="p-4 border rounded-md bg-card mt-2 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3 h-3" /> 원본 증거 해시 ({integrityInfo.hashAlgorithm})
                </label>
                <div className="bg-muted p-3 rounded font-mono text-xs break-all border">
                  {integrityInfo.originalHash}
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <ShieldCheck className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-900">CoC 해시 체인 유효함</p>
                  <p className="text-xs text-green-700">업로드 시점부터 현재까지 데이터의 변경이 없음을 보증합니다.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* CoC Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" /> 사법적 타임라인
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-muted">
              {cocLogs.map((log, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className="absolute left-0 mt-1.5 h-10 w-10 flex items-center justify-center rounded-full bg-background border-2 border-primary z-10">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="ml-12">
                    <time className="text-[10px] font-mono text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </time>
                    <p className="text-sm font-semibold">{log.eventType}</p>
                    <p className="text-xs text-muted-foreground">{log.description}</p>
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground font-mono">
                      <Hash className="w-2.5 h-2.5" /> {log.currentLogHash.substring(0, 12)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
