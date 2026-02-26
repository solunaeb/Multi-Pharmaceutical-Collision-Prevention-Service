'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/ui/Button';
import { useProfile } from '@/context/ProfileContext';
import { useProfiles } from '@/hooks/useProfiles';
import { parseOcrImage } from '@/lib/apiClient';

export default function UploadPage() {
  const router = useRouter();
  const { selectedProfileId } = useProfile();
  const { data: profiles } = useProfiles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selected: File) => {
    if (!selected.type.match(/^image\/(jpeg|png|jpg)$/)) {
      setError('JPEG 또는 PNG 이미지만 업로드할 수 있습니다.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하만 가능합니다.');
      return;
    }
    setFile(selected);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleSubmit = async () => {
    if (!file || !selectedProfileId) return;
    setLoading(true);
    setError(null);

    try {
      const result = await parseOcrImage(selectedProfileId, file);
      // Store result in sessionStorage for the confirm page
      sessionStorage.setItem('ocrResult', JSON.stringify(result));
      sessionStorage.setItem('ocrPreview', preview || '');
      router.push('/upload/confirm');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'AI 서비스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="사진 업로드">
      <div className="space-y-xl">
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-card p-3xl flex flex-col items-center justify-center gap-lg cursor-pointer
            transition-colors min-h-[200px]
            ${file ? 'border-primary bg-primary-light/20' : 'border-neutral-200 hover:border-primary hover:bg-neutral-50'}
          `}
        >
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="업로드된 이미지 미리보기"
                className="max-h-[300px] rounded-input object-contain"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute -top-2 -right-2 bg-white rounded-full shadow-card min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label="이미지 제거"
              >
                <X size={16} className="text-neutral-600" />
              </button>
            </div>
          ) : (
            <>
              <Upload size={32} className="text-neutral-400" />
              <div className="text-center">
                <p className="text-body text-neutral-900">
                  사진을 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-caption text-neutral-400 mt-xs">
                  JPEG, PNG (최대 10MB)
                </p>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFileSelect(selected);
          }}
        />

        {/* Profile Info */}
        {selectedProfileId && profiles && (
          <div className="bg-white rounded-card shadow-card p-lg">
            <p className="text-caption text-neutral-600 mb-xs">분석 대상 프로필</p>
            <p className="text-body-bold text-neutral-900">
              {profiles.find((p) => p.id === selectedProfileId)?.name || '선택된 프로필'}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-danger-bg rounded-input p-lg">
            <p className="text-body text-danger-text">{error}</p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!file || !selectedProfileId}
          loading={loading}
          className="w-full"
        >
          {loading ? 'AI가 분석 중입니다...' : '분석하기'}
        </Button>
      </div>
    </PageContainer>
  );
}
