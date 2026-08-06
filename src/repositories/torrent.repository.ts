import prisma from '../config/db.config';

export class TorrentRepository {
  public async upsertTorrent(data: any): Promise<void> {
    if (!data.imdbId && data.description) {
      const match = data.description.match(/\[imdb=(tt\d+)\]/i);
      if (match) {
        data.imdbId = match[1];
      }
    }

    const existing = await prisma.torrent.findUnique({
      where: { guid: data.guid },
    });
    if (existing) {
      await prisma.torrent.update({ where: { id: existing.id }, data });
    } else {
      await prisma.torrent.create({ data });
    }
  }

  public async getTorrents(limit: number, offset: number, categories?: string[]) {
    let where: any = undefined;
    if (categories && categories.length > 0) {
      where = {
        OR: categories.map((cat) =>
          cat.endsWith('000') ? { category: { startsWith: cat[0] } } : { category: cat },
        ),
      };
    }
    return await prisma.torrent.findMany({
      where,
      orderBy: { pubDate: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  public async countTorrents(categories?: string[]) {
    let where: any = undefined;
    if (categories && categories.length > 0) {
      where = {
        OR: categories.map((cat) =>
          cat.endsWith('000') ? { category: { startsWith: cat[0] } } : { category: cat },
        ),
      };
    }
    return await prisma.torrent.count({ where });
  }

  public async searchTorrents(
    query: string | undefined,
    imdbid: string | undefined,
    limit: number,
    offset: number,
    categories?: string[],
  ) {
    const where: any = {};
    if (query) where.title = { contains: query };
    if (imdbid) where.imdbId = imdbid;

    if (categories && categories.length > 0) {
      where.OR = categories.map((cat) =>
        cat.endsWith('000') ? { category: { startsWith: cat[0] } } : { category: cat },
      );
    }
    return await prisma.torrent.findMany({
      where,
      orderBy: { pubDate: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  public async countSearchTorrents(
    query: string | undefined,
    imdbid: string | undefined,
    categories?: string[],
  ) {
    const where: any = {};
    if (query) where.title = { contains: query };
    if (imdbid) where.imdbId = imdbid;

    if (categories && categories.length > 0) {
      where.OR = categories.map((cat) =>
        cat.endsWith('000') ? { category: { startsWith: cat[0] } } : { category: cat },
      );
    }
    return await prisma.torrent.count({ where });
  }

  public async getCountsByTracker(): Promise<Record<string, number>> {
    const counts = await prisma.torrent.groupBy({
      by: ['trackerName'],
      _count: {
        _all: true,
      },
    });

    return counts.reduce(
      (acc, curr) => {
        if (curr.trackerName) {
          acc[curr.trackerName] = curr._count._all;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
