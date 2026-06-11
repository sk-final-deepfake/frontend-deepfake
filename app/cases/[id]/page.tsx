'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  FileSearch,
  FileStack,
  Loader2,
  Plus,
} from 'lucide-react';

import { AnalysisStatusBadge } from '@/components/analysis-status-badge';
import { CaseStatusBadge } from '@/app/mypage/_components/case-status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { fetchCaseDetail, type CaseDetailData } from '@/lib/api/evidence-detail';
import type { AnalysisStatus } from '@/lib/analysis-status';
import type { CaseStatus } from '@/app/mypage/_types/case';

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeStatus(status: string): AnalysisStatus {
  if (status === 'PROCESSING' || status === 'COMPLETED' || status === 'FAILED') {
    return status;
  }

  return 'PENDING';
}

function normalizeCaseStatus(status: string): CaseStatus {
  if (status === 'PROCESSING' || status === 'COMPLETED' || status === 'FAILED') {
    return status;
  }

  return 'PENDING';
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const caseId = Array.isArray(id) ? id[0] : id;
  const [data, setData] = useState<CaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        if (!caseId) return;
        const result = await fetchCaseDetail(caseId);
        setData(result);
      } catch (err: any) {
        setError(err.message || '사건 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">사건 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive" className="mx-auto max-w-2xl">
          <AlertCircle className="size-4" />
          <AlertTitle>데이터 로드 오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const evidences = data.evidences ?? [];
  const addEvidenceHref = `/main?caseId=${encodeURIComponent(data.caseId)}&caseName=${encodeURIComponent(data.caseName)}`;

  return (
    <div className="container mx-auto flex w-full min-h-0 flex-col gap-6 overflow-hidden py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <FileStack className="size-4 shrink-0" />
            <span>사건 상세</span>
          </div>
          <h1 className="truncate text-2xl font-bold text-foreground">{data.caseName}</h1>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {data.caseId}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <CaseStatusBadge status={normalizeCaseStatus(data.status)} />
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <CalendarDays className="size-3.5" />
            {formatDate(data.createdAt)}
          </Badge>
          <Button
            size="sm"
            className="gap-1.5"
            render={<Link href={addEvidenceHref} />}
            nativeButton={false}
          >
            <Plus className="size-3.5" />
            증거 추가
          </Button>
        </div>
      </div>

      <Separator />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSearch className="size-5" />
            증거 목록
          </CardTitle>
          <Badge variant="secondary">총 {evidences.length}건</Badge>
        </CardHeader>
        <CardContent>
          {evidences.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
              이 사건에 연결된 증거가 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {evidences.map((evidence) => (
                <li
                  key={evidence.evidenceId}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-accent/40 md:flex-row md:items-center"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <FileSearch className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {evidence.fileName}
                      </p>
                      <AnalysisStatusBadge status={normalizeStatus(evidence.analysisStatus)} />
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      EV-{evidence.evidenceId}
                      {evidence.mediaType ? ` · ${evidence.mediaType}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 md:w-auto"
                    render={<Link href={`/evidences/${evidence.evidenceId}`} />}
                    nativeButton={false}
                  >
                    상세 보기
                    <ChevronRight className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
