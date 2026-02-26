import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const profileRepository = {
  async findAll() {
    return prisma.profile.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { medications: { where: { status: 'active' } } } },
      },
    });
  },

  async findById(id: string) {
    return prisma.profile.findUnique({
      where: { id },
      include: {
        _count: { select: { medications: { where: { status: 'active' } } } },
      },
    });
  },

  async create(data: Prisma.ProfileCreateInput) {
    return prisma.profile.create({ data });
  },

  async update(id: string, data: Prisma.ProfileUpdateInput) {
    return prisma.profile.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.profile.delete({ where: { id } });
  },

  async count() {
    return prisma.profile.count();
  },
};
