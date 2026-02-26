import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMedications, registerMedications, deactivateMedication } from '@/lib/apiClient';

export function useMedications(profileId: string | null) {
  return useQuery({
    queryKey: ['medications', profileId],
    queryFn: () => fetchMedications(profileId!),
    enabled: !!profileId,
  });
}

export function useRegisterMedications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, meds }: { profileId: string; meds: Parameters<typeof registerMedications>[1] }) =>
      registerMedications(profileId, meds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medications', variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['analysisHistory'] });
    },
  });
}

export function useDeactivateMedication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, medId }: { profileId: string; medId: string }) =>
      deactivateMedication(profileId, medId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medications', variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['analysisHistory'] });
    },
  });
}
