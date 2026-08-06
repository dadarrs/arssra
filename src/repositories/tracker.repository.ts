import prisma from '../config/db.config';

export interface CreateTrackerDto {
  name: string;
  url: string;
  cronSchedule?: string;
  allowApi?: boolean;
}

export class TrackerRepository {
  public async getActiveTrackers() {
    return await prisma.tracker.findMany({ where: { active: true } });
  }

  public async getAllTrackers() {
    return await prisma.tracker.findMany({ orderBy: { id: 'asc' } });
  }

  public async createTracker(data: CreateTrackerDto) {
    return await prisma.tracker.create({ data });
  }

  public async deleteTracker(id: number) {
    return await prisma.tracker.delete({ where: { id } });
  }

  public async updateTracker(
    id: number,
    url?: string,
    cronSchedule?: string,
    name?: string,
    allowApi?: boolean,
  ) {
    const data: any = {};
    if (url !== undefined) data.url = url;
    if (cronSchedule !== undefined) data.cronSchedule = cronSchedule;
    if (name !== undefined) data.name = name;
    if (allowApi !== undefined) data.allowApi = allowApi;
    return await prisma.tracker.update({ where: { id }, data });
  }

  public async toggleTracker(id: number, active: boolean) {
    return await prisma.tracker.update({ where: { id }, data: { active } });
  }

  public async updateLastRun(
    id: number,
    status: string,
    addedCount: number = 0,
    errorMessage: string | null = null,
  ) {
    return await prisma.tracker.update({
      where: { id },
      data: {
        lastRun: new Date(),
        lastStatus: status,
        lastAddedCount: addedCount,
        lastError: errorMessage,
      },
    });
  }

  public async setApiCooldown(id: number, cooldownUntil: Date) {
    return await prisma.tracker.update({
      where: { id },
      data: { apiCooldownUntil: cooldownUntil },
    });
  }
}
