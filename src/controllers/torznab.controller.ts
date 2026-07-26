import { Request, Response } from 'express';
import { create } from 'xmlbuilder2';
import { TorrentRepository } from '../repositories/torrent.repository';

export class TorznabController {
  private readonly repository: TorrentRepository;

  constructor() {
    this.repository = new TorrentRepository();
    this.handleRequest = this.handleRequest.bind(this);
    this.getJsonTorrents = this.getJsonTorrents.bind(this);
    this.proxyDownload = this.proxyDownload.bind(this);
  }

  private generateTorznabResponse(
    req: Request,
    items: any[],
    offset: number,
    totalCount: number,
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

      const itemNode = root
        .ele('item')
        .ele('title')
        .txt(item.title)
        .up()
        .ele('guid')
        .txt(item.guid)
        .up()
        .ele('link')
        .txt(item.link)
        .up()
        .ele('comments')
        .txt(item.comments || item.link)
        .up()
        .ele('pubDate')
        .txt(pubDateStr)
        .up()
        .ele('size')
        .txt(item.size?.toString() || '0')
        .up();

      const itemCategoryStr = item.category || '2000';
      const parentCategory = itemCategoryStr.length === 4 ? itemCategoryStr[0] + '000' : '2000';

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

      const originalDownloadUrl = item.enclosure_url || item.link;
      if (originalDownloadUrl) {
        const proxiedUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}/download?url=${encodeURIComponent(originalDownloadUrl)}`;
        itemNode
          .ele('enclosure', {
            url: proxiedUrl,
            length: item.enclosure_length?.toString() || item.size?.toString() || '0',
            type: item.enclosure_type || 'application/x-bittorrent',
          })
          .up();
      }

      // Output specific category
      itemNode.ele('torznab:attr', { name: 'category', value: itemCategoryStr }).up();
      itemNode.ele('newznab:attr', { name: 'category', value: itemCategoryStr }).up();

      // Output parent category
      if (parentCategory !== itemCategoryStr) {
        itemNode.ele('torznab:attr', { name: 'category', value: parentCategory }).up();
        itemNode.ele('newznab:attr', { name: 'category', value: parentCategory }).up();
      }

      itemNode.ele('torznab:attr', { name: 'seeders', value: '1' }).up();
      itemNode.ele('torznab:attr', { name: 'peers', value: '1' }).up();
      itemNode.ele('newznab:attr', { name: 'seeders', value: '1' }).up();
      itemNode.ele('newznab:attr', { name: 'peers', value: '1' }).up();
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

    if (t === 'search' || t === 'tvsearch' || t === 'movie' || (!t && q)) {
      if (q) {
        items = await this.repository.searchTorrents(
          q as string,
          parsedLimit,
          parsedOffset,
          categories,
        );
        totalCount = await this.repository.countSearchTorrents(q as string, categories);
      } else {
        items = await this.repository.getTorrents(parsedLimit, parsedOffset, categories);
        totalCount = await this.repository.countTorrents(categories);
      }
    } else {
      items = await this.repository.getTorrents(parsedLimit, parsedOffset, categories);
      totalCount = await this.repository.countTorrents(categories);
    }

    const xmlResponse = this.generateTorznabResponse(req, items, parsedOffset, totalCount);
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
      items = await this.repository.searchTorrents(q as string, parsedLimit, parsedOffset);
      totalCount = await this.repository.countSearchTorrents(q as string);
    } else {
      items = await this.repository.getTorrents(parsedLimit, parsedOffset);
      totalCount = await this.repository.countTorrents();
    }

    res.json({
      items,
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
