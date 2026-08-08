import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackerService } from './tracker.service';

const mockGetAllTrackers = vi.fn().mockResolvedValue([
  {
    id: 1,
    name: 'TV Vault',
    active: true,
    lastRun: new Date('2024-01-01T12:00:00Z'),
    cronSchedule: '0 * * * *',
  },
  {
    id: 2,
    name: 'Other',
    active: false,
    lastRun: new Date('2024-01-01T12:00:00Z'),
    cronSchedule: '0 * * * *',
  },
]);
const mockCreateTracker = vi.fn().mockResolvedValue({ id: 2, active: true });
const mockDeleteTracker = vi.fn().mockResolvedValue(undefined);
const mockUpdateTracker = vi.fn().mockResolvedValue({ id: 3, active: true });
const mockToggleTracker = vi.fn().mockResolvedValue({ id: 4, active: false });

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

const mockGetCountsByTracker = vi.fn().mockResolvedValue({
  'TV Vault': 50,
});

vi.mock('../repositories/torrent.repository', () => {
  return {
    TorrentRepository: class {
      getCountsByTracker = mockGetCountsByTracker;
    },
  };
});

describe('TrackerService', () => {
  let service: TrackerService;
  let rssService: any;

  beforeEach(() => {
    rssService = {
      startTrackerCron: vi.fn(),
      stopTrackerCron: vi.fn(),
    };
    service = new TrackerService(rssService as any);
  });

  it('should get all trackers with calculated nextRun for active trackers only', async () => {
    const trackers = await service.getAllTrackers();
    expect(trackers).toHaveLength(2);

    // Active tracker should have nextRun calculated
    expect(trackers[0].nextRun?.toISOString()).toBe('2024-01-01T13:00:00.000Z');
    expect(trackers[0].torrentCount).toBe(50);

    // Inactive tracker should return null for nextRun
    expect(trackers[1].nextRun).toBeNull();
    expect(trackers[1].torrentCount).toBe(0);
  });

  it('should start cron when creating active tracker', async () => {
    await service.createTracker({ name: 'Test', url: 'http', cronSchedule: '*/30 * * * *' });
    expect(rssService.startTrackerCron).toHaveBeenCalledWith({ id: 2, active: true });
  });

  it('should stop cron when deleting tracker', async () => {
    await service.deleteTracker(1);
    expect(rssService.stopTrackerCron).toHaveBeenCalledWith(1);
  });

  it('should start cron when updating active tracker', async () => {
    await service.updateTracker(3, 'url', '0 * * * *', 'name');
    expect(rssService.startTrackerCron).toHaveBeenCalledWith({ id: 3, active: true });
  });

  it('should stop cron when toggling tracker to inactive', async () => {
    await service.toggleTracker(4, false);
    expect(rssService.stopTrackerCron).toHaveBeenCalledWith(4);
  });
});
