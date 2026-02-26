import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { profileRepository } from '../repositories/profile.repository';
import { interactionLogRepository } from '../repositories/interactionLog.repository';
import { AppError } from '../middleware/errorHandler';

const createProfileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  birthYear: z.number().int().min(1900).max(2026).nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  birthYear: z.number().int().min(1900).max(2026).nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
});

export const profileController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const profiles = await profileRepository.findAll();
      const result = profiles.map((p) => ({
        id: p.id,
        name: p.name,
        birthYear: p.birthYear,
        notes: p.notes,
        createdAt: p.createdAt,
        activeMedsCount: p._count.medications,
      }));
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const profile = await profileRepository.findById(id);
      if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', '프로필을 찾을 수 없습니다.');
      const latestLog = await interactionLogRepository.findLatestByProfileId(profile.id);
      res.json({
        id: profile.id,
        name: profile.name,
        birthYear: profile.birthYear,
        notes: profile.notes,
        createdAt: profile.createdAt,
        activeMedsCount: profile._count.medications,
        latestRiskLevel: latestLog?.riskLevel || null,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createProfileSchema.parse(req.body);
      const count = await profileRepository.count();
      if (count >= 5) throw new AppError(400, 'MAX_PROFILES', '프로필은 최대 5개까지 생성할 수 있습니다.');
      const profile = await profileRepository.create({
        name: data.name,
        birthYear: data.birthYear ?? null,
        notes: data.notes ?? null,
      });
      res.status(201).json(profile);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = updateProfileSchema.parse(req.body);
      const existing = await profileRepository.findById(id);
      if (!existing) throw new AppError(404, 'PROFILE_NOT_FOUND', '프로필을 찾을 수 없습니다.');
      const updated = await profileRepository.update(id, data);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const existing = await profileRepository.findById(id);
      if (!existing) throw new AppError(404, 'PROFILE_NOT_FOUND', '프로필을 찾을 수 없습니다.');
      await profileRepository.delete(id);
      res.json({ message: '프로필이 삭제되었습니다.' });
    } catch (err) {
      next(err);
    }
  },
};
