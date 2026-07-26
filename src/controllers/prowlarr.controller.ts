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

      // Validate and clean Prowlarr URL
      let cleanProwlarrUrl = '';
      try {
        const parsed = new URL(prowlarrUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('Invalid protocol');
        }
        cleanProwlarrUrl = parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
        if (cleanProwlarrUrl.endsWith('/')) {
          cleanProwlarrUrl = cleanProwlarrUrl.slice(0, -1);
        }
      } catch {
        return res
          .status(400)
          .json({ error: 'Invalid prowlarrUrl. Must be a valid HTTP or HTTPS URL.' });
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

      let response;
      if (existingIndexer) {
        // UPDATE existing indexer (PUT)
        const updatePayload = { ...existingIndexer };
        updatePayload.enable = true;

        // Safely update just the fields we care about, preserving the rest
        if (Array.isArray(updatePayload.fields)) {
          updatePayload.fields.forEach((field: any) => {
            if (field.name === 'baseUrl') field.value = cleanArssraUrl;
            if (field.name === 'apiPath') field.value = '/api';
            if (field.name === 'apiKey') field.value = '';
          });
        }

        response = await fetch(`${cleanProwlarrUrl}/api/v1/indexer/${existingIndexer.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': prowlarrApiKey,
          },
          body: JSON.stringify(updatePayload),
        });
      } else {
        // CREATE new indexer (POST)
        const createPayload = {
          enable: true,
          name: 'arssra',
          implementation: 'Torznab',
          configContract: 'TorznabSettings',
          appProfileId: 1,
          priority: 25,
          fields: [
            { name: 'baseUrl', value: cleanArssraUrl },
            { name: 'apiPath', value: '/api' },
            { name: 'apiKey', value: '' },
          ],
          tags: [],
        };

        response = await fetch(`${cleanProwlarrUrl}/api/v1/indexer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': prowlarrApiKey,
          },
          body: JSON.stringify(createPayload),
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
