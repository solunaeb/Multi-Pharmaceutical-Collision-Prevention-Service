import { prisma } from '../lib/prisma';

export interface CreateMedInput {
  profileId: string;
  name: string;
  ingredient?: string | null;
  dose?: string | null;
  days?: number | null;
  type: string;
  source?: string;
  imageUrl?: string | null;
  ocrSessionId?: string | null;
}

export const medicationRepository = {
  async findActiveByProfileId(profileId: string) {
    return prisma.medication.findMany({
      where: { profileId, status: 'active' },
      orderBy: { registeredAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.medication.findUnique({ where: { id } });
  },

  async createMany(meds: CreateMedInput[]) {
    const results = [];
    for (const med of meds) {
      const result = await prisma.medication.create({
        data: {
          profileId: med.profileId,
          name: med.name,
          ingredient: med.ingredient || null,
          dose: med.dose || null,
          days: med.days || null,
          type: med.type,
          source: med.source || 'manual',
          status: 'active',
          imageUrl: med.imageUrl || null,
          ocrSessionId: med.ocrSessionId || null,
        },
      });
      results.push(result);
    }
    return results;
  },

  async deactivate(id: string) {
    return prisma.medication.update({
      where: { id },
      data: { status: 'inactive', deactivatedAt: new Date() },
    });
  },
};
