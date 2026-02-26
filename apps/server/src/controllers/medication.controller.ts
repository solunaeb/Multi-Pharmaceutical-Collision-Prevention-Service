import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { medicationRepository } from '../repositories/medication.repository';
import { profileRepository } from '../repositories/profile.repository';
import { interactionLogRepository } from '../repositories/interactionLog.repository';
import { analysisService } from '../services/analysis.service';
import { AppError } from '../middleware/errorHandler';

const registerMedSchema = z.array(
  z.object({
    name: z.string().min(1, '약품명을 입력해주세요.'),
    ingredient: z.string().nullable().optional(),
    dose: z.string().nullable().optional(),
    days: z.number().int().positive().nullable().optional(),
    type: z.enum(['prescription', 'otc', 'supplement']),
    source: z.enum(['camera', 'manual']).optional().default('manual'),
  }),
).min(1, '최소 1개 약물을 등록해야 합니다.');

export const medicationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = req.params.profileId as string;
      const profile = await profileRepository.findById(profileId);
      if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', '프로필을 찾을 수 없습니다.');

      const meds = await medicationRepository.findActiveByProfileId(profileId);
      const latestLog = await interactionLogRepository.findLatestByProfileId(profileId);

      res.json({
        profile: {
          id: profile.id,
          name: profile.name,
          birthYear: profile.birthYear,
        },
        activeMedsCount: meds.length,
        latestRiskLevel: latestLog?.riskLevel || null,
        medications: meds,
      });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = req.params.profileId as string;
      const profile = await profileRepository.findById(profileId);
      if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', '프로필을 찾을 수 없습니다.');

      const medsData = registerMedSchema.parse(req.body);
      const registered = await medicationRepository.createMany(
        medsData.map((m) => ({ ...m, profileId, ingredient: m.ingredient ?? null, dose: m.dose ?? null, days: m.days ?? null })),
      );

      // Auto-trigger collision analysis
      const analysisResult = await analysisService.analyze(profileId, registered[0]?.id);

      res.status(201).json({
        registered,
        interactionResult: analysisResult,
      });
    } catch (err) {
      next(err);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = req.params.profileId as string;
      const medId = req.params.medId as string;
      const med = await medicationRepository.findById(medId);
      if (!med || med.profileId !== profileId) {
        throw new AppError(404, 'MED_NOT_FOUND', '약물을 찾을 수 없습니다.');
      }

      await medicationRepository.deactivate(medId);

      // Re-analyze after deactivation
      const analysisResult = await analysisService.analyze(profileId);

      res.json({
        message: '약물이 비활성화되었습니다.',
        interactionResult: analysisResult,
      });
    } catch (err) {
      next(err);
    }
  },
};
