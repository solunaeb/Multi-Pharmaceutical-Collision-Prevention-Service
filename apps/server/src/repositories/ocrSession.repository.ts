import { prisma } from '../lib/prisma';

export interface CreateOcrSessionInput {
  profileId: string;
  imageUrl?: string | null;
  imageType: string;
  rawOcrResult?: object | null;
  parsedMedsCount?: number;
  confidenceScore?: number | null;
  status?: string;
}

export const ocrSessionRepository = {
  async create(data: CreateOcrSessionInput) {
    return prisma.ocrSession.create({
      data: {
        profileId: data.profileId,
        imageUrl: data.imageUrl || null,
        imageType: data.imageType,
        rawOcrResult: data.rawOcrResult ? JSON.stringify(data.rawOcrResult) : null,
        parsedMedsCount: data.parsedMedsCount || 0,
        confidenceScore: data.confidenceScore || null,
        status: data.status || 'pending',
      },
    });
  },

  async updateStatus(id: string, status: string, extras?: { parsedMedsCount?: number; confidenceScore?: number }) {
    return prisma.ocrSession.update({
      where: { id },
      data: { status, ...extras },
    });
  },

  async findById(id: string) {
    return prisma.ocrSession.findUnique({ where: { id } });
  },
};
