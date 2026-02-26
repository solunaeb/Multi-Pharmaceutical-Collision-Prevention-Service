import { prisma } from '../lib/prisma';

export interface CreateInteractionLogInput {
  profileId: string;
  triggerMedId?: string | null;
  analyzedMedIds: string[];
  riskLevel: string;
  interactions: object;
  summary?: string | null;
  actionGuide?: string | null;
}

function parseLogJson<T extends { interactions: string; analyzedMedIds: string }>(
  log: T,
): T & { interactions: object; analyzedMedIds: string[] } {
  return {
    ...log,
    interactions: JSON.parse(log.interactions),
    analyzedMedIds: JSON.parse(log.analyzedMedIds),
  };
}

export const interactionLogRepository = {
  async create(data: CreateInteractionLogInput) {
    return prisma.interactionLog.create({
      data: {
        profileId: data.profileId,
        triggerMedId: data.triggerMedId || null,
        analyzedMedIds: JSON.stringify(data.analyzedMedIds),
        riskLevel: data.riskLevel,
        interactions: JSON.stringify(data.interactions),
        summary: data.summary || null,
        actionGuide: data.actionGuide || null,
      },
    });
  },

  async findById(id: string) {
    const log = await prisma.interactionLog.findUnique({ where: { id } });
    return log ? parseLogJson(log) : null;
  },

  async findByProfileId(profileId: string, limit = 20) {
    const logs = await prisma.interactionLog.findMany({
      where: { profileId },
      orderBy: { analyzedAt: 'desc' },
      take: limit,
    });
    return logs.map(parseLogJson);
  },

  async findLatestByProfileId(profileId: string) {
    const log = await prisma.interactionLog.findFirst({
      where: { profileId },
      orderBy: { analyzedAt: 'desc' },
    });
    return log ? parseLogJson(log) : null;
  },
};
