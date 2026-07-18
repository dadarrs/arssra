import { Request, Response } from 'express';
import { TrackerRepository } from '../repositories/tracker.repository';
import { RssService } from '../services/rss.service';
import { TRACKERS } from '../trackers/definitions';

const VALID_SCHEDULES = [
  { value: '*/30 * * * *', label: 'Every 30 minutes' },
  { value: '0 * * * *', label: 'Every 1 hour' },
  { value: '0 */2 * * *', label: 'Every 2 hours' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 */12 * * *', label: 'Every 12 hours' },
  { value: '0 0 * * *', label: 'Every 24 hours' },
];

export class TrackerController {
  private readonly repository: TrackerRepository;
  private readonly rssService: RssService;

  constructor(rssService: RssService) {
    this.repository = new TrackerRepository();
    this.rssService = rssService;

    this.getSchedules = this.getSchedules.bind(this);
    this.getDefinitions = this.getDefinitions.bind(this);
    this.getAllTrackers = this.getAllTrackers.bind(this);
    this.createTracker = this.createTracker.bind(this);
    this.updateTracker = this.updateTracker.bind(this);
    this.deleteTracker = this.deleteTracker.bind(this);
    this.toggleTracker = this.toggleTracker.bind(this);
  }

  public async getDefinitions(req: Request, res: Response) {
    res.json(TRACKERS);
  }

  public async getSchedules(req: Request, res: Response) {
    res.json(VALID_SCHEDULES);
  }

  public async getAllTrackers(req: Request, res: Response) {
    try {
      const trackers = await this.repository.getAllTrackers();

      const mappedTrackers = trackers.map((t) => {
        let nextRun = null;
        if (t.lastRun) {
          const time = new Date(t.lastRun).getTime();
          const cron = t.cronSchedule;
          if (cron === '*/30 * * * *') nextRun = new Date(time + 30 * 60000);
          else if (cron === '0 * * * *') nextRun = new Date(time + 60 * 60000);
          else if (cron === '0 */2 * * *') nextRun = new Date(time + 2 * 60 * 60000);
          else if (cron === '0 */6 * * *') nextRun = new Date(time + 6 * 60 * 60000);
          else if (cron === '0 */12 * * *') nextRun = new Date(time + 12 * 60 * 60000);
          else if (cron === '0 0 * * *') nextRun = new Date(time + 24 * 60 * 60000);
          else if (cron === '*/15 * * * *') nextRun = new Date(time + 15 * 60000);
          else nextRun = new Date(time + 60 * 60000);
        }

        return {
          ...t,
          nextRun,
        };
      });

      res.json(mappedTrackers);
    } catch (error) {
      console.error('Error fetching trackers:', error);
      res.status(500).json({ error: 'Failed to fetch trackers' });
    }
  }

  public async createTracker(req: Request, res: Response) {
    try {
      const { definitionId, url, schedule, name } = req.body;
      if (!definitionId) {
        return res.status(400).json({ error: 'Tracker Definition ID is required' });
      }

      const def = TRACKERS.find((t) => t.id === definitionId);

      if (!def) {
        return res.status(400).json({ error: 'Invalid tracker definition ID' });
      }

      // Backend validation: Ensure schedule strictly matches one of the allowed values
      let finalSchedule = schedule || '*/30 * * * *';
      if (!VALID_SCHEDULES.some((s) => s.value === finalSchedule)) {
        finalSchedule = '*/30 * * * *';
      }

      const newTracker = await this.repository.createTracker({
        name: name || def.name,
        url: url,
        cronSchedule: finalSchedule,
      });

      if (newTracker.active) {
        this.rssService.startTrackerCron(newTracker);
      }

      res.status(201).json(newTracker);
    } catch {
      res.status(500).json({ error: 'Failed to create tracker' });
    }
  }

  public async deleteTracker(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      await this.repository.deleteTracker(id);
      this.rssService.stopTrackerCron(id);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: 'Failed to delete tracker' });
    }
  }

  public async updateTracker(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      const { url, schedule, name } = req.body;

      let finalSchedule = schedule;
      if (finalSchedule && !VALID_SCHEDULES.some((s) => s.value === finalSchedule)) {
        finalSchedule = '*/30 * * * *';
      }

      const updated = await this.repository.updateTracker(id, url, finalSchedule, name);

      if (updated.active) {
        this.rssService.startTrackerCron(updated);
      }

      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update tracker' });
    }
  }

  public async toggleTracker(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      const active = req.body.active;
      const updated = await this.repository.toggleTracker(id, active);

      if (updated.active) {
        this.rssService.startTrackerCron(updated);
      } else {
        this.rssService.stopTrackerCron(updated.id);
      }

      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to toggle tracker' });
    }
  }
}
