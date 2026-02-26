import { Info } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="flex items-start gap-sm p-md bg-neutral-50 rounded-input border border-neutral-200">
      <Info size={16} className="text-neutral-400 mt-[2px] shrink-0" />
      <p className="text-caption text-neutral-600">
        이 정보는 참고용이며, 의학적 진단을 대체하지 않습니다.
      </p>
    </div>
  );
}
