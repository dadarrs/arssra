import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackerController } from './tracker.controller';

const mockTrackerService = {
  getAllTrackers: vi.fn(),
  createTracker: vi.fn(),
  deleteTracker: vi.fn(),
  updateTracker: vi.fn(),
  toggleTracker: vi.fn(),
};

describe('TrackerController', () => {
  let app: express.Application;
  let controller: TrackerController;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());

    controller = new TrackerController(mockTrackerService as any);

    app.get('/api/json/trackers/schedules', controller.getSchedules);
    app.get('/api/json/trackers', controller.getAllTrackers);
    app.post('/api/json/trackers', controller.createTracker);
    app.put('/api/json/trackers/:id', controller.updateTracker);
    app.delete('/api/json/trackers/:id', controller.deleteTracker);
    app.put('/api/json/trackers/:id/toggle', controller.toggleTracker);
  });

  describe('getSchedules', () => {
    it('should return valid schedules array', async () => {
      const response = await request(app).get('/api/json/trackers/schedules');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('value');
      expect(response.body[0]).toHaveProperty('label');
    });
  });

  describe('getAllTrackers', () => {
    it('should return mapped trackers from service', async () => {
      const trackers = [{ id: 1, name: 'T1' }];
      mockTrackerService.getAllTrackers.mockResolvedValue(trackers);

      const response = await request(app).get('/api/json/trackers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(trackers);
    });

    it('should handle errors gracefully', async () => {
      mockTrackerService.getAllTrackers.mockRejectedValue(new Error('DB Error'));
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
      mockTrackerService.createTracker.mockResolvedValue({ id: 1, active: true });

      const response = await request(app).post('/api/json/trackers').send({
        definitionId: 'tvchaosuk',
        url: 'http://test',
        schedule: '*/15 * * * *', // Too frequent
      });

      expect(response.status).toBe(201);
      expect(mockTrackerService.createTracker).toHaveBeenCalledWith({
        name: 'TV Chaos UK',
        url: 'http://test',
        cronSchedule: '*/30 * * * *',
        allowApi: false,
      });
    });

    it('should successfully pass create to service', async () => {
      const newTracker = { id: 1, active: true, name: 'TV Chaos UK' };
      mockTrackerService.createTracker.mockResolvedValue(newTracker);

      const response = await request(app).post('/api/json/trackers').send({
        definitionId: 'tvchaosuk',
        url: 'http://test',
        schedule: '0 * * * *',
      });

      expect(response.status).toBe(201);
      expect(mockTrackerService.createTracker).toHaveBeenCalled();
    });

    it('should return 500 on service failure', async () => {
      mockTrackerService.createTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).post('/api/json/trackers').send({
        definitionId: 'tvchaosuk',
        url: 'http://test',
      });
      expect(response.status).toBe(500);
    });
  });

  describe('updateTracker', () => {
    it('should successfully update tracker', async () => {
      const updatedTracker = { id: 1, active: true };
      mockTrackerService.updateTracker.mockResolvedValue(updatedTracker);

      const response = await request(app).put('/api/json/trackers/1').send({
        url: 'http://newurl',
        schedule: '0 * * * *',
      });

      expect(response.status).toBe(200);
      expect(mockTrackerService.updateTracker).toHaveBeenCalledWith(
        1,
        'http://newurl',
        '0 * * * *',
        undefined,
        undefined,
      );
    });

    it('should clamp invalid schedules to 30 mins during update', async () => {
      mockTrackerService.updateTracker.mockResolvedValue({ id: 1, active: false });

      const response = await request(app).put('/api/json/trackers/1').send({
        schedule: '*/5 * * * *',
      });

      expect(response.status).toBe(200);
      expect(mockTrackerService.updateTracker).toHaveBeenCalledWith(
        1,
        undefined,
        '*/30 * * * *',
        undefined,
        undefined,
      );
    });

    it('should handle errors gracefully', async () => {
      mockTrackerService.updateTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).put('/api/json/trackers/1').send({});
      expect(response.status).toBe(500);
    });
  });

  describe('deleteTracker', () => {
    it('should delete tracker', async () => {
      mockTrackerService.deleteTracker.mockResolvedValue(true);
      const response = await request(app).delete('/api/json/trackers/1');

      expect(response.status).toBe(204);
      expect(mockTrackerService.deleteTracker).toHaveBeenCalledWith(1);
    });

    it('should handle errors gracefully', async () => {
      mockTrackerService.deleteTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).delete('/api/json/trackers/1');
      expect(response.status).toBe(500);
    });
  });

  describe('toggleTracker', () => {
    it('should toggle on', async () => {
      const updated = { id: 1, active: true };
      mockTrackerService.toggleTracker.mockResolvedValue(updated);

      const response = await request(app).put('/api/json/trackers/1/toggle').send({ active: true });

      expect(response.status).toBe(200);
      expect(mockTrackerService.toggleTracker).toHaveBeenCalledWith(1, true);
    });

    it('should toggle off', async () => {
      const updated = { id: 1, active: false };
      mockTrackerService.toggleTracker.mockResolvedValue(updated);

      const response = await request(app)
        .put('/api/json/trackers/1/toggle')
        .send({ active: false });

      expect(response.status).toBe(200);
      expect(mockTrackerService.toggleTracker).toHaveBeenCalledWith(1, false);
    });

    it('should handle errors gracefully', async () => {
      mockTrackerService.toggleTracker.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).put('/api/json/trackers/1/toggle').send({ active: true });
      expect(response.status).toBe(500);
    });
  });
});
