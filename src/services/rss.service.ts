import cron, { ScheduledTask } from 'node-cron';
import Parser from 'rss-parser';
import { TorrentRepository } from '../repositories/torrent.repository';
import { TrackerRepository } from '../repositories/tracker.repository';
import { resolveTorznabCategory } from '../trackers/core';
import { TRACKERS } from '../trackers/definitions';

export class RssService {
  private readonly parser: Parser;
  private readonly torrentRepo: TorrentRepository;
  private readonly trackerRepo: TrackerRepository;
  private readonly cronJobs: Map<number, ScheduledTask> = new Map();

  constructor() {
    this.parser = new Parser({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    this.torrentRepo = new TorrentRepository();
    this.trackerRepo = new TrackerRepository();
  }

  public async fetchAndStore(tracker: { id: number; url: string; name: string }): Promise<void> {
    try {
      console.log(`[${tracker.name}] Fetching RSS feed from: ${tracker.url}`);
      const feed = await this.parser.parseURL(tracker.url);
      let addedCount = 0;

      for (const item of feed.items) {
        const added = await this.processTorrentItem(item, tracker.name);
        if (added) addedCount++;
      }

      await this.trackerRepo.updateLastRun(tracker.id, 'Success', addedCount, null);
      console.log(`[${tracker.name}] Successfully fetched feed. Added ${addedCount} new torrents.`);
    } catch (error: any) {
      await this.trackerRepo.updateLastRun(tracker.id, 'Failed', 0, error.message);
      console.error(
        `[${tracker.name}] Error fetching RSS feed from ${tracker.url}:`,
        error.message,
      );
    }
  }

  private async processTorrentItem(item: any, trackerName: string): Promise<boolean> {
    const desc = item.contentSnippet || item.content || item.description || '';
    const guid = item.guid || item.id || item.link;
    if (!guid) return false;

    const { enclosure_url, enclosure_type, enclosure_length, size } = this.extractEnclosureData(
      item,
      desc,
    );

    let category: string;
    const def = TRACKERS.find((t) => t.name === trackerName);
    if (def?.parser?.parseCategory) {
      category = def.parser.parseCategory(item, desc);
    } else {
      const catString = desc ? desc.toLowerCase() : '';
      const qualString = item.title ? item.title.toLowerCase() : '';
      category = resolveTorznabCategory(catString, qualString);
    }

    try {
      const initialCount = await this.torrentRepo.countTorrents();
      await this.torrentRepo.upsertTorrent({
        title: item.title || 'Unknown Title',
        guid: guid,
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        description: desc,
        size: size,
        enclosure_url: enclosure_url,
        enclosure_type: enclosure_type,
        enclosure_length: enclosure_length,
        trackerName: trackerName,
        category: category,
        comments: item.comments || null,
      });

      const newCount = await this.torrentRepo.countTorrents();
      return newCount > initialCount;
    } catch (err: any) {
      console.error(`[${trackerName}] Error inserting torrent ${guid}:`, err.message);
      return false;
    }
  }

  private extractEnclosureData(item: any, desc: string) {
    let enclosure_url: string | null = null;
    let enclosure_type: string | null = null;
    let enclosure_length: number | null = null;
    let size = 0;

    if (item.enclosure) {
      enclosure_url = item.enclosure.url || null;
      enclosure_type = item.enclosure.type || null;
      enclosure_length = item.enclosure.length ? Number(item.enclosure.length) : null;
      size = enclosure_length || 0;
    }

    if (!size && desc) {
      const match = new RegExp(/(\d{1,10}(?:\.\d{1,5})?)\s{0,5}([KMGT]i?B)/i).exec(desc);
      if (match) {
        const val = Number.parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        if (unit.includes('K')) size = val * 1024;
        else if (unit.includes('M')) size = val * 1024 * 1024;
        else if (unit.includes('G')) size = val * 1024 * 1024 * 1024;
        else if (unit.includes('T')) size = val * 1024 * 1024 * 1024 * 1024;
        size = Math.floor(size);
      }
    }
    return { enclosure_url, enclosure_type, enclosure_length, size };
  }

  public async initializeCronJobs() {
    const trackers = await this.trackerRepo.getActiveTrackers();
    console.log(`Initializing cron jobs for ${trackers.length} active trackers.`);
    for (const t of trackers) {
      this.startTrackerCron(t);
    }
  }

  public startTrackerCron(tracker: {
    id: number;
    name: string;
    url: string;
    cronSchedule: string;
    lastRun?: Date | null;
  }) {
    if (this.cronJobs.has(tracker.id)) {
      this.cronJobs.get(tracker.id)?.stop();
    }

    console.log(
      `Setting up RSS fetch cron for [${tracker.name}] with schedule: ${tracker.cronSchedule}`,
    );

    // Initial fetch only if it hasn't run recently
    let shouldFetchNow = true;
    if (tracker.lastRun) {
      const msSinceLastRun = Date.now() - new Date(tracker.lastRun).getTime();
      const thirtyMins = 25 * 60 * 1000;
      if (msSinceLastRun < thirtyMins) {
        shouldFetchNow = false;
        console.log(
          `[${tracker.name}] Skipping immediate fetch on startup (ran ${Math.floor(msSinceLastRun / 60000)} mins ago)`,
        );
      }
    }

    if (shouldFetchNow) {
      this.fetchAndStore(tracker);
    }

    const task = cron.schedule(tracker.cronSchedule, () => {
      this.fetchAndStore(tracker);
    });

    this.cronJobs.set(tracker.id, task);
  }

  public stopTrackerCron(id: number) {
    if (this.cronJobs.has(id)) {
      this.cronJobs.get(id)?.stop();
      this.cronJobs.delete(id);
      console.log(`Stopped cron job for tracker ID: ${id}`);
    }
  }
}
