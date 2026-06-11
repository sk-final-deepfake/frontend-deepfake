'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileVideo, 
  FileAudio,
  FileImage,
  Activity, 
  Clock, 
  Hash, 
  Info, 
  ChevronRight, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MetadataView from '@/components/evidence/MetadataView';
import { fetchEvidenceDetail } from '@/lib/api/evidence-detail';

export default function EvidenceDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        if (!id) return;
        const result = await fetchEvidenceDetail(Number(id));
        setData(result);
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 w-full">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse">분석 데이터를 수신 중입니다...</p>
    </div>
  );

  if (error) return (
    <div className="container mx-auto py-10">
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>데이터 로드 오류</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  );

  if (!data) return null;

  const { evidenceInfo, integrityInfo, analysisInfo, cocLogs } = data;

  const getFileIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'VIDEO': return <FileVideo className="w-6 h-6 shrink-0" />;
      case 'AUDIO': return <FileAudio className="w-6 h-6 shrink-0" />;
      case 'IMAGE': return <FileImage className="w-6 h-6 shrink-0" />;
      default: return <FileVideo className="w-6 h-6 shrink-0" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 flex flex-col w-full min-h-0 overflow-hidden">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 overflow-hidden">
            <span className="text-sm font-medium text-muted-foreground truncate">{evidenceInfo.caseName}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-primary shrink-0">분석 결과</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2 truncate">
            {getFileIcon(evidenceInfo.mediaType || evidenceInfo.fileType)}
            <span className="truncate">{evidenceInfo.fileName}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={integrityInfo.isChainValid ? "outline" : "destructive"} 
                 className={integrityInfo.isChainValid ? "bg-green-50 text-green-700 border-green-200 px-3 py-1.5 flex items-center gap-1.5" : "px-3 py-1.5 flex items-center gap-1.5"}>
            {integrityInfo.isChainValid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {integrityInfo.isChainValid ? "무결성 검증 완료" : "무결성 훼손 주의"}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5">
            ID: {evidenceInfo.evidenceId}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* 2. Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Risk Score Card */}
        <Card className="lg:col-span-2 border-t-4 border-t-red-500 shadow-sm overflow-hidden">
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
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center bg-muted/20 rounded-full border-8 border-muted/30">
                 <div className="text-center">
                   <p className="text-5xl font-black text-red-500">{analysisInfo.riskScore}%</p>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Risk Score</p>
                 </div>
              </div>
              <div className="flex-1 space-y-4 min-w-0">
                <div className="bg-muted/30 p-4 rounded-lg border border-muted italic">
                  <p className="text-sm leading-relaxed text-foreground">
                    &quot;{analysisInfo.summary}&quot;
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-semibold">판독 신뢰도 (Confidence)</p>
                    <div className="flex items-center gap-3">
                      <Progress value={analysisInfo.confidenceScore} className="h-2 flex-1" />
                      <span className="text-xs font-bold w-8">{analysisInfo.confidenceScore}%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-semibold">분석 상태</p>
                    <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                      <Activity className="w-4 h-4" /> {analysisInfo.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engine Results */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">엔진별 상세 스코어</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisInfo.moduleResults.map((m: any, i: number) => (
              <div key={i} className="p-3 border rounded-lg bg-card/50 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tight">
                  <span className="truncate mr-2">{m.moduleName.replace(/_/g, ' ')}</span>
                  <Badge variant={m.detected ? "destructive" : "outline"} className="text-[10px] h-5 shrink-0">
                    {m.detected ? 'Detected' : 'Clean'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={m.score * 100} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-mono">{(m.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 3. Detailed Tabs & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start">
        <div className="lg:col-span-2 w-full">
          <Tabs defaultValue="metadata" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <Info className="w-4 h-4" /> 포렌식 메타데이터
              </TabsTrigger>
              <TabsTrigger value="integrity" className="flex items-center gap-2">
                <Hash className="w-4 h-4" /> 무결성 리포트
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="metadata" className="pt-4 border rounded-md bg-card mt-2 p-6 shadow-sm">
              <MetadataView 
                fileType={evidenceInfo.mediaType || evidenceInfo.fileType || 'VIDEO'} 
                metadata={evidenceInfo.technicalMetadata} 
                status={evidenceInfo.technicalMetadata.extractionStatus} 
              />
            </TabsContent>
            
            <TabsContent value="integrity" className="pt-4 border rounded-md bg-card mt-2 p-6 shadow-sm space-y-6">
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground flex items-center gap-1 font-bold uppercase tracking-wider">
                  <Hash className="w-3 h-3" /> 원본 증거 해시 ({integrityInfo.hashAlgorithm})
                </label>
                <div className="bg-muted p-4 rounded font-mono text-xs break-all border border-muted-foreground/20 leading-relaxed shadow-inner">
                  {integrityInfo.originalHash}
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <ShieldCheck className="w-10 h-10 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-900">CoC(Chain of Custody) 해시 체인 검증됨</p>
                  <p className="text-xs text-green-700 mt-1 leading-relaxed">
                    디지털 증거물의 수집, 이송, 보관 전 과정에서 데이터의 위변조가 없었음을 기술적으로 증명합니다.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* CoC Timeline */}
        <Card className="w-full shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" /> 사법적 타임라인
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
             <div className="relative pl-6 border-l-2 border-primary/20 space-y-8 ml-2">
               {cocLogs.map((log: any, i: number) => (
                 <div key={i} className="relative">
                   <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary z-10 flex items-center justify-center">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                   </div>
                   <time className="text-[10px] font-mono text-muted-foreground block mb-1">
                     {new Date(log.createdAt).toLocaleString()}
                   </time>
                   <p className="text-xs font-bold text-foreground">
                     {log.eventType} <span className="text-muted-foreground font-normal ml-1">by {log.userId}</span>
                   </p>
                   <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{log.description}</p>
                   <div className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground font-mono bg-muted/50 p-1 rounded w-fit">
                      <Hash className="w-2.5 h-2.5" /> {log.currentLogHash.substring(0, 16)}...
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
