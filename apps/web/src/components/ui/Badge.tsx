import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { RiskLevel } from '@/types';

interface BadgeProps {
  riskLevel: RiskLevel;
  size?: 'sm' | 'lg';
}

const config = {
  safe: {
    icon: CheckCircle,
    bg: 'bg-safe-bg',
    text: 'text-safe-text',
    border: 'border-safe',
    label: '안전',
  },
  caution: {
    icon: AlertTriangle,
    bg: 'bg-caution-bg',
    text: 'text-caution-text',
    border: 'border-caution',
    label: '주의',
  },
  contraindicated: {
    icon: XCircle,
    bg: 'bg-danger-bg',
    text: 'text-danger-text',
    border: 'border-danger',
    label: '금기',
  },
};

export default function Badge({ riskLevel, size = 'sm' }: BadgeProps) {
  const c = config[riskLevel];
  const Icon = c.icon;

  if (size === 'lg') {
    return (
      <div className={`inline-flex items-center gap-sm px-lg py-md rounded-tag ${c.bg} border ${c.border}`}>
        <Icon size={20} className={c.text} />
        <span className={`text-body-bold ${c.text}`}>{c.label}</span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-xs px-md py-xs rounded-tag ${c.bg}`}>
      <Icon size={14} className={c.text} />
      <span className={`text-caption ${c.text}`}>{c.label}</span>
    </span>
  );
}
