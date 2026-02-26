import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProfiles, fetchProfile, createProfile, updateProfile, deleteProfile } from '@/lib/apiClient';

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });
}

export function useProfile(id: string | null) {
  return useQuery({
    queryKey: ['profiles', id],
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; birthYear?: number | null; notes?: string | null } }) =>
      updateProfile(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}
