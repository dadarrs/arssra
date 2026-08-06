import { Request, Response } from 'express';
import { create } from 'xmlbuilder2';
import { TorrentRepository } from '../repositories/torrent.repository';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TorznabSearchQuery, resolveTorznabCategory } from '../trackers/core';
import { TRACKERS } from '../trackers/definitions';

export class TorznabController {
  private readonly repository: TorrentRepository;
  private readonly trackerRepo: TrackerRepository;

  constructor() {
    this.repository = new TorrentRepository();
    this.trackerRepo = new TrackerRepository();
    this.handleRequest = this.handleRequest.bind(this);
    this.getJsonTorrents = this.getJsonTorrents.bind(this);
    this.proxyDownload = this.proxyDownload.bind(this);
  }

  private getPubDateString(item: any): string {
    let pubDateStr = new Date().toUTCString();
    if (item.pubDate) {
      const parsedDate = new Date(item.pubDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        pubDateStr = parsedDate.toUTCString();
      }
    } else if (item.created_at) {
      const parsedDate = new Date(item.created_at);
      if (!Number.isNaN(parsedDate.getTime())) {
        pubDateStr = parsedDate.toUTCString();
      }
    }
    return pubDateStr;
  }

  private getItemSize(item: any): number | undefined {
    let itemSize = item.size;
    if (!itemSize || itemSize === 0) {
      const def = TRACKERS.find((t) => t.name === item.trackerName);
      if (def?.parser?.parseSize) {
        itemSize = def.parser.parseSize(item, item.description || '');
      }
    }
    return itemSize;
  }

  private getDownloadUrl(item: any, trackerUrlMap: Map<string, string>): string | undefined {
    let originalDownloadUrl = item.enclosure_url || item.link;
    if (originalDownloadUrl && item.trackerName) {
      const currentTrackerUrl = trackerUrlMap.get(item.trackerName);
      const def = TRACKERS.find((t) => t.name === item.trackerName);
      if (def?.parser?.rewriteDownloadUrl && currentTrackerUrl) {
        originalDownloadUrl = def.parser.rewriteDownloadUrl(originalDownloadUrl, currentTrackerUrl);
      }
    }
    return originalDownloadUrl;
  }

  private generateTorznabResponse(
    req: Request,
    items: any[],
    offset: number,
    totalCount: number,
    trackerUrlMap: Map<string, string>,
  ): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('rss', {
        version: '2.0',
        'xmlns:atom': 'http://www.w3.org/2005/Atom',
        'xmlns:torznab': 'http://torznab.com/schemas/2015/feed',
        'xmlns:newznab': 'http://www.newznab.com/DTD/2005/newznab',
      })
      .ele('channel')
      .ele('title')
      .txt('arssra')
      .up()
      .ele('description')
      .txt('Automated RSS to Torznab')
      .up()
      .ele('link')
      .txt(`${req.protocol}://${req.get('host')}${req.baseUrl}`)
      .up()
      .ele('language')
      .txt('en-us')
      .up()
      .ele('category')
      .txt('search')
      .up()
      .ele('torznab:response', {
        offset: offset.toString(),
        total: totalCount.toString(),
      })
      .up();

    items.forEach((item) => {
      const pubDateStr = this.getPubDateString(item);
      const itemSize = this.getItemSize(item);
      const originalDownloadUrl = this.getDownloadUrl(item, trackerUrlMap);
      const proxiedUrl = originalDownloadUrl
        ? `${req.protocol}://${req.get('host')}${req.baseUrl}/download?url=${encodeURIComponent(originalDownloadUrl)}`
        : null;

      const itemCategoryStr = item.category || '2000';
      const parentCategory = itemCategoryStr.length === 4 ? itemCategoryStr[0] + '000' : '2000';

      const itemNode = root
        .ele('item')
        .ele('title')
        .txt(item.title)
        .up()
        .ele('guid')
        .txt(item.guid)
        .up()
        .ele('link')
        .txt(proxiedUrl || item.link)
        .up()
        .ele('comments')
        .txt(item.comments || item.guid)
        .up()
        .ele('pubDate')
        .txt(pubDateStr)
        .up()
        .ele('size')
        .txt(itemSize?.toString() || '0')
        .up();

      itemNode
        .ele('category')
        .txt(parentCategory)
        .up()
        .ele('category')
        .txt(itemCategoryStr)
        .up()
        .ele('description')
        .txt(item.description || '')
        .up();

      if (proxiedUrl) {
        itemNode
          .ele('enclosure', {
            url: proxiedUrl,
            length: item.enclosure_length?.toString() || itemSize?.toString() || '0',
            type: item.enclosure_type || 'application/x-bittorrent',
          })
          .up();
      }

      itemNode.ele('torznab:attr', { name: 'category', value: itemCategoryStr }).up();
      itemNode.ele('newznab:attr', { name: 'category', value: itemCategoryStr }).up();

      if (parentCategory !== itemCategoryStr) {
        itemNode.ele('torznab:attr', { name: 'category', value: parentCategory }).up();
        itemNode.ele('newznab:attr', { name: 'category', value: parentCategory }).up();
      }

      itemNode.ele('torznab:attr', { name: 'seeders', value: (item.seeders ?? 1).toString() }).up();
      itemNode.ele('torznab:attr', { name: 'peers', value: (item.peers ?? 1).toString() }).up();
      itemNode.ele('newznab:attr', { name: 'seeders', value: (item.seeders ?? 1).toString() }).up();
      itemNode.ele('newznab:attr', { name: 'peers', value: (item.peers ?? 1).toString() }).up();
      itemNode.up();
    });

    return root.end({ prettyPrint: true });
  }

  private generateCaps(res: Response) {
    const caps = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('caps')
      .ele('server', {
        version: '1.0',
        title: 'RSS to Torznab',
        strapline: '...',
      })
      .up()
      .ele('limits', { max: '100', default: '50' })
      .up()
      .ele('retention', { days: '1000' })
      .up()
      .ele('registration', { available: 'no', open: 'no' })
      .up()
      .ele('searching')
      .ele('search', { available: 'yes', supportedParams: 'q,cat' })
      .up()
      .ele('tv-search', { available: 'yes', supportedParams: 'q,season,ep,cat' })
      .up()
      .ele('movie-search', { available: 'yes', supportedParams: 'q,imdbid,cat' })
      .up()
      .up()
      .ele('categories')
      .ele('category', { id: '2000', name: 'Movies' })
      .ele('subcat', { id: '2030', name: 'Movies/SD' })
      .up()
      .ele('subcat', { id: '2040', name: 'Movies/HD' })
      .up()
      .up()
      .ele('category', { id: '3000', name: 'Audio' })
      .ele('subcat', { id: '3010', name: 'Audio/MP3' })
      .up()
      .ele('subcat', { id: '3030', name: 'Audio/Audiobook' })
      .up()
      .up()
      .ele('category', { id: '5000', name: 'TV' })
      .ele('subcat', { id: '5030', name: 'TV/SD' })
      .up()
      .ele('subcat', { id: '5040', name: 'TV/HD' })
      .up()
      .ele('subcat', { id: '5060', name: 'TV/Sport' })
      .up()
      .ele('subcat', { id: '5070', name: 'Anime' })
      .up()
      .ele('subcat', { id: '5080', name: 'TV/Documentary' })
      .up()
      .up()
      .up();
    res.set('Content-Type', 'text/xml');
    return res.send(caps.end({ prettyPrint: true }));
  }

  private async processApiItem(item: any, def: any) {
    if (!item.category || item.category === 'Unknown') {
      if (def.parser.parseCategory) {
        item.category = def.parser.parseCategory(item, item.description || '');
      } else {
        const catString = item.description ? item.description.toLowerCase() : '';
        const qualString = item.title ? item.title.toLowerCase() : '';
        item.category = resolveTorznabCategory(catString, qualString);
      }
    }
    try {
      await this.repository.upsertTorrent({
        title: item.title,
        guid: item.guid,
        link: item.link,
        pubDate: item.pubDate,
        description: item.description,
        size: item.size,
        trackerName: item.trackerName,
        category: item.category,
        comments: item.comments,
        seeders: item.seeders,
        peers: item.peers,
      });
    } catch (e) {
      console.error('Failed to cache API torrent', e);
    }
  }

  private async handleApiSearchError(e: any, tracker: any) {
    if (e.message?.startsWith('COOLDOWN:')) {
      const seconds = Number.parseInt(e.message.split(':')[1], 10);
      const cooldownUntil = new Date(Date.now() + seconds * 1000);
      console.log(`Setting API cooldown for ${tracker.name} until ${cooldownUntil}`);
      await this.trackerRepo.setApiCooldown(tracker.id, cooldownUntil);
    } else {
      console.error(`API search failed for ${tracker.name}`, e);
    }
  }

  private async performApiSearch(
    searchQuery: TorznabSearchQuery,
    activeTrackers: any[],
  ): Promise<any[]> {
    const remoteResults: any[] = [];
    for (const tracker of activeTrackers) {
      if (!tracker.allowApi) continue;

      if (tracker.apiCooldownUntil && new Date() < tracker.apiCooldownUntil) {
        console.log(
          `Skipping API search for ${tracker.name} due to active cooldown until ${tracker.apiCooldownUntil}`,
        );
        continue;
      }

      const def = TRACKERS.find((d) => d.name === tracker.name);
      if (def?.parser?.apiSearch) {
        try {
          const apiItems = await def.parser.apiSearch(searchQuery, tracker.url);
          for (const item of apiItems) {
            await this.processApiItem(item, def);
            remoteResults.push(item);
          }
        } catch (e: any) {
          await this.handleApiSearchError(e, tracker);
        }
      }
    }
    return remoteResults;
  }

  public async handleRequest(req: Request, res: Response) {
    const { t, q, cat, offset = '0', limit = '50' } = req.query;
    const parsedOffset = Number.parseInt(offset as string, 10) || 0;
    const parsedLimit = Number.parseInt(limit as string, 10) || 50;

    const categories = typeof cat === 'string' ? cat.split(',') : undefined;

    if (t === 'caps') {
      return this.generateCaps(res);
    }

    let items: any[];
    let totalCount: number;

    const isSearchQuery = t === 'search' || t === 'tvsearch' || t === 'movie' || (!t && q);
    const hasSearchTerm = q || req.query.imdbid;

    if (isSearchQuery && hasSearchTerm) {
      items = await this.repository.searchTorrents(
        q as string | undefined,
        req.query.imdbid as string | undefined,
        parsedLimit,
        parsedOffset,
        categories,
      );
      totalCount = await this.repository.countSearchTorrents(
        q as string | undefined,
        req.query.imdbid as string | undefined,
        categories,
      );

      const trackers = await this.trackerRepo.getAllTrackers();
      const activeTrackers = trackers.filter((tr) => tr.active);
      const searchQuery: TorznabSearchQuery = {
        q: q as string,
        imdbid: req.query.imdbid as string,
        season: req.query.season as string,
        ep: req.query.ep as string,
        categories,
      };

      const remoteResults = await this.performApiSearch(searchQuery, activeTrackers);

      // Merge results avoiding duplicates
      const seenGuids = new Set(items.map((i) => i.guid));
      let newlyAddedCount = 0;
      for (const remote of remoteResults) {
        if (!seenGuids.has(remote.guid)) {
          items.unshift(remote);
          seenGuids.add(remote.guid);
          newlyAddedCount++;
        }
      }
      totalCount += newlyAddedCount;
    } else {
      items = await this.repository.getTorrents(parsedLimit, parsedOffset, categories);
      totalCount = await this.repository.countTorrents(categories);
    }

    const trackers = await this.trackerRepo.getAllTrackers();
    const trackerUrlMap = new Map(trackers.map((t) => [t.name, t.url]));

    const xmlResponse = this.generateTorznabResponse(
      req,
      items,
      parsedOffset,
      totalCount,
      trackerUrlMap,
    );
    res.set('Content-Type', 'text/xml');
    res.send(xmlResponse);
  }

  public async getJsonTorrents(req: Request, res: Response) {
    const { q, offset = '0', limit = '50' } = req.query;
    const parsedOffset = Number.parseInt(offset as string, 10) || 0;
    const parsedLimit = Number.parseInt(limit as string, 10) || 50;

    let items: any[];
    let totalCount: number;

    if (q) {
      items = await this.repository.searchTorrents(
        q as string,
        undefined,
        parsedLimit,
        parsedOffset,
      );
      totalCount = await this.repository.countSearchTorrents(q as string, undefined);
    } else {
      items = await this.repository.getTorrents(parsedLimit, parsedOffset);
      totalCount = await this.repository.countTorrents();
    }

    const trackers = await this.trackerRepo.getAllTrackers();
    const trackerUrlMap = new Map(trackers.map((t) => [t.name, t.url]));

    const rewrittenItems = items.map((item) => {
      let downloadUrl = item.enclosure_url || item.link;
      if (downloadUrl && item.trackerName) {
        const currentTrackerUrl = trackerUrlMap.get(item.trackerName);
        const def = TRACKERS.find((t) => t.name === item.trackerName);
        if (def?.parser?.rewriteDownloadUrl && currentTrackerUrl) {
          downloadUrl = def.parser.rewriteDownloadUrl(downloadUrl, currentTrackerUrl);
        }
      }
      return { ...item, downloadUrl };
    });

    res.json({
      items: rewrittenItems,
      totalCount,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  public async proxyDownload(req: Request, res: Response) {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      // Validating protocol
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).send('Invalid protocol');
      }

      const response = await fetch(targetUrl, {
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

      if (!response.ok) {
        return res.status(response.status).send(`Error fetching torrent: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);

      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      res.status(500).send(`Proxy error: ${error.message}`);
    }
  }
}
