import { Request, Response } from 'express';
import { TrackerService } from '../services/tracker.service';
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
  private readonly trackerService: TrackerService;

  constructor(trackerService: TrackerService) {
    this.trackerService = trackerService;

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
      const mappedTrackers = await this.trackerService.getAllTrackers();

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

      const newTracker = await this.trackerService.createTracker({
        name: name || def.name,
        url: url,
        cronSchedule: finalSchedule,
      });

      res.status(201).json(newTracker);
    } catch {
      res.status(500).json({ error: 'Failed to create tracker' });
    }
  }

  public async deleteTracker(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      await this.trackerService.deleteTracker(id);
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

      const updated = await this.trackerService.updateTracker(id, url, finalSchedule, name);

      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update tracker' });
    }
  }

  public async toggleTracker(req: Request, res: Response) {
    try {
      const id = Number.parseInt(req.params.id as string, 10);
      const active = req.body.active;
      const updated = await this.trackerService.toggleTracker(id, active);

      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to toggle tracker' });
    }
  }
}
