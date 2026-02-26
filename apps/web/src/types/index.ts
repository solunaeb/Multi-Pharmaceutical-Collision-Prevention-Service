export type MedType = 'prescription' | 'otc' | 'supplement';
export type MedStatus = 'active' | 'inactive';
export type RiskLevel = 'safe' | 'caution' | 'contraindicated';
export type InteractionType = 'contraindication' | 'duplicate' | 'dose_excess';
export type MedSource = 'camera' | 'manual';

export interface Profile {
  id: string;
  name: string;
  birthYear: number | null;
  notes: string | null;
  createdAt: string;
  activeMedsCount?: number;
  latestRiskLevel?: RiskLevel | null;
}

export interface Medication {
  id: string;
  profileId: string;
  name: string;
  ingredient: string | null;
  dose: string | null;
  days: number | null;
  type: MedType;
  source: MedSource;
  status: MedStatus;
  registeredAt: string;
}

export interface InteractionDetail {
  type: InteractionType;
  severity: RiskLevel;
  med_a: { id: string; name: string; ingredient: string };
  med_b?: { id: string; name: string; ingredient: string };
  reason_plain: string;
  source: string;
}

export interface AnalysisResult {
  log_id: string;
  risk_level: RiskLevel;
  summary: string;
  action_guide: string;
  interactions: {
    found_count: number;
    details: InteractionDetail[];
  };
  disclaimer: string;
}

export interface InteractionLog {
  id: string;
  profileId: string;
  riskLevel: RiskLevel;
  summary: string | null;
  actionGuide: string | null;
  analyzedAt: string;
  interactions: {
    found_count: number;
    details: InteractionDetail[];
  };
}
