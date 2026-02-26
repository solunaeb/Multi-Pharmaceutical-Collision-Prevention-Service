import { dataLoader } from './dataLoader.service';
import type { ImageType } from '../types';

interface ExtractedMed {
  name: string;
  ingredient: string | null;
  dose: string | null;
  days: number | null;
  type: 'prescription' | 'otc' | 'supplement';
  confidence: number;
}

interface ParseResult {
  imageType: ImageType;
  medications: ExtractedMed[];
}

// Med form keywords to detect drug names in OCR text
const MED_FORM_KEYWORDS = [
  '정', '캡슐', '시럽', '액', '산', '환', '겔', '연고',
  '크림', '패치', '주사', '필름', '서방정', '장용정', '연질캡슐',
  'mg', 'ml', 'g', 'mcg',
];

// Image type classification keywords
const IMAGE_TYPE_KEYWORDS: Record<string, string[]> = {
  prescription: ['처방전', '처방', '의원', '병원', '약국', '조제', '교부', '원외처방'],
  med_bag: ['약봉투', '약국', '조제일', '복용법', '1일', '1회', '식후', '식전', '취침전'],
  otc_box: ['일반의약품', '의약외품', '효능효과', '용법용량', '사용상의주의'],
  supplement_label: ['건강기능식품', '기능성', '영양기능', '건강식품', '보충제'],
};

// Dose pattern regexes
const DOSE_PATTERNS = [
  /1일\s*(\d+)\s*회/,
  /(\d+)\s*일\s*(\d+)\s*회/,
  /1회\s*(\d+)\s*(?:정|캡슐|포)/,
  /(\d+(?:\.\d+)?)\s*(?:mg|ml|g|mcg)/i,
];

// Days pattern regexes
const DAYS_PATTERNS = [
  /(\d+)\s*일분/,
  /(\d+)\s*일치/,
  /(\d+)\s*일간/,
  /투약일수\s*[:：]?\s*(\d+)/,
];

export const koreanMedParser = {
  parse(ocrText: string, ocrConfidence: number): ParseResult {
    const imageType = classifyImageType(ocrText);
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const medications = extractMedications(lines, imageType, ocrConfidence);

    return { imageType, medications };
  },

  /** OCR 텍스트에서 모든 의미 있는 키워드를 추출 (노이즈 제거, 중복 제거) */
  extractKeywords(ocrText: string): string[] {
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const keywords: string[] = [];

    for (const line of lines) {
      // 탭, 다중 공백, 파이프, 슬래시로 세그먼트 분리
      const segments = line.split(/[\t|/]| {2,}/).map(s => s.trim()).filter(s => s.length > 0);

      for (const segment of segments) {
        const cleaned = cleanSegment(segment);
        if (cleaned && shouldKeepKeyword(cleaned)) {
          keywords.push(cleaned);
        }
      }
    }

    // 순서 유지하면서 중복 제거
    return [...new Set(keywords)];
  },
};

function cleanSegment(text: string): string {
  return text
    .replace(/^[\s\-_.,;:!?()[\]{}'"]+/, '')
    .replace(/[\s\-_.,;:!?()[\]{}'"]+$/, '')
    .trim();
}

function shouldKeepKeyword(text: string): boolean {
  if (text.length < 2) return false;
  if (/^\d+[.\-/]?\d*$/.test(text)) return false;
  if (/^[\W_]+$/.test(text)) return false;
  if (text.length > 50) return false;
  if (/^\d{2,4}[-./]\d{1,2}[-./]\d{1,2}$/.test(text)) return false;
  if (/^0\d{1,2}[-)]?\d{3,4}[-]?\d{4}$/.test(text)) return false;
  return true;
}

function classifyImageType(text: string): ImageType {
  const normalized = text.replace(/\s+/g, '');
  let bestType: ImageType = 'other';
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(IMAGE_TYPE_KEYWORDS)) {
    const score = keywords.filter(kw => normalized.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestType = type as ImageType;
    }
  }

  return bestType;
}

function extractMedications(
  lines: string[],
  imageType: ImageType,
  ocrConfidence: number,
): ExtractedMed[] {
  const results: ExtractedMed[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Try matching against known medications first
    const matched = matchKnownMedication(line);
    if (matched && !seen.has(matched.name)) {
      seen.add(matched.name);
      const dose = extractDose(line);
      const days = extractDays(line, lines);
      const confidence = calculateConfidence(matched.matchTier, ocrConfidence, { dose, days });
      results.push({
        name: matched.name,
        ingredient: matched.ingredient,
        dose,
        days,
        type: matched.medType,
        confidence,
      });
      continue;
    }

    // Fallback: detect lines containing med form keywords
    if (hasMedFormKeyword(line) && line.length >= 3) {
      const medName = extractMedName(line);
      if (medName && !seen.has(medName)) {
        seen.add(medName);
        const dose = extractDose(line);
        const days = extractDays(line, lines);
        const medType = inferMedType(imageType);
        const confidence = calculateConfidence(5, ocrConfidence, { dose, days });
        results.push({
          name: medName,
          ingredient: null,
          dose,
          days,
          type: medType,
          confidence,
        });
      }
    }
  }

  return results;
}

interface MatchResult {
  name: string;
  ingredient: string;
  medType: 'prescription' | 'otc' | 'supplement';
  matchTier: number;
}

function matchKnownMedication(line: string): MatchResult | null {
  const normalized = line.replace(/\s+/g, '');

  // Tier 1: Match against common_medications.json (exact/substring)
  const commonMeds = dataLoader.commonMedications;
  for (const med of commonMeds) {
    if (normalized.includes(med.item_name.replace(/\s+/g, '')) ||
        med.item_name.replace(/\s+/g, '').includes(normalized.slice(0, 4))) {
      // Check that at least 4 characters of item_name appear in line
      const nameNoSpace = med.item_name.replace(/\s+/g, '');
      // More precise: check if a significant portion matches
      if (normalized.includes(nameNoSpace.slice(0, Math.min(4, nameNoSpace.length)))) {
        return {
          name: med.item_name,
          ingredient: med.ingredient_eng,
          medType: med.med_type as 'prescription' | 'otc' | 'supplement',
          matchTier: 1,
        };
      }
    }
  }

  // Tier 2: Match ingredient Korean names from ingredientsByName
  for (const [name, codes] of dataLoader.ingredientsByName) {
    // Only check Korean names (contain Korean characters)
    if (/[가-힣]/.test(name) && name.length >= 2 && normalized.includes(name)) {
      const code = codes[0];
      const ingredient = dataLoader.ingredientsByCode.get(code);
      if (ingredient) {
        return {
          name: extractMedName(line) || name,
          ingredient: ingredient.ingredient_name_eng,
          medType: 'prescription',
          matchTier: 2,
        };
      }
    }
  }

  // Tier 3: Match duplicate group aliases
  for (const group of dataLoader.duplicateGroups) {
    const allNames = [group.ingredient_kor, ...group.aliases];
    for (const alias of allNames) {
      if (alias && normalized.includes(alias.replace(/\s+/g, ''))) {
        return {
          name: extractMedName(line) || alias,
          ingredient: group.ingredient_eng,
          medType: 'otc',
          matchTier: 3,
        };
      }
    }
  }

  // Tier 4: Match supplement interaction names
  for (const si of dataLoader.supplementInteractions) {
    if (normalized.includes(si.supplement_name_kor.replace(/\s+/g, '')) ||
        normalized.toLowerCase().includes(si.supplement_name_eng.toLowerCase())) {
      return {
        name: si.supplement_name_kor,
        ingredient: si.supplement_name_eng,
        medType: 'supplement',
        matchTier: 4,
      };
    }
  }

  return null;
}

function hasMedFormKeyword(line: string): boolean {
  return MED_FORM_KEYWORDS.some(kw => line.includes(kw));
}

function extractMedName(line: string): string | null {
  // Try to extract a meaningful drug name from the line
  // Pattern: Korean characters + optional form suffix (정, 캡슐, etc.) + optional dose
  const match = line.match(/([가-힣a-zA-Z]+(?:정|캡슐|시럽|액|산|환|겔|연고|크림|패치|서방정|장용정|연질캡슐)(?:\s*\d+(?:\.\d+)?\s*(?:mg|ml|g|mcg))?)/i);
  if (match) return match[1].trim();

  // Fallback: take first substantial Korean word segment
  const korMatch = line.match(/([가-힣]{3,})/);
  if (korMatch) return korMatch[1];

  return null;
}

function extractDose(line: string): string | null {
  for (const pattern of DOSE_PATTERNS) {
    const match = line.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function extractDays(line: string, allLines: string[]): number | null {
  // Check current line first
  for (const pattern of DAYS_PATTERNS) {
    const match = line.match(pattern);
    if (match) return parseInt(match[1], 10);
  }

  // Check all lines for global days info
  for (const l of allLines) {
    for (const pattern of DAYS_PATTERNS) {
      const match = l.match(pattern);
      if (match) return parseInt(match[1], 10);
    }
  }

  return null;
}

function calculateConfidence(
  matchTier: number,
  ocrConfidence: number,
  extras: { dose: string | null; days: number | null },
): number {
  // Base confidence from match tier
  let base: number;
  switch (matchTier) {
    case 1: base = 0.85; break; // common_medications exact match
    case 2: base = 0.70; break; // ingredient name match
    case 3: base = 0.65; break; // duplicate group alias match
    case 4: base = 0.60; break; // supplement interaction match
    default: base = 0.40; break; // form keyword only (no DB match)
  }

  // Boost for additional parsed fields
  if (extras.dose) base += 0.05;
  if (extras.days) base += 0.05;

  // Factor in OCR engine confidence
  const adjusted = base * (0.5 + 0.5 * ocrConfidence);

  return Math.min(Math.round(adjusted * 100) / 100, 0.99);
}

function inferMedType(imageType: ImageType): 'prescription' | 'otc' | 'supplement' {
  switch (imageType) {
    case 'prescription':
    case 'med_bag':
      return 'prescription';
    case 'otc_box':
      return 'otc';
    case 'supplement_label':
      return 'supplement';
    default:
      return 'prescription';
  }
}
