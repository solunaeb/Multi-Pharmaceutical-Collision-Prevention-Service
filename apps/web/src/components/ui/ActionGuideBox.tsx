import { Lightbulb } from 'lucide-react';

interface ActionGuideBoxProps {
  guide: string;
}

export default function ActionGuideBox({ guide }: ActionGuideBoxProps) {
  return (
    <div className="bg-accent-warm-beige rounded-card p-lg flex items-start gap-md">
      <Lightbulb size={20} className="text-caution shrink-0 mt-[2px]" />
      <div className="space-y-xs">
        <h4 className="text-body-bold text-neutral-900">이렇게 하세요</h4>
        <p className="text-body text-neutral-900">{guide}</p>
      </div>
    </div>
  );
}
