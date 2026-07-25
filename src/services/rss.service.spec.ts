import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RssService } from './rss.service';

describe('RssService', () => {
  let service: any; // Use any to access private methods for testing

  beforeEach(() => {
    service = new RssService();
  });

  describe('determineCategory', () => {
    it('should correctly identify Sports categories', () => {
      expect(service.determineCategory('Sport / SD / 500 MiB')).toBe('5060');
      expect(service.determineCategory('sport / 1080p / 2 GiB')).toBe('5060');
    });

    it('should correctly identify Anime categories', () => {
      expect(service.determineCategory('Anime / HD / 1 GiB')).toBe('5070');
    });

    it('should correctly identify Documentary categories', () => {
      expect(service.determineCategory('Documentary / SD / 1 GiB')).toBe('5080');
      expect(service.determineCategory('Factual / 1080 / 1 GiB')).toBe('5080');
    });

    it('should correctly identify Audio/Radio categories', () => {
      expect(service.determineCategory('Radio / MP3 / 50 MiB')).toBe('3010');
      expect(service.determineCategory('MP3 / something / 5 MiB')).toBe('3010');
    });

    it('should correctly map Movies based on quality (HD/SD)', () => {
      expect(service.determineCategory('Movie / 1080p / 5 GiB')).toBe('2040'); // HD
      expect(service.determineCategory('Movie / 720p / 3 GiB')).toBe('2040'); // HD
      expect(service.determineCategory('Movie / SD / 1 GiB')).toBe('2030'); // SD
      expect(service.determineCategory('Movie / 480p / 1 GiB')).toBe('2030'); // SD
      expect(service.determineCategory('Movie / Unknown / 1 GiB')).toBe('2000'); // Default
    });

    it('should correctly map TV shows based on quality (HD/SD)', () => {
      expect(service.determineCategory('TV / 1080i / 2 GiB')).toBe('5040'); // HD
      expect(service.determineCategory('Entertainment / 720p / 1 GiB')).toBe('5040'); // HD
      expect(service.determineCategory('Comedy / SD / 500 MiB')).toBe('5030'); // SD
      expect(service.determineCategory('Drama / 480p / 500 MiB')).toBe('5030'); // SD
      expect(service.determineCategory('Soaps / Unknown / 500 MiB')).toBe('5000'); // Default
    });

    it('should return Unknown for unmapped categories', () => {
      expect(service.determineCategory('Random / SD / 50 MiB')).toBe('Unknown');
      expect(service.determineCategory('GarbageStringWithoutSlashes')).toBe('Unknown');
    });
  });

  describe('extractEnclosureData', () => {
    it('should extract size from enclosure length if present', () => {
      const item = {
        enclosure: { length: '1048576', type: 'application/x-bittorrent', url: 'http://test' },
      };
      const result = service.extractEnclosureData(item, 'Some description');

      expect(result.size).toBe(1048576);
      expect(result.enclosure_url).toBe('http://test');
      expect(result.enclosure_type).toBe('application/x-bittorrent');
      expect(result.enclosure_length).toBe(1048576);
    });

    it('should parse GiB sizes from description if enclosure length is missing', () => {
      const item = {};
      const result = service.extractEnclosureData(item, 'Movie / 1080p / 2.5 GiB');

      expect(result.size).toBe(Math.floor(2.5 * 1024 * 1024 * 1024));
    });

    it('should parse MiB sizes from description', () => {
      const item = {};
      const result = service.extractEnclosureData(item, 'TV / SD / 500.5 MiB');

      expect(result.size).toBe(Math.floor(500.5 * 1024 * 1024));
    });

    it('should parse KB sizes from description', () => {
      const item = {};
      const result = service.extractEnclosureData(item, 'Documentary / SD / 800 KB');

      expect(result.size).toBe(Math.floor(800 * 1024));
    });

    it('should return 0 size if no enclosure and no match in description', () => {
      const item = {};
      const result = service.extractEnclosureData(item, 'Unknown format without size');

      expect(result.size).toBe(0);
    });
  });

  describe('Cron and Fetch logic', () => {
    it('should stop tracking cron jobs when requested', () => {
      const mockStop = vi.fn();
      service.cronJobs.set(99, { stop: mockStop });

      service.stopTrackerCron(99);

      expect(mockStop).toHaveBeenCalled();
      expect(service.cronJobs.has(99)).toBe(false);
    });

    it('should fail cleanly if processTorrentItem lacks guid', async () => {
      const item = { title: 'No GUID' };
      const res = await service.processTorrentItem(item, 'TestTracker');
      expect(res).toBe(false);
    });
  });
});
