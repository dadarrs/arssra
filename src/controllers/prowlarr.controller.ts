import { Request, Response } from 'express';

export class ProwlarrController {
  private parseProwlarrError(errorText: string): string {
    try {
      const parsed = JSON.parse(errorText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].errorMessage) {
        return parsed.map((e: any) => e.errorMessage).join(' | ');
      } else if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // ignore parse error and just use raw text if it's not JSON
    }
    return errorText;
  }

  public async syncToProwlarr(req: Request, res: Response) {
    try {
      const { prowlarrUrl, prowlarrApiKey, arssraUrl } = req.body;

      if (!prowlarrUrl || !prowlarrApiKey || !arssraUrl) {
        return res
          .status(400)
          .json({ error: 'Missing required fields: prowlarrUrl, prowlarrApiKey, arssraUrl' });
      }

      // Clean trailing slashes
      let cleanProwlarrUrl = prowlarrUrl;
      while (cleanProwlarrUrl.endsWith('/')) {
        cleanProwlarrUrl = cleanProwlarrUrl.slice(0, -1);
      }

      let cleanArssraUrl = arssraUrl;
      while (cleanArssraUrl.endsWith('/')) {
        cleanArssraUrl = cleanArssraUrl.slice(0, -1);
      }

      // 1. Fetch existing indexers to check if 'arssra' already exists
      const getResponse = await fetch(`${cleanProwlarrUrl}/api/v1/indexer`, {
        headers: { 'X-Api-Key': prowlarrApiKey },
      });

      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        return res.status(getResponse.status).json({
          error: `Failed to fetch indexers from Prowlarr: ${getResponse.statusText}`,
          details: errorText,
        });
      }

      const indexers: any[] = await getResponse.json();
      const existingIndexer = indexers.find((idx) => idx.name.toLowerCase() === 'arssra');

      const payload: any = {
        enable: true,
        name: 'arssra',
        implementation: 'Torznab',
        configContract: 'TorznabSettings',
        appProfileId: existingIndexer ? existingIndexer.appProfileId || 1 : 1,
        priority: existingIndexer ? existingIndexer.priority || 25 : 25,
        fields: [
          {
            name: 'baseUrl',
            value: cleanArssraUrl,
          },
          {
            name: 'apiPath',
            value: '/api',
          },
          {
            name: 'apiKey',
            value: '',
          },
          {
            name: 'categories',
            value: [2000, 3000, 5000], // Movies, Audio, TV
          },
        ],
        tags: [],
      };

      let response;
      if (existingIndexer) {
        // UPDATE existing indexer (PUT)
        payload.id = existingIndexer.id;

        response = await fetch(`${cleanProwlarrUrl}/api/v1/indexer/${existingIndexer.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': prowlarrApiKey,
          },
          body: JSON.stringify(payload),
        });
      } else {
        // CREATE new indexer (POST)
        response = await fetch(`${cleanProwlarrUrl}/api/v1/indexer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': prowlarrApiKey,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        const conciseError = this.parseProwlarrError(errorText);

        console.error('Failed to sync with Prowlarr:', response.status, conciseError);
        return res
          .status(response.status)
          .json({ error: `Prowlarr error: ${response.statusText}`, details: conciseError });
      }

      const data = await response.json();
      const message = existingIndexer
        ? 'Successfully updated arssra in Prowlarr'
        : 'Successfully added arssra to Prowlarr';
      res.status(existingIndexer ? 200 : 201).json({ message, data });
    } catch (error: any) {
      console.error('Prowlarr sync error:', error);
      res
        .status(500)
        .json({ error: 'Failed to communicate with Prowlarr', details: error.message });
    }
  }
}
