export interface TorznabSearchQuery {
  q?: string;
  imdbid?: string;
  season?: string;
  ep?: string;
  categories?: string[];
}

export interface TrackerParser {
  parseCategory: (item: any, desc: string) => string;
  rewriteDownloadUrl?: (originalDownloadUrl: string, trackerRssUrl: string) => string;
  parseSize?: (item: any, desc: string) => number;
  apiSearch?: (query: TorznabSearchQuery, trackerRssUrl: string) => Promise<any[]>;
}

export interface TrackerDefinition {
  id: string;
  name: string;
  description: string;
  placeholderUrl?: string;
  infoHtml?: string;
  hasApiSearch?: boolean;
  apiWarningHtml?: string;
  parser?: TrackerParser;
}

export function getFormatIndex(qualString: string): number {
  if (/hd|1080|720/.test(qualString)) return 0;
  if (/sd|480|576/.test(qualString)) return 1;
  return 2;
}

export function resolveTorznabCategory(catString: string, qualString: string): string {
  if (catString.includes('sport')) return '5060';
  if (catString.includes('anime')) return '5070';
  if (/documentary|factual/.test(catString)) return '5080';
  if (catString.includes('foreign')) return '5020';
  if (catString.includes('radio') || catString.includes('mp3')) return '3010';
  if (
    /soundtrack|original score|ost|flac|audio|music/i.test(catString) ||
    /soundtrack|original score|ost|flac|audio|music/i.test(qualString)
  )
    return '3000';

  const fmt = getFormatIndex(qualString);

  if (catString.includes('movie')) {
    return ['2040', '2030', '2000'][fmt];
  }

  if (
    /tv|news|sci-fi|entertainment|kids|reality|comedy|current affairs|drama|soaps/.test(catString)
  ) {
    return ['5040', '5030', '5000'][fmt];
  }

  return 'Unknown';
}
