'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface MetadataProps {
  data: any;
  status: string;
}

const VideoMetadata = ({ data, status }: MetadataProps) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
    <div><label className="text-xs text-muted-foreground block">해상도</label><span className="text-sm font-medium">{data.width} x {data.height}</span></div>
    <div><label className="text-xs text-muted-foreground block">프레임레이트</label><span className="text-sm font-medium">{data.fps} FPS</span></div>
    <div><label className="text-xs text-muted-foreground block">코덱</label><span className="text-sm font-medium uppercase">{data.codec}</span></div>
    <div><label className="text-xs text-muted-foreground block">길이</label><span className="text-sm font-medium">{data.durationSec}초</span></div>
    <div><label className="text-xs text-muted-foreground block">추출 상태</label><Badge className="bg-green-100 text-green-800 text-[10px] border-none">{status}</Badge></div>
  </div>
);

const AudioMetadata = ({ data, status }: MetadataProps) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
    <div><label className="text-xs text-muted-foreground block">샘플링 레이트</label><span className="text-sm font-medium">{data.sampleRate || '44.1'} kHz</span></div>
    <div><label className="text-xs text-muted-foreground block">채널</label><span className="text-sm font-medium">{data.channels || '2'} Ch</span></div>
    <div><label className="text-xs text-muted-foreground block">비트레이트</label><span className="text-sm font-medium">{data.bitrate || '128'} kbps</span></div>
    <div><label className="text-xs text-muted-foreground block">길이</label><span className="text-sm font-medium">{data.durationSec}초</span></div>
    <div><label className="text-xs text-muted-foreground block">추출 상태</label><Badge className="bg-blue-100 text-blue-800 text-[10px] border-none">{status}</Badge></div>
  </div>
);

const ImageMetadata = ({ data, status }: MetadataProps) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
    <div><label className="text-xs text-muted-foreground block">해상도</label><span className="text-sm font-medium">{data.width} x {data.height}</span></div>
    <div><label className="text-xs text-muted-foreground block">포맷</label><span className="text-sm font-medium uppercase">{data.format || 'JPEG'}</span></div>
    <div><label className="text-xs text-muted-foreground block">색상 공간</label><span className="text-sm font-medium">sRGB</span></div>
    <div><label className="text-xs text-muted-foreground block">추출 상태</label><Badge className="bg-purple-100 text-purple-800 text-[10px] border-none">{status}</Badge></div>
  </div>
);

export default function MetadataView({ fileType, metadata, status }: { fileType: string, metadata: any, status: string }) {
  if (!metadata) return <div className="text-sm text-muted-foreground">메타데이터 정보가 없습니다.</div>;

  switch (fileType?.toUpperCase()) {
    case 'VIDEO': return <VideoMetadata data={metadata} status={status} />;
    case 'AUDIO': return <AudioMetadata data={metadata} status={status} />;
    case 'IMAGE': return <ImageMetadata data={metadata} status={status} />;
    default: return <div className="text-sm text-muted-foreground">지원하지 않는 미디어 타입입니다. ({fileType})</div>;
  }
}
