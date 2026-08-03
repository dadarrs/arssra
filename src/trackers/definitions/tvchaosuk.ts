import { TrackerDefinition, resolveTorznabCategory } from '../core';

export const tvchaosukTracker: TrackerDefinition = {
  id: 'tvchaosuk',
  name: 'TV Chaos UK',
  description: 'Broadcasting the best of British',
  placeholderUrl: 'https://tvchaosuk.com/rss/123.aBcDeFgHiJkLmNoPqRsT',
  infoHtml: `You can get your custom RSS feed URL from <a href="https://tvchaosuk.com/rss/index" target="_blank" rel="noopener noreferrer">https://tvchaosuk.com/rss/index</a>.`,
  parser: {
    parseCategory: (item: any, desc: string) => {
      const parts = desc.split('/');
      const catString = parts.length > 0 ? parts[0].toLowerCase() : '';
      const qualString = parts.length > 1 ? parts[1].toLowerCase() : '';
      return resolveTorznabCategory(catString, qualString);
    },
    rewriteDownloadUrl: (originalDownloadUrl: string, trackerRssUrl: string) => {
      try {
        const rssUrlParts = trackerRssUrl.split('/').filter(Boolean);
        const rssHashStr = rssUrlParts.at(-1);
        if (!rssHashStr?.includes('.')) return originalDownloadUrl;

        const currentHash = rssHashStr.split('.')[1];

        const dlUrl = new URL(originalDownloadUrl);
        const dlParts = dlUrl.pathname.split('/').filter(Boolean);
        const dlEndPart = dlParts.at(-1);

        if (dlEndPart?.includes('.')) {
          const torrentId = dlEndPart.split('.')[0];
          dlParts[dlParts.length - 1] = `${torrentId}.${currentHash}`;
          dlUrl.pathname = '/' + dlParts.join('/');
          return dlUrl.toString();
        }

        return originalDownloadUrl;
      } catch {
        return originalDownloadUrl;
      }
    },
  },
};
