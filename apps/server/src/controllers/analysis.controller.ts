import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analysisService } from '../services/analysis.service';
import { interactionLogRepository } from '../repositories/interactionLog.repository';
import { AppError } from '../middleware/errorHandler';

const checkInteractionSchema = z.object({
  profileId: z.string().uuid(),
  triggerMedId: z.string().uuid().nullable().optional(),
});

export const analysisController = {
  async checkInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const data = checkInteractionSchema.parse(req.body);
      const result = await analysisService.analyze(data.profileId, data.triggerMedId ?? undefined);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getLog(req: Request, res: Response, next: NextFunction) {
    try {
      const logId = req.params.logId as string;
      const log = await interactionLogRepository.findById(logId);
      if (!log) throw new AppError(404, 'LOG_NOT_FOUND', '분석 기록을 찾을 수 없습니다.');
      res.json({
        log_id: log.id,
        profileId: log.profileId,
        risk_level: log.riskLevel,
        summary: log.summary,
        action_guide: log.actionGuide,
        interactions: log.interactions,
        disclaimer: '이 정보는 참고용이며, 의학적 진단을 대체하지 않습니다.',
        analyzedAt: log.analyzedAt,
      });
    } catch (err) {
      next(err);
    }
  },

  async history(req: Request, res: Response, next: NextFunction) {
    try {
      const profileId = req.params.profileId as string;
      const logs = await interactionLogRepository.findByProfileId(profileId);
      res.json(
        logs.map((log) => ({
          id: log.id,
          profileId: log.profileId,
          riskLevel: log.riskLevel,
          summary: log.summary,
          actionGuide: log.actionGuide,
          interactions: log.interactions,
          analyzedAt: log.analyzedAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
};
