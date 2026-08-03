import { TrackerDefinition, resolveTorznabCategory } from '../core';

export const tvvaultTracker: TrackerDefinition = {
  id: 'tvvault',
  name: 'TV Vault',
  description: 'A classic TV torrent tracker',
  placeholderUrl:
    'https://tv-vault.me/feeds.php?feed=torrents_all&user=12345&auth=0a1b2c3d&passkey=0a1b2c3d&authkey=0a1b2c3d',
  infoHtml: `To get your RSS feed URL, go to the <a href="https://tv-vault.me/index.php" target="_blank" rel="noopener noreferrer">home page</a> and view the page source. Look for the line ending in <code>title="TV Vault - All Torrents"</code> which looks like: <br/><code>&lt;link rel="alternate" type="application/rss+xml" href="/feeds.php?feed=torrents_all..." title="TV Vault - All Torrents" /&gt;</code><br/>Right-click on the <code>/feeds.php</code> link part in the href attribute and select "Copy link address" to copy the complete URL to your clipboard.<br><br><strong>Note:</strong> TV Vault rotates their keys often (specifically the <code>authkey</code>), so this URL will need to be updated periodically.`,
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
        const rssUrl = new URL(trackerRssUrl);
        const dlUrl = new URL(originalDownloadUrl);

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
  },
};
