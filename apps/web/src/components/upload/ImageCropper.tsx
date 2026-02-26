'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Button from '@/components/ui/Button';
import { getCroppedBlob } from '@/lib/cropImage';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
}

/** 이미지 로드 시 80% 중앙 크롭을 기본 선택 */
function getDefaultCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 80 },
      width / height,
      width,
      height,
    ),
    width,
    height,
  );
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(getDefaultCrop(width, height));
  }, []);

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;
    const blob = await getCroppedBlob(imgRef.current, completedCrop);
    onCropComplete(blob);
  };

  return (
    <div className="space-y-lg">
      <p className="text-body text-neutral-600 text-center">
        분석할 영역을 드래그하여 선택하세요
      </p>

      <div className="flex justify-center">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          minWidth={30}
          minHeight={30}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="크롭할 이미지"
            onLoad={onImageLoad}
            className="max-h-[400px] object-contain"
          />
        </ReactCrop>
      </div>

      <div className="flex gap-md">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          전체 이미지 사용
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!completedCrop}
          className="flex-1"
        >
          영역 선택 완료
        </Button>
      </div>
    </div>
  );
}
