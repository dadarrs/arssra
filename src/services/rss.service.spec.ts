import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTorznabCategory } from '../trackers/core';
import { TRACKERS } from '../trackers/definitions';
import { RssService } from './rss.service';

describe('RssService', () => {
  let service: any; // Use any to access private methods for testing

  beforeEach(() => {
    service = new RssService();
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

describe('Tracker Definitions', () => {
  describe('resolveTorznabCategory', () => {
    it('should correctly identify Sports categories', () => {
      expect(resolveTorznabCategory('sport', 'sd')).toBe('5060');
    });

    it('should correctly identify Anime categories', () => {
      expect(resolveTorznabCategory('anime', 'hd')).toBe('5070');
    });

    it('should correctly identify Documentary categories', () => {
      expect(resolveTorznabCategory('documentary', 'sd')).toBe('5080');
      expect(resolveTorznabCategory('factual', '1080')).toBe('5080');
    });

    it('should correctly identify Audio/Radio categories', () => {
      expect(resolveTorznabCategory('radio', 'mp3')).toBe('3010');
    });

    it('should correctly map Movies based on quality (HD/SD)', () => {
      expect(resolveTorznabCategory('movie', '1080p')).toBe('2040'); // HD
      expect(resolveTorznabCategory('movie', 'sd')).toBe('2030'); // SD
      expect(resolveTorznabCategory('movie', 'unknown')).toBe('2000'); // Default
    });

    it('should correctly map TV shows based on quality (HD/SD)', () => {
      expect(resolveTorznabCategory('tv', '1080i')).toBe('5040'); // HD
      expect(resolveTorznabCategory('comedy', 'sd')).toBe('5030'); // SD
      expect(resolveTorznabCategory('soaps', 'unknown')).toBe('5000'); // Default
    });

    it('should return Unknown for unmapped categories', () => {
      expect(resolveTorznabCategory('random', 'sd')).toBe('Unknown');
    });
  });

  describe('TV Chaos UK Parser', () => {
    const parser = TRACKERS.find((t) => t.id === 'tvchaosuk')?.parser;

    it('should extract from description', () => {
      expect(parser?.parseCategory({}, 'Movie / 1080p / 5 GiB')).toBe('2040');
      expect(parser?.parseCategory({}, 'Documentary / SD / 1 GiB')).toBe('5080');
    });
  });

  describe('TV Vault Parser', () => {
    const parser = TRACKERS.find((t) => t.id === 'tvvault')?.parser;

    it('should extract from categories and title', () => {
      const item = { title: 'Some Show (1080p) (1991)', categories: ['Comedy', 'Family'] };
      expect(parser?.parseCategory(item, 'desc')).toBe('5040');

      const itemSd = { title: 'Some Show SD', categories: 'Drama' };
      expect(parser?.parseCategory(itemSd, 'desc')).toBe('5030');
    });
  });
});
