'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, PenLine, Pill, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import ProfileSelector from '@/components/profile/ProfileSelector';
import ProfileCreateModal from '@/components/profile/ProfileCreateModal';
import RiskSummaryCard from '@/components/analysis/RiskSummaryCard';
import MedCard from '@/components/medication/MedCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { useProfile } from '@/context/ProfileContext';
import { useProfiles, useCreateProfile } from '@/hooks/useProfiles';
import { useMedications, useDeactivateMedication } from '@/hooks/useMedications';
import { useAnalysisHistory } from '@/hooks/useAnalysis';
import type { RiskLevel } from '@/types';

function riskLabel(level: RiskLevel | null) {
  if (level === 'safe') return { text: '안전', icon: ShieldCheck, color: 'text-safe' };
  if (level === 'caution') return { text: '주의 필요', icon: ShieldAlert, color: 'text-caution' };
  if (level === 'contraindicated') return { text: '위험', icon: ShieldX, color: 'text-danger' };
  return null;
}

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
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const activeMedsCount = medsData?.activeMedsCount || 0;
  const risk = riskLabel(latestRiskLevel);

  if (profilesLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-gradient-to-br from-primary to-primary-dark px-5 pt-[60px] pb-xl">
          <div className="max-w-2xl mx-auto">
            <p className="text-white/70 text-caption mb-xs">약궁합</p>
            <h1 className="text-h1 text-white">불러오는 중...</h1>
          </div>
        </div>
        <main className="max-w-2xl mx-auto px-5 pt-xl">
          <LoadingSpinner message="프로필을 불러오는 중..." />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-gradient-to-br from-primary to-primary-dark px-5 pt-[60px] pb-xl">
          <div className="max-w-2xl mx-auto">
            <p className="text-white/70 text-caption mb-xs">약궁합</p>
            <h1 className="text-h1 text-white">시작하기</h1>
          </div>
        </div>
        <main className="max-w-2xl mx-auto px-5 pt-xl pb-[80px]">
          <EmptyState
            title="프로필을 추가해주세요"
            description="약물 관리를 시작하려면 가족 프로필을 추가하세요."
            actionLabel="프로필 추가"
            onAction={() => setShowCreateModal(true)}
          />
        </main>
        <BottomNav />
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary-dark px-5 pt-[60px] pb-xl">
        <div className="max-w-2xl mx-auto">
          <p className="text-white/70 text-caption mb-xs">약궁합</p>
          <h1 className="text-h1 text-white mb-sm">
            {selectedProfile ? `${selectedProfile.name}님` : '안녕하세요'}
          </h1>
          <div className="flex items-center gap-lg text-white/90 text-body">
            <span>복용약 {activeMedsCount}개</span>
            {risk && (
              <>
                <span className="text-white/40">|</span>
                <span className="flex items-center gap-xs">
                  <risk.icon size={16} />
                  {risk.text}
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Profile Selector — overlapping hero bottom */}
      <div className="max-w-2xl mx-auto px-5 -mt-md">
        <div className="bg-white rounded-card shadow-card p-md">
          <ProfileSelector
            profiles={profiles}
            selectedId={selectedProfileId}
            onSelect={setSelectedProfileId}
            onAdd={() => setShowCreateModal(true)}
          />
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 pb-[80px] pt-xl">
        {selectedProfileId && (
          <>
            {/* Quick Action Cards */}
            <section className="mb-xl">
              <div className="grid grid-cols-2 gap-md">
                <button
                  onClick={() => router.push('/upload')}
                  className="bg-white rounded-card shadow-card p-lg flex flex-col items-center gap-sm text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                    <Camera size={22} className="text-primary" />
                  </div>
                  <span className="text-body-bold text-neutral-900">사진으로 등록</span>
                  <span className="text-caption text-neutral-400">약 사진을 찍어보세요</span>
                </button>

                <button
                  onClick={() => router.push(`/meds/${selectedProfileId}/add`)}
                  className="bg-white rounded-card shadow-card p-lg flex flex-col items-center gap-sm text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                    <PenLine size={22} className="text-primary" />
                  </div>
                  <span className="text-body-bold text-neutral-900">수동 입력</span>
                  <span className="text-caption text-neutral-400">직접 약 이름을 입력</span>
                </button>
              </div>
            </section>

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
              <div className="flex items-center gap-sm mb-lg">
                <Pill size={20} className="text-neutral-600" />
                <h2 className="text-h3 text-neutral-900">
                  복용 중인 약 ({activeMedsCount})
                </h2>
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
      </main>

      <BottomNav />

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
    </div>
  );
}
