import { TrackerRepository } from '../repositories/tracker.repository';
import { calculateNextRun } from '../utils/cron.utils';
import { RssService } from './rss.service';

export class TrackerService {
  private readonly repository: TrackerRepository;

  constructor(private readonly rssService: RssService) {
    this.repository = new TrackerRepository();
  }

  async getAllTrackers() {
    const trackers = await this.repository.getAllTrackers();
    return trackers.map((t: any) => ({
      ...t,
      nextRun: t.active ? calculateNextRun(t.lastRun, t.cronSchedule) : null,
    }));
  }

  async createTracker(data: { name: string; url: string; cronSchedule: string }) {
    const newTracker = await this.repository.createTracker(data);
    if (newTracker.active) {
      this.rssService.startTrackerCron(newTracker);
    }
    return newTracker;
  }

  async deleteTracker(id: number) {
    await this.repository.deleteTracker(id);
    this.rssService.stopTrackerCron(id);
  }

  async updateTracker(id: number, url?: string, schedule?: string, name?: string) {
    const updated = await this.repository.updateTracker(id, url, schedule, name);
    if (updated.active) {
      this.rssService.startTrackerCron(updated);
    }
    return updated;
  }

  async toggleTracker(id: number, active: boolean) {
    const updated = await this.repository.toggleTracker(id, active);
    if (updated.active) {
      this.rssService.startTrackerCron(updated);
    } else {
      this.rssService.stopTrackerCron(updated.id);
    }
    return updated;
  }
}
