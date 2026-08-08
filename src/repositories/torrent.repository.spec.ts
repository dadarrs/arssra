import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TorrentRepository } from './torrent.repository';

const mocks = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockGroupBy: vi.fn(),
}));

vi.mock('../config/db.config', () => {
  return {
    default: {
      torrent: {
        findUnique: mocks.mockFindUnique,
        findMany: mocks.mockFindMany,
        count: mocks.mockCount,
        create: mocks.mockCreate,
        update: mocks.mockUpdate,
        groupBy: mocks.mockGroupBy,
      },
    },
  };
});

describe('TorrentRepository', () => {
  let repo: TorrentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TorrentRepository();
  });

  describe('upsertTorrent', () => {
    it('should update existing torrent if found and return false', async () => {
      mocks.mockFindUnique.mockResolvedValue({ id: 1, guid: 'abc' });
      const res = await repo.upsertTorrent({ guid: 'abc', title: 'test' });

      expect(mocks.mockFindUnique).toHaveBeenCalledWith({ where: { guid: 'abc' } });
      expect(mocks.mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { guid: 'abc', title: 'test' },
      });
      expect(mocks.mockCreate).not.toHaveBeenCalled();
      expect(res).toBe(false);
    });

    it('should create new torrent if not found and return true', async () => {
      mocks.mockFindUnique.mockResolvedValue(null);
      const res = await repo.upsertTorrent({ guid: 'abc', title: 'test' });

      expect(mocks.mockFindUnique).toHaveBeenCalledWith({ where: { guid: 'abc' } });
      expect(mocks.mockCreate).toHaveBeenCalledWith({
        data: { guid: 'abc', title: 'test' },
      });
      expect(mocks.mockUpdate).not.toHaveBeenCalled();
      expect(res).toBe(true);
    });
  });

  describe('getTorrents', () => {
    it('should return recent torrents with pagination', async () => {
      mocks.mockFindMany.mockResolvedValue([{ id: 1 }]);
      const res = await repo.getTorrents(50, 0);

      expect(mocks.mockFindMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { pubDate: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(res).toHaveLength(1);
    });

    it('should handle category filtering correctly', async () => {
      mocks.mockFindMany.mockResolvedValue([]);
      await repo.getTorrents(50, 0, ['5000', '2040']);

      expect(mocks.mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [{ category: { startsWith: '5' } }, { category: '2040' }],
        },
        orderBy: { pubDate: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('countTorrents', () => {
    it('should count total torrents', async () => {
      mocks.mockCount.mockResolvedValue(100);
      const res = await repo.countTorrents();
      expect(mocks.mockCount).toHaveBeenCalledWith({ where: undefined });
      expect(res).toBe(100);
    });

    it('should count torrents with category filters', async () => {
      mocks.mockCount.mockResolvedValue(10);
      await repo.countTorrents(['5000']);
      expect(mocks.mockCount).toHaveBeenCalledWith({
        where: { OR: [{ category: { startsWith: '5' } }] },
      });
    });
  });

  describe('searchTorrents', () => {
    it('should search torrents by title', async () => {
      mocks.mockFindMany.mockResolvedValue([]);
      await repo.searchTorrents('test', undefined, 50, 0);

      expect(mocks.mockFindMany).toHaveBeenCalledWith({
        where: { title: { contains: 'test' } },
        orderBy: { pubDate: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should search torrents with categories', async () => {
      mocks.mockFindMany.mockResolvedValue([]);
      await repo.searchTorrents('test', undefined, 50, 0, ['2040']);

      expect(mocks.mockFindMany).toHaveBeenCalledWith({
        where: {
          title: { contains: 'test' },
          OR: [{ category: '2040' }],
        },
        orderBy: { pubDate: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('countSearchTorrents', () => {
    it('should count searched torrents', async () => {
      mocks.mockCount.mockResolvedValue(5);
      const res = await repo.countSearchTorrents('test', undefined, ['2000']);

      expect(mocks.mockCount).toHaveBeenCalledWith({
        where: {
          title: { contains: 'test' },
          OR: [{ category: { startsWith: '2' } }],
        },
      });
      expect(res).toBe(5);
    });
  });

  describe('getCountsByTracker', () => {
    it('should group and return counts by tracker name', async () => {
      mocks.mockGroupBy.mockResolvedValue([
        { trackerName: 'TV Vault', _count: { _all: 50 } },
        { trackerName: 'TV Chaos UK', _count: { _all: 10 } },
      ]);
      const res = await repo.getCountsByTracker();

      expect(mocks.mockGroupBy).toHaveBeenCalledWith({
        by: ['trackerName'],
        _count: { _all: true },
      });
      expect(res['TV Vault']).toBe(50);
      expect(res['TV Chaos UK']).toBe(10);
    });
  });
});
