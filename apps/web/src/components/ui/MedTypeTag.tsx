import type { MedType } from '@/types';

interface MedTypeTagProps {
  type: MedType;
}

const config = {
  prescription: { bg: 'bg-med-tag-prescription-bg', text: 'text-med-tag-prescription-text', label: '처방약' },
  otc: { bg: 'bg-med-tag-otc-bg', text: 'text-med-tag-otc-text', label: 'OTC' },
  supplement: { bg: 'bg-med-tag-supplement-bg', text: 'text-med-tag-supplement-text', label: '건강기능식품' },
};

export default function MedTypeTag({ type }: MedTypeTagProps) {
  const c = config[type];
  return (
    <span className={`inline-flex items-center px-md py-xs rounded-tag text-caption font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
