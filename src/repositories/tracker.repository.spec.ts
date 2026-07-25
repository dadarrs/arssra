import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackerRepository } from './tracker.repository';

// Mock the prisma client
const mocks = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('../config/db.config', () => {
  return {
    default: {
      tracker: {
        findMany: mocks.mockFindMany,
        create: mocks.mockCreate,
        update: mocks.mockUpdate,
        delete: mocks.mockDelete,
      },
    },
  };
});

describe('TrackerRepository', () => {
  let repo: TrackerRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TrackerRepository();
  });

  it('getActiveTrackers should find active trackers', async () => {
    mocks.mockFindMany.mockResolvedValue([{ id: 1, active: true }]);
    const result = await repo.getActiveTrackers();
    expect(mocks.mockFindMany).toHaveBeenCalledWith({ where: { active: true } });
    expect(result).toHaveLength(1);
  });

  it('getAllTrackers should find all trackers ordered by id', async () => {
    mocks.mockFindMany.mockResolvedValue([{ id: 1 }]);
    const result = await repo.getAllTrackers();
    expect(mocks.mockFindMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    expect(result).toHaveLength(1);
  });

  it('createTracker should create a tracker', async () => {
    const dto = { name: 'Test', url: 'http://test' };
    mocks.mockCreate.mockResolvedValue({ id: 1, ...dto });
    const result = await repo.createTracker(dto);
    expect(mocks.mockCreate).toHaveBeenCalledWith({ data: dto });
    expect(result.id).toBe(1);
  });

  it('deleteTracker should delete a tracker by id', async () => {
    mocks.mockDelete.mockResolvedValue({ id: 1 });
    await repo.deleteTracker(1);
    expect(mocks.mockDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('updateTracker should partially update tracker fields', async () => {
    mocks.mockUpdate.mockResolvedValue({ id: 1, url: 'http://new' });

    // Only updating URL
    await repo.updateTracker(1, 'http://new');
    expect(mocks.mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { url: 'http://new' },
    });

    // Updating all fields
    await repo.updateTracker(1, 'http://new', '0 * * * *', 'NewName');
    expect(mocks.mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { url: 'http://new', cronSchedule: '0 * * * *', name: 'NewName' },
    });
  });

  it('toggleTracker should toggle active state', async () => {
    mocks.mockUpdate.mockResolvedValue({ id: 1, active: false });
    await repo.toggleTracker(1, false);
    expect(mocks.mockUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { active: false } });
  });

  it('updateLastRun should update execution metrics', async () => {
    mocks.mockUpdate.mockResolvedValue({ id: 1 });
    await repo.updateLastRun(1, 'Success', 5, null);

    expect(mocks.mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        lastStatus: 'Success',
        lastAddedCount: 5,
        lastError: null,
      }),
    });
  });
});
