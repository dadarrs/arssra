import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TorznabController } from './torznab.controller';

const mockGetTorrents = vi.fn();
const mockCountTorrents = vi.fn();
const mockSearchTorrents = vi.fn();
const mockCountSearchTorrents = vi.fn();

vi.mock('../repositories/torrent.repository', () => {
  return {
    TorrentRepository: class {
      getTorrents = mockGetTorrents;
      countTorrents = mockCountTorrents;
      searchTorrents = mockSearchTorrents;
      countSearchTorrents = mockCountSearchTorrents;
    },
  };
});

describe('TorznabController', () => {
  let app: express.Application;
  let controller: TorznabController;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    controller = new TorznabController();
    app.get('/api', controller.handleRequest);
    app.get('/api/json/torrents', controller.getJsonTorrents);
    app.get('/api/download', controller.proxyDownload);
  });

  describe('getJsonTorrents', () => {
    it('should return paginated JSON torrents without search', async () => {
      mockGetTorrents.mockResolvedValue([{ title: 'Test 1' }]);
      mockCountTorrents.mockResolvedValue(1);

      const res = await request(app).get('/api/json/torrents?limit=10&offset=5');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(5);

      expect(mockGetTorrents).toHaveBeenCalledWith(10, 5);
      expect(mockCountTorrents).toHaveBeenCalled();
    });

    it('should search JSON torrents with q param', async () => {
      mockSearchTorrents.mockResolvedValue([{ title: 'Batman' }]);
      mockCountSearchTorrents.mockResolvedValue(1);

      const res = await request(app).get('/api/json/torrents?q=batman');

      expect(res.status).toBe(200);
      expect(res.body.items[0].title).toBe('Batman');
      expect(mockSearchTorrents).toHaveBeenCalledWith('batman', undefined, 50, 0);
      expect(mockCountSearchTorrents).toHaveBeenCalledWith('batman', undefined);
    });
  });

  describe('handleRequest XML generation', () => {
    it('should generate XML for empty search', async () => {
      mockGetTorrents.mockResolvedValue([]);
      mockCountTorrents.mockResolvedValue(0);

      const res = await request(app).get('/api?t=search');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<torznab:response offset="0" total="0"/>');
      expect(mockGetTorrents).toHaveBeenCalledWith(50, 0, undefined);
    });

    it('should generate XML for populated search with items', async () => {
      mockGetTorrents.mockResolvedValue([
        {
          title: 'Test Movie',
          guid: '123',
          link: 'http://test',
          pubDate: new Date('2024-01-01').toISOString(),
          size: 1024,
          category: '2040',
          enclosure_url: 'http://dl',
        },
      ]);
      mockCountTorrents.mockResolvedValue(1);

      const res = await request(app).get('/api?t=search');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<title>Test Movie</title>');
      expect(res.text).toContain('<category>2000</category>');
      expect(res.text).toContain('<category>2040</category>');
      expect(res.text).toContain('/download?url=http%3A%2F%2Fdl');
      expect(res.text).toContain('length="1024" type="application/x-bittorrent"');
    });

    it('should generate XML using tvsearch', async () => {
      mockSearchTorrents.mockResolvedValue([]);
      mockCountSearchTorrents.mockResolvedValue(0);

      const res = await request(app).get('/api?t=tvsearch&q=Show');
      expect(res.status).toBe(200);
      expect(mockSearchTorrents).toHaveBeenCalledWith('Show', undefined, 50, 0, undefined);
    });

    it('should fallback to default list if t is missing and q is missing', async () => {
      mockGetTorrents.mockResolvedValue([]);
      mockCountTorrents.mockResolvedValue(0);

      const res = await request(app).get('/api');
      expect(res.status).toBe(200);
      expect(mockGetTorrents).toHaveBeenCalledWith(50, 0, undefined);
    });
  });

  describe('proxyDownload', () => {
    it('should return 400 if url is missing', async () => {
      const res = await request(app).get('/api/download');
      expect(res.status).toBe(400);
      expect(res.text).toBe('Missing url parameter');
    });

    it('should return 400 for invalid protocols', async () => {
      const res = await request(app).get('/api/download?url=file:///etc/passwd');
      expect(res.status).toBe(400);
      expect(res.text).toBe('Invalid protocol');
    });

    it('should proxy successful download and forward headers', async () => {
      const mockBuffer = new ArrayBuffer(8);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/x-bittorrent',
          'content-disposition': 'attachment; filename="test.torrent"',
        }),
        arrayBuffer: vi.fn().mockResolvedValue(mockBuffer),
      });

      const res = await request(app).get('/api/download?url=http://tracker.com/file.torrent');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/x-bittorrent');
      expect(res.headers['content-disposition']).toBe('attachment; filename="test.torrent"');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://tracker.com/file.torrent',
        expect.any(Object),
      );
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const res = await request(app).get('/api/download?url=http://tracker.com/notfound');

      expect(res.status).toBe(404);
      expect(res.text).toBe('Error fetching torrent: Not Found');
    });
  });
});
