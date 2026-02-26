import { medicationRepository } from '../repositories/medication.repository';
import { interactionLogRepository } from '../repositories/interactionLog.repository';
import { profileRepository } from '../repositories/profile.repository';
import { dataLoader } from './dataLoader.service';
import { claudeService } from './claude.service';
import type { RiskLevel, InteractionDetail, AnalysisResult, InteractionType } from '../types';

const DISCLAIMER = '이 정보는 참고용이며, 의학적 진단을 대체하지 않습니다.';

interface MedWithCodes {
  id: string;
  name: string;
  ingredient: string | null;
  type: string;
  ingredientCodes: string[];
}

export const analysisService = {
  async analyze(profileId: string, triggerMedId?: string): Promise<AnalysisResult> {
    // Step 1: Get all active medications for this profile
    const profile = await profileRepository.findById(profileId);
    if (!profile) throw new Error('프로필을 찾을 수 없습니다.');

    const activeMeds = await medicationRepository.findActiveByProfileId(profileId);
    if (activeMeds.length === 0) {
      const log = await interactionLogRepository.create({
        profileId,
        triggerMedId: triggerMedId || null,
        analyzedMedIds: [],
        riskLevel: 'safe',
        interactions: { found_count: 0, details: [] } as any,
        summary: '등록된 약물이 없습니다.',
        actionGuide: '약물을 등록하면 충돌 분석을 받을 수 있습니다.',
      });

      return {
        log_id: log.id,
        risk_level: 'safe',
        summary: '등록된 약물이 없습니다.',
        action_guide: '약물을 등록하면 충돌 분석을 받을 수 있습니다.',
        interactions: { found_count: 0, details: [] },
        disclaimer: DISCLAIMER,
      };
    }

    // Step 2: Map each medication's ingredient to ingredient_codes
    const medsWithCodes: MedWithCodes[] = activeMeds.map((med) => ({
      id: med.id,
      name: med.name,
      ingredient: med.ingredient,
      type: med.type,
      ingredientCodes: med.ingredient ? dataLoader.findIngredientCodes(med.ingredient) : [],
    }));

    const allInteractions: InteractionDetail[] = [];

    // Step 3: Check contraindication pairs for all medication pairs
    for (let i = 0; i < medsWithCodes.length; i++) {
      for (let j = i + 1; j < medsWithCodes.length; j++) {
        const medA = medsWithCodes[i];
        const medB = medsWithCodes[j];

        for (const codeA of medA.ingredientCodes) {
          for (const codeB of medB.ingredientCodes) {
            const pairs = dataLoader.findContraindications(codeA, codeB);
            if (pairs.length > 0) {
              const pair = pairs[0]; // Use the first match
              allInteractions.push({
                type: 'contraindication' as InteractionType,
                severity: 'contraindicated' as RiskLevel,
                med_a: { id: medA.id, name: medA.name, ingredient: medA.ingredient || '' },
                med_b: { id: medB.id, name: medB.name, ingredient: medB.ingredient || '' },
                reason_plain: pair.reason,
                source: pair.source,
              });
            }
          }
        }
      }
    }

    // Step 4: Check supplement-drug interactions
    const supplements = medsWithCodes.filter((m) => m.type === 'supplement');
    const nonSupplements = medsWithCodes.filter((m) => m.type !== 'supplement');

    for (const supp of supplements) {
      for (const drug of nonSupplements) {
        if (!supp.ingredient || !drug.ingredient) continue;
        const interaction = dataLoader.findSupplementInteraction(
          supp.ingredient,
          drug.ingredient,
        );
        if (interaction) {
          allInteractions.push({
            type: 'contraindication' as InteractionType,
            severity: interaction.severity as RiskLevel,
            med_a: { id: supp.id, name: supp.name, ingredient: supp.ingredient },
            med_b: { id: drug.id, name: drug.name, ingredient: drug.ingredient },
            reason_plain: interaction.reason_plain,
            source: interaction.source,
          });
        }
      }
    }

    // Step 5: Check duplicate ingredient groups
    const ingredientGroupMap = new Map<string, MedWithCodes[]>();
    for (const med of medsWithCodes) {
      if (!med.ingredient) continue;
      const group = dataLoader.findDuplicateGroup(med.ingredient);
      if (group) {
        const existing = ingredientGroupMap.get(group.group_id) || [];
        existing.push(med);
        ingredientGroupMap.set(group.group_id, existing);
      }
    }

    for (const [groupId, meds] of ingredientGroupMap) {
      if (meds.length < 2) continue;
      const group = dataLoader.duplicateGroups.find((g) => g.group_id === groupId)!;
      for (let i = 0; i < meds.length; i++) {
        for (let j = i + 1; j < meds.length; j++) {
          allInteractions.push({
            type: 'duplicate' as InteractionType,
            severity: 'caution' as RiskLevel,
            med_a: {
              id: meds[i].id,
              name: meds[i].name,
              ingredient: meds[i].ingredient || '',
            },
            med_b: {
              id: meds[j].id,
              name: meds[j].name,
              ingredient: meds[j].ingredient || '',
            },
            reason_plain: group.reason_plain,
            source: `성분 중복 그룹: ${group.ingredient_kor} (${group.ingredient_eng})`,
          });
        }
      }
    }

    // Step 6: Check elderly caution (65+ years old)
    const currentYear = new Date().getFullYear();
    const age = profile.birthYear ? currentYear - profile.birthYear : null;
    if (age && age >= 65) {
      for (const med of medsWithCodes) {
        for (const code of med.ingredientCodes) {
          const cautions = dataLoader.findElderlyCaution(code);
          if (cautions.length > 0) {
            const caution = cautions[0];
            allInteractions.push({
              type: 'contraindication' as InteractionType,
              severity: 'caution' as RiskLevel,
              med_a: {
                id: med.id,
                name: med.name,
                ingredient: med.ingredient || '',
              },
              reason_plain: `노인 주의 약물: ${caution.detail.substring(0, 200)}`,
              source: caution.source,
            });
          }
        }
      }
    }

    // Step 7: Determine overall risk level
    let riskLevel: RiskLevel = 'safe';
    if (allInteractions.some((i) => i.severity === 'contraindicated')) {
      riskLevel = 'contraindicated';
    } else if (allInteractions.some((i) => i.severity === 'caution')) {
      riskLevel = 'caution';
    }

    // Deduplicate interactions (same pair of meds)
    const seen = new Set<string>();
    const uniqueInteractions = allInteractions.filter((i) => {
      const key = i.med_b
        ? [i.med_a.id, i.med_b.id].sort().join('|') + '|' + i.type
        : i.med_a.id + '|' + i.type;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Step 8: Generate plain-language summary via Claude API (if not safe)
    let summary = '현재 복용 중인 약물 간 충돌이 발견되지 않았습니다.';
    let actionGuide = '정기 진료 시 복용 중인 모든 약물을 의사에게 알려주세요.';

    if (riskLevel !== 'safe' && uniqueInteractions.length > 0) {
      const result = await claudeService.generatePlainLanguageSummary(
        uniqueInteractions.map((i) => ({
          type: i.type,
          severity: i.severity,
          med_a: { name: i.med_a.name, ingredient: i.med_a.ingredient },
          med_b: i.med_b
            ? { name: i.med_b.name, ingredient: i.med_b.ingredient }
            : undefined,
          reason: i.reason_plain,
          source: i.source,
        })),
        profile.name,
        profile.birthYear,
      );
      summary = result.summary;
      actionGuide = result.actionGuide;
    }

    // Step 9: Save to interaction_logs
    const log = await interactionLogRepository.create({
      profileId,
      triggerMedId: triggerMedId || null,
      analyzedMedIds: activeMeds.map((m) => m.id),
      riskLevel,
      interactions: {
        found_count: uniqueInteractions.length,
        details: uniqueInteractions,
      } as any,
      summary,
      actionGuide,
    });

    return {
      log_id: log.id,
      risk_level: riskLevel,
      summary,
      action_guide: actionGuide,
      interactions: {
        found_count: uniqueInteractions.length,
        details: uniqueInteractions,
      },
      disclaimer: DISCLAIMER,
    };
  },
};
