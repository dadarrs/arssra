import { TorrentRepository } from '../repositories/torrent.repository';
import { TrackerRepository } from '../repositories/tracker.repository';
import { calculateNextRun } from '../utils/cron.utils';
import { RssService } from './rss.service';

export class TrackerService {
  private readonly repository: TrackerRepository;
  private readonly torrentRepo: TorrentRepository;

  constructor(private readonly rssService: RssService) {
    this.repository = new TrackerRepository();
    this.torrentRepo = new TorrentRepository();
  }

  async getAllTrackers() {
    const trackers = await this.repository.getAllTrackers();
    const countMap = await this.torrentRepo.getCountsByTracker();

    return trackers.map((t: any) => ({
      ...t,
      torrentCount: countMap[t.name] || 0,
      nextRun: t.active ? calculateNextRun(t.lastRun, t.cronSchedule) : null,
    }));
  }

  async createTracker(data: {
    name: string;
    url: string;
    cronSchedule: string;
    allowApi?: boolean;
  }) {
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

  async updateTracker(
    id: number,
    url?: string,
    schedule?: string,
    name?: string,
    allowApi?: boolean,
  ) {
    const updated = await this.repository.updateTracker(id, url, schedule, name, allowApi);
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
