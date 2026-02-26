import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-3xl gap-lg text-center">
      <div className="text-neutral-400">
        {icon || <Inbox size={48} />}
      </div>
      <div className="space-y-xs">
        <h3 className="text-h3 text-neutral-900">{title}</h3>
        <p className="text-body text-neutral-600">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
