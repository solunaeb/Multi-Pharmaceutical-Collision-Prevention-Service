'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pill } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import ProfileSelector from '@/components/profile/ProfileSelector';
import ProfileCreateModal from '@/components/profile/ProfileCreateModal';
import RiskSummaryCard from '@/components/analysis/RiskSummaryCard';
import MedCard from '@/components/medication/MedCard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useProfile } from '@/context/ProfileContext';
import { useProfiles, useCreateProfile } from '@/hooks/useProfiles';
import { useMedications, useDeactivateMedication } from '@/hooks/useMedications';
import { useAnalysisHistory } from '@/hooks/useAnalysis';
import type { RiskLevel } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { selectedProfileId, setSelectedProfileId } = useProfile();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: profiles, isLoading: profilesLoading } = useProfiles();
  const { data: medsData, isLoading: medsLoading } = useMedications(selectedProfileId);
  const { data: history } = useAnalysisHistory(selectedProfileId);
  const createProfile = useCreateProfile();
  const deactivateMed = useDeactivateMedication();

  // Auto-select first profile if none selected
  useEffect(() => {
    if (!selectedProfileId && profiles && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId, setSelectedProfileId]);

  const latestLog = history?.[0];
  const latestRiskLevel = (medsData?.latestRiskLevel || latestLog?.riskLevel || null) as RiskLevel | null;

  if (profilesLoading) {
    return (
      <PageContainer>
        <LoadingSpinner message="프로필을 불러오는 중..." />
      </PageContainer>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <PageContainer>
        <div className="pt-3xl">
          <EmptyState
            title="프로필을 추가해주세요"
            description="약물 관리를 시작하려면 가족 프로필을 추가하세요."
            actionLabel="프로필 추가"
            onAction={() => setShowCreateModal(true)}
          />
        </div>
        <ProfileCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => {
            createProfile.mutate(data, {
              onSuccess: (profile) => {
                setSelectedProfileId(profile.id);
                setShowCreateModal(false);
              },
            });
          }}
          loading={createProfile.isPending}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Profile Selector */}
      <section className="mb-xl">
        <ProfileSelector
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={setSelectedProfileId}
          onAdd={() => setShowCreateModal(true)}
        />
      </section>

      {selectedProfileId && (
        <>
          {/* Risk Summary */}
          <section className="mb-xl">
            <RiskSummaryCard
              riskLevel={latestRiskLevel}
              summary={latestLog?.summary || undefined}
              logId={latestLog?.id}
            />
          </section>

          {/* Medications */}
          <section>
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-h3 text-neutral-900">
                복용 중인 약 ({medsData?.activeMedsCount || 0})
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/meds/${selectedProfileId}/add`)}
              >
                <Plus size={16} />
                약 추가
              </Button>
            </div>

            {medsLoading ? (
              <LoadingSpinner message="약물 정보를 불러오는 중..." />
            ) : !medsData?.medications || medsData.medications.length === 0 ? (
              <EmptyState
                icon={<Pill size={48} />}
                title="등록된 약물이 없습니다"
                description="사진 업로드 또는 수동 입력으로 약물을 등록해보세요."
                actionLabel="약 추가하기"
                onAction={() => router.push(`/meds/${selectedProfileId}/add`)}
              />
            ) : (
              <div className="space-y-md">
                {medsData.medications.map((med) => (
                  <MedCard
                    key={med.id}
                    med={med}
                    onDeactivate={(id) => {
                      if (confirm('이 약물의 복용을 중단하시겠습니까?')) {
                        deactivateMed.mutate({ profileId: selectedProfileId, medId: id });
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ProfileCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => {
          createProfile.mutate(data, {
            onSuccess: (profile) => {
              setSelectedProfileId(profile.id);
              setShowCreateModal(false);
            },
          });
        }}
        loading={createProfile.isPending}
      />
    </PageContainer>
  );
}
