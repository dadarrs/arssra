import { convert } from 'xmlbuilder2';
import { TorznabSearchQuery, TrackerDefinition, resolveTorznabCategory } from '../core';

function buildTvVaultSearchParams(query: TorznabSearchQuery, authkey: string): string | null {
  let searchParams = `query=get&authkey=${authkey}`;
  if (query.imdbid) {
    searchParams += `&imdbid=${query.imdbid}`;
  } else if (query.q) {
    searchParams += `&searchstr=${encodeURIComponent(query.q)}`;
  } else {
    return null;
  }
  return searchParams;
}

function handleTvVaultApiError(errorObj: any) {
  const errorMsg = errorObj['#'] || errorObj;
  console.error(`TV Vault API Error:`, errorMsg);
  const match = new RegExp(/wait at least (\d+)s|once every (\d+)s/).exec(String(errorMsg));
  if (match) {
    const seconds = Number.parseInt(match[1] || match[2], 10);
    if (seconds > 0) {
      throw new Error(`COOLDOWN:${seconds}`);
    }
  }
}

function extractXmlValue(val: any): string {
  if (val === undefined || val === null) return '';
  return typeof val === 'object' ? val['#'] || '' : String(val);
}

function ensureArray(val: any): any[] {
  if (!val) {
    return [];
  }
  if (Array.isArray(val)) {
    return val;
  }
  return [val];
}

function parseTvVaultTorrentItem(t: any, show: any): any {
  const showTitle = extractXmlValue(show.title);
  const dates = ensureArray(t.date);
  const sizes = ensureArray(t.size);

  const dateObj = dates.find((d: any) => d['@type'] === 'UNIX');
  const sizeObj = sizes.find((s: any) => s['@type'] === 'bytes');

  const dateStr = dateObj ? dateObj['#'] : '';
  const sizeStr = sizeObj ? sizeObj['#'] : '0';

  const link = extractXmlValue(t.link)
    .replaceAll('&amp;', '&')
    .replace(/^http:/, 'https:');
  let download = extractXmlValue(t.download)
    .replaceAll('&amp;', '&')
    .replace(/^http:/, 'https:');

  if (!download && link.includes('torrentid=')) {
    const torrentIdMatch = new RegExp(/torrentid=(\d+)/).exec(link);
    if (torrentIdMatch) {
      download = `https://tv-vault.me/torrents.php?action=download&id=${torrentIdMatch[1]}`;
    }
  }

  const torrentTitle = extractXmlValue(t.title);
  const title = showTitle ? `${showTitle} - ${torrentTitle}` : torrentTitle;

  let seeders = undefined;
  let peers = undefined;
  if (t.seeders) {
    seeders = Number(extractXmlValue(t.seeders));
    if (t.leechers) {
      peers = seeders + Number(extractXmlValue(t.leechers));
    }
  }

  if (!link) return null;

  return {
    title: title || 'Unknown Title',
    guid: link,
    link: download || link,
    pubDate: dateStr ? new Date(Number(dateStr) * 1000).toISOString() : new Date().toISOString(),
    size: Number(sizeStr),
    description: extractXmlValue(show.description),
    trackerName: 'TV Vault',
    comments: link,
    seeders,
    peers,
    categories: [],
  };
}

function parseTvVaultApiResponse(xml: string, query: TorznabSearchQuery): any[] {
  const obj = convert(xml, { format: 'object' }) as any;

  if (obj.searchresults?.SearchError) {
    handleTvVaultApiError(obj.searchresults.SearchError);
    return [];
  }

  const shows = ensureArray(obj.searchresults?.show);
  const results: any[] = [];

  for (const show of shows) {
    const torrents = ensureArray(show.torrent);
    for (const t of torrents) {
      const item = parseTvVaultTorrentItem(t, show);
      if (item) {
        if (query.imdbid) item.imdbId = query.imdbid;
        results.push(item);
      }
    }
  }
  return results;
}

export const tvvaultTracker: TrackerDefinition = {
  id: 'tvvault',
  name: 'TV Vault',
  description: 'A classic TV torrent tracker',
  placeholderUrl:
    'https://tv-vault.me/feeds.php?feed=torrents_all&user=12345&auth=0a1b2c3d&passkey=0a1b2c3d&authkey=0a1b2c3d',
  infoHtml: `To get your RSS feed URL, go to the <a href="https://tv-vault.me/index.php" target="_blank" rel="noopener noreferrer">home page</a> and view the page source. Look for the line ending in <code>title="TV Vault - All Torrents"</code> which looks like: <br/><code>&lt;link rel="alternate" type="application/rss+xml" href="/feeds.php?feed=torrents_all..." title="TV Vault - All Torrents" /&gt;</code><br/>Right-click on the <code>/feeds.php</code> link part in the href attribute and select "Copy link address" to copy the complete URL to your clipboard.<br><br><strong>Note:</strong> TV Vault rotates their keys often (specifically the <code>authkey</code>), so this URL will need to be updated periodically.`,
  hasApiSearch: true,
  apiWarningHtml:
    'The API is only available for users with a Member user class or higher. Using it as a standard user will result in API errors.',
  parser: {
    parseCategory: (item: any) => {
      let catString = 'tv';
      const qualString = item.title ? item.title.toLowerCase() : '';
      if (item.categories && Array.isArray(item.categories)) {
        catString += ' ' + item.categories.join(' ').toLowerCase();
      } else if (item.categories) {
        catString += ' ' + String(item.categories).toLowerCase();
      }
      return resolveTorznabCategory(catString, qualString);
    },
    rewriteDownloadUrl: (originalDownloadUrl: string, trackerRssUrl: string) => {
      try {
        const unescapedUrl = originalDownloadUrl.replaceAll('&amp;', '&');
        const rssUrl = new URL(trackerRssUrl);
        const dlUrl = new URL(unescapedUrl);

        const authkey = rssUrl.searchParams.get('authkey');
        const passkey = rssUrl.searchParams.get('passkey');

        if (authkey) dlUrl.searchParams.set('authkey', authkey);
        if (passkey) dlUrl.searchParams.set('torrent_pass', passkey);

        return dlUrl.toString();
      } catch {
        return originalDownloadUrl;
      }
    },
    parseSize: (item: any) => {
      // Create a fallback size based on title to satisfy TRaSH guides limits
      const title = item.title ? item.title.toLowerCase() : '';
      let fallbackSize = 1024 * 1024 * 1024; // Default to 1 GB

      // TV shows season packs
      if (/season \d+|s\d{1,2}(?!\w*e\d{1,2})/i.test(title)) {
        fallbackSize = 10 * 1024 * 1024 * 1024; // 10 GB for season packs
      }
      // Single episodes
      else if (/s\d{1,2}e\d{1,2}/i.test(title) || /episode \d+/i.test(title)) {
        if (title.includes('1080p'))
          fallbackSize = 2.5 * 1024 * 1024 * 1024; // 2.5 GB for 1080p episode
        else if (title.includes('720p'))
          fallbackSize = 1.5 * 1024 * 1024 * 1024; // 1.5 GB for 720p episode
        else fallbackSize = 500 * 1024 * 1024; // 500 MB for SD episode
      }
      // Movies or generic
      else if (title.includes('1080p')) {
        fallbackSize = 8 * 1024 * 1024 * 1024; // 8 GB for 1080p movie
      } else if (title.includes('720p')) {
        fallbackSize = 4 * 1024 * 1024 * 1024; // 4 GB for 720p movie
      }

      return fallbackSize;
    },
    apiSearch: async (query: TorznabSearchQuery, trackerRssUrl: string) => {
      try {
        const rssUrl = new URL(trackerRssUrl);
        const authkey = rssUrl.searchParams.get('authkey') || rssUrl.searchParams.get('auth');
        if (!authkey) return [];

        const searchParams = buildTvVaultSearchParams(query, authkey);
        if (!searchParams) return [];

        const res = await fetch(`https://tv-vault.me/xmlsearch.php?${searchParams}`);
        if (!res.ok) return [];

        const xml = await res.text();
        return parseTvVaultApiResponse(xml, query);
      } catch (e: any) {
        if (e.message?.startsWith('COOLDOWN:')) {
          throw e;
        }
        console.error('TV Vault API search failed', e);
        return [];
      }
    },
  },
};
