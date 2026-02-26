import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = '로딩 중...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-3xl gap-lg">
      <Loader2 size={32} className="animate-spin text-primary" />
      <p className="text-body text-neutral-600">{message}</p>
    </div>
  );
}
