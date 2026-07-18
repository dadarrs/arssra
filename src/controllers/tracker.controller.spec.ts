import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { TrackerController } from './tracker.controller';

// Mock dependencies
const mockGetAllTrackers = vi.fn();
const mockCreateTracker = vi.fn();
const mockDeleteTracker = vi.fn();
const mockUpdateTracker = vi.fn();
const mockToggleTracker = vi.fn();

vi.mock('../repositories/tracker.repository', () => {
  return {
    TrackerRepository: class {
      getAllTrackers = mockGetAllTrackers;
      createTracker = mockCreateTracker;
      deleteTracker = mockDeleteTracker;
      updateTracker = mockUpdateTracker;
      toggleTracker = mockToggleTracker;
    },
  };
});

const mockRssService = {
  startTrackerCron: vi.fn(),
  stopTrackerCron: vi.fn(),
} as any;

describe('TrackerController', () => {
  let app: express.Application;
  let controller: TrackerController;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());

    controller = new TrackerController(mockRssService);

    app.get('/api/json/trackers', controller.getAllTrackers);
    app.post('/api/json/trackers', controller.createTracker);
    app.put('/api/json/trackers/:id', controller.updateTracker);
    app.delete('/api/json/trackers/:id', controller.deleteTracker);
    app.put('/api/json/trackers/:id/toggle', controller.toggleTracker);
  });

  describe('getAllTrackers', () => {
    it('should return trackers with mapped nextRun dates', async () => {
      const pastDate = new Date('2024-01-01T12:00:00Z');
      mockGetAllTrackers.mockResolvedValue([
        { id: 1, name: 'T1', lastRun: pastDate, cronSchedule: '0 * * * *' },
        { id: 2, name: 'T2', lastRun: pastDate, cronSchedule: '*/30 * * * *' },
        { id: 3, name: 'T3', lastRun: null, cronSchedule: '0 * * * *' },
      ]);

      const response = await request(app).get('/api/json/trackers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);

      // 60 minutes after
      expect(new Date(response.body[0].nextRun).getTime()).toBe(pastDate.getTime() + 60 * 60000);
      // 30 minutes after
      expect(new Date(response.body[1].nextRun).getTime()).toBe(pastDate.getTime() + 30 * 60000);
      // null lastRun means null nextRun
      expect(response.body[2].nextRun).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockGetAllTrackers.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).get('/api/json/trackers');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch trackers' });
    });
  });

  describe('createTracker', () => {
    it('should return 400 if definitionId is missing', async () => {
      const response = await request(app).post('/api/json/trackers').send({ url: 'http://test' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tracker Definition ID is required');
    });

    it('should return 400 if definitionId is invalid', async () => {
      const response = await request(app)
        .post('/api/json/trackers')
        .send({ definitionId: 'invalid-id', url: 'http://test' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid tracker definition ID');
    });

    it('should correctly clamp invalid schedules to 30 mins', async () => {
      mockCreateTracker.mockResolvedValue({ id: 1, active: true });

      const response = await request(app).post('/api/json/trackers').send({
        definitionId: 'tvchaosuk',
        url: 'http://test',
        schedule: '*/15 * * * *', // Too frequent
      });

      expect(response.status).toBe(201);
      expect(mockCreateTracker).toHaveBeenCalledWith({
        name: 'TV Chaos UK',
        url: 'http://test',
        cronSchedule: '*/30 * * * *',
      });
    });

    it('should successfully create and start tracker cron if active', async () => {
      const newTracker = { id: 1, active: true, name: 'TV Chaos UK' };
      mockCreateTracker.mockResolvedValue(newTracker);

      const response = await request(app).post('/api/json/trackers').send({
        definitionId: 'tvchaosuk',
        url: 'http://test',
        schedule: '0 * * * *',
      });

      expect(response.status).toBe(201);
      expect(mockCreateTracker).toHaveBeenCalled();
      expect(mockRssService.startTrackerCron).toHaveBeenCalledWith(newTracker);
    });

    it('should not start tracker cron if created inactive', async () => {
      const newTracker = { id: 1, active: false, name: 'TV Chaos UK' };
      mockCreateTracker.mockResolvedValue(newTracker);

      const response = await request(app).post('/api/json/trackers').send({
        definitionId: 'tvchaosuk',
        url: 'http://test',
        schedule: '0 * * * *',
      });

      expect(response.status).toBe(201);
      expect(mockRssService.startTrackerCron).not.toHaveBeenCalled();
    });

    it('should return 500 on repository failure', async () => {
      mockCreateTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).post('/api/json/trackers').send({
        definitionId: 'tvchaosuk',
        url: 'http://test',
      });
      expect(response.status).toBe(500);
    });
  });

  describe('updateTracker', () => {
    it('should successfully update tracker and restart cron', async () => {
      const updatedTracker = { id: 1, active: true };
      mockUpdateTracker.mockResolvedValue(updatedTracker);

      const response = await request(app).put('/api/json/trackers/1').send({
        url: 'http://newurl',
        schedule: '0 * * * *',
      });

      expect(response.status).toBe(200);
      expect(mockUpdateTracker).toHaveBeenCalledWith(1, 'http://newurl', '0 * * * *', undefined);
      expect(mockRssService.startTrackerCron).toHaveBeenCalledWith(updatedTracker);
    });

    it('should clamp invalid schedules to 30 mins during update', async () => {
      mockUpdateTracker.mockResolvedValue({ id: 1, active: false });

      const response = await request(app).put('/api/json/trackers/1').send({
        schedule: '*/5 * * * *',
      });

      expect(response.status).toBe(200);
      expect(mockUpdateTracker).toHaveBeenCalledWith(1, undefined, '*/30 * * * *', undefined);
    });

    it('should handle errors gracefully', async () => {
      mockUpdateTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).put('/api/json/trackers/1').send({});
      expect(response.status).toBe(500);
    });
  });

  describe('deleteTracker', () => {
    it('should delete tracker and stop its cron', async () => {
      mockDeleteTracker.mockResolvedValue(true);
      const response = await request(app).delete('/api/json/trackers/1');

      expect(response.status).toBe(204);
      expect(mockDeleteTracker).toHaveBeenCalledWith(1);
      expect(mockRssService.stopTrackerCron).toHaveBeenCalledWith(1);
    });

    it('should handle errors gracefully', async () => {
      mockDeleteTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).delete('/api/json/trackers/1');
      expect(response.status).toBe(500);
    });
  });

  describe('toggleTracker', () => {
    it('should toggle on and start cron', async () => {
      const updated = { id: 1, active: true };
      mockToggleTracker.mockResolvedValue(updated);

      const response = await request(app).put('/api/json/trackers/1/toggle').send({ active: true });

      expect(response.status).toBe(200);
      expect(mockToggleTracker).toHaveBeenCalledWith(1, true);
      expect(mockRssService.startTrackerCron).toHaveBeenCalledWith(updated);
    });

    it('should toggle off and stop cron', async () => {
      const updated = { id: 1, active: false };
      mockToggleTracker.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/json/trackers/1/toggle')
        .send({ active: false });

      expect(response.status).toBe(200);
      expect(mockToggleTracker).toHaveBeenCalledWith(1, false);
      expect(mockRssService.stopTrackerCron).toHaveBeenCalledWith(1);
    });

    it('should handle errors gracefully', async () => {
      mockToggleTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).put('/api/json/trackers/1/toggle').send({ active: true });
      expect(response.status).toBe(500);
    });
  });
});
