import { api } from './api';
import type { Profile, Medication, AnalysisResult, InteractionLog } from '@/types';

// Profiles
export async function fetchProfiles(): Promise<Profile[]> {
  return api.get<Profile[]>('/profiles');
}

export async function fetchProfile(id: string): Promise<Profile> {
  return api.get<Profile>(`/profiles/${id}`);
}

export async function createProfile(data: {
  name: string;
  birthYear?: number | null;
  notes?: string | null;
}): Promise<Profile> {
  return api.post<Profile>('/profiles', data);
}

export async function updateProfile(
  id: string,
  data: { name?: string; birthYear?: number | null; notes?: string | null },
): Promise<Profile> {
  return api.patch<Profile>(`/profiles/${id}`, data);
}

export async function deleteProfile(id: string): Promise<void> {
  return api.delete(`/profiles/${id}`);
}

// Medications
interface MedsResponse {
  profile: { id: string; name: string; birthYear: number | null };
  activeMedsCount: number;
  latestRiskLevel: string | null;
  medications: Medication[];
}

export async function fetchMedications(profileId: string): Promise<MedsResponse> {
  return api.get<MedsResponse>(`/meds/${profileId}`);
}

interface RegisterMedInput {
  name: string;
  ingredient?: string | null;
  dose?: string | null;
  days?: number | null;
  type: 'prescription' | 'otc' | 'supplement';
  source?: 'camera' | 'manual';
}

interface RegisterMedResponse {
  registered: Medication[];
  interactionResult: AnalysisResult;
}

export async function registerMedications(
  profileId: string,
  meds: RegisterMedInput[],
): Promise<RegisterMedResponse> {
  return api.post<RegisterMedResponse>(`/meds/${profileId}`, meds);
}

interface DeactivateResponse {
  message: string;
  interactionResult: AnalysisResult;
}

export async function deactivateMedication(
  profileId: string,
  medId: string,
): Promise<DeactivateResponse> {
  return api.delete<DeactivateResponse>(`/meds/${profileId}/${medId}`);
}

// Analysis
export async function checkInteraction(data: {
  profileId: string;
  triggerMedId?: string | null;
}): Promise<AnalysisResult> {
  return api.post<AnalysisResult>('/analysis/check-interaction', data);
}

export async function fetchAnalysisLog(logId: string): Promise<AnalysisResult & { analyzedAt: string; profileId: string }> {
  return api.get(`/analysis/log/${logId}`);
}

export async function fetchAnalysisHistory(profileId: string): Promise<InteractionLog[]> {
  return api.get<InteractionLog[]>(`/analysis/history/${profileId}`);
}

// OCR
interface RawKeyword {
  text: string;
  matchedMedIndex: number | null;
}

interface OcrResult {
  ocrSessionId: string;
  imageType: string;
  confidenceScore: number;
  extractedMeds: {
    name: string;
    ingredient: string | null;
    dose: string | null;
    days: number | null;
    type: 'prescription' | 'otc' | 'supplement';
    confidence: number;
  }[];
  rawKeywords: RawKeyword[];
}

export async function parseOcrImage(profileId: string, file: File): Promise<OcrResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('profileId', profileId);
  return api.upload<OcrResult>('/ocr/parse', formData);
}
