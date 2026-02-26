import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkInteraction, fetchAnalysisLog, fetchAnalysisHistory } from '@/lib/apiClient';

export function useAnalysisLog(logId: string | null) {
  return useQuery({
    queryKey: ['analysisLog', logId],
    queryFn: () => fetchAnalysisLog(logId!),
    enabled: !!logId,
  });
}

export function useAnalysisHistory(profileId: string | null) {
  return useQuery({
    queryKey: ['analysisHistory', profileId],
    queryFn: () => fetchAnalysisHistory(profileId!),
    enabled: !!profileId,
  });
}

export function useCheckInteraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkInteraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysisHistory'] });
    },
  });
}
