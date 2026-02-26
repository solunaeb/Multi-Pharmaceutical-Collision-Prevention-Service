export const MedType = {
  PRESCRIPTION: 'prescription',
  OTC: 'otc',
  SUPPLEMENT: 'supplement',
} as const;
export type MedType = (typeof MedType)[keyof typeof MedType];

export const MedStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
export type MedStatus = (typeof MedStatus)[keyof typeof MedStatus];

export const RiskLevel = {
  SAFE: 'safe',
  CAUTION: 'caution',
  CONTRAINDICATED: 'contraindicated',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const InteractionType = {
  CONTRAINDICATION: 'contraindication',
  DUPLICATE: 'duplicate',
  DOSE_EXCESS: 'dose_excess',
} as const;
export type InteractionType = (typeof InteractionType)[keyof typeof InteractionType];

export const OcrStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
} as const;
export type OcrStatus = (typeof OcrStatus)[keyof typeof OcrStatus];

export const ImageType = {
  PRESCRIPTION: 'prescription',
  MED_BAG: 'med_bag',
  OTC_BOX: 'otc_box',
  SUPPLEMENT_LABEL: 'supplement_label',
  OTHER: 'other',
} as const;
export type ImageType = (typeof ImageType)[keyof typeof ImageType];

export const MedSource = {
  CAMERA: 'camera',
  MANUAL: 'manual',
} as const;
export type MedSource = (typeof MedSource)[keyof typeof MedSource];

export interface Ingredient {
  ingredient_code: string;
  ingredient_name_eng: string;
  ingredient_name_kor: string | null;
  dur_categories: string[];
  elderly_caution_detail: string | null;
  category: string | null;
  common_dose: string | null;
}

export interface ContraindicationPair {
  ingredient_code_a: string;
  ingredient_name_a: string;
  ingredient_code_b: string;
  ingredient_name_b: string;
  reason: string;
  notice_date: string;
  product_pair_count: number;
  source: string;
}

export interface SupplementDrugInteraction {
  id: string;
  supplement_name_kor: string;
  supplement_name_eng: string;
  drug_ingredient_eng: string;
  drug_ingredient_kor: string;
  drug_category: string;
  severity: string;
  reason_plain: string;
  action_guide: string;
  source: string;
}

export interface DuplicateIngredientGroup {
  group_id: string;
  ingredient_eng: string;
  ingredient_kor: string;
  aliases: string[];
  max_daily_dose: string;
  common_products: string[];
  overdose_risk: string;
  reason_plain: string;
}

export interface ElderlyCaution {
  ingredient_name_eng: string;
  ingredient_code: string;
  product_code: string;
  product_name: string;
  manufacturer: string;
  detail: string;
  notice_date: string;
  notice_number: string;
  source: string;
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
