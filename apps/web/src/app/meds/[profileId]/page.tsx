'use client';

import { useParams, useRouter } from 'next/navigation';
import { Plus, Pill } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import MedCard from '@/components/medication/MedCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useMedications, useDeactivateMedication } from '@/hooks/useMedications';

export default function MedicationsPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;
  const { data, isLoading } = useMedications(profileId);
  const deactivateMed = useDeactivateMedication();

  return (
    <PageContainer title={data?.profile?.name ? `${data.profile.name}의 약물` : '약물 목록'} showBack>
      <div className="space-y-lg">
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/meds/${profileId}/add`)}
          >
            <Plus size={16} />
            약 추가
          </Button>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : !data?.medications || data.medications.length === 0 ? (
          <EmptyState
            icon={<Pill size={48} />}
            title="등록된 약물이 없습니다"
            description="약물을 등록하면 자동으로 충돌 분석이 실행됩니다."
            actionLabel="약 추가하기"
            onAction={() => router.push(`/meds/${profileId}/add`)}
          />
        ) : (
          <div className="space-y-md">
            {data.medications.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                onDeactivate={(id) => {
                  if (confirm('이 약물의 복용을 중단하시겠습니까?')) {
                    deactivateMed.mutate({ profileId, medId: id });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
