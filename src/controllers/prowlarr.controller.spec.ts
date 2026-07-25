import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProwlarrController } from './prowlarr.controller';

describe('ProwlarrController', () => {
  let app: express.Application;
  let controller: ProwlarrController;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    app = express();
    app.use(express.json());

    controller = new ProwlarrController();

    app.post('/api/json/prowlarr/sync', controller.syncToProwlarr.bind(controller));
  });

  it('should return 400 if required fields are missing', async () => {
    const response = await request(app).post('/api/json/prowlarr/sync').send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  it('should return error if fetching indexers fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: vi.fn().mockResolvedValue('API Key invalid'),
    });

    const response = await request(app).post('/api/json/prowlarr/sync').send({
      prowlarrUrl: 'http://localhost:9696',
      prowlarrApiKey: 'apikey',
      arssraUrl: 'http://localhost:3232',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Failed to fetch indexers');
  });

  it('should POST a new indexer if arssra is not found', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([{ name: 'SomeOtherIndexer' }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ id: 1, name: 'arssra' }),
      });

    const response = await request(app).post('/api/json/prowlarr/sync').send({
      prowlarrUrl: 'http://localhost:9696/', // Test trailing slash removal
      prowlarrApiKey: 'apikey',
      arssraUrl: 'http://localhost:3232',
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Successfully added arssra to Prowlarr');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as any).mock.calls[1][0]).toBe('http://localhost:9696/api/v1/indexer');
    expect((global.fetch as any).mock.calls[1][1].method).toBe('POST');
  });

  it('should PUT an update if arssra is already found', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue([{ id: 10, name: 'arssra', appProfileId: 5, priority: 10 }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 10, name: 'arssra' }),
      });

    const response = await request(app).post('/api/json/prowlarr/sync').send({
      prowlarrUrl: 'http://localhost:9696',
      prowlarrApiKey: 'apikey',
      arssraUrl: 'http://localhost:3232',
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Successfully updated arssra in Prowlarr');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as any).mock.calls[1][0]).toBe('http://localhost:9696/api/v1/indexer/10');
    expect((global.fetch as any).mock.calls[1][1].method).toBe('PUT');
  });

  it('should parse JSON error array and return concise error', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue(JSON.stringify([{ errorMessage: 'Priority invalid' }])),
      });

    const response = await request(app).post('/api/json/prowlarr/sync').send({
      prowlarrUrl: 'http://localhost:9696',
      prowlarrApiKey: 'apikey',
      arssraUrl: 'http://localhost:3232',
    });

    expect(response.status).toBe(400);
    expect(response.body.details).toBe('Priority invalid');
  });

  it('should catch generic errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

    const response = await request(app).post('/api/json/prowlarr/sync').send({
      prowlarrUrl: 'http://localhost:9696',
      prowlarrApiKey: 'apikey',
      arssraUrl: 'http://localhost:3232',
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to communicate with Prowlarr');
  });
});
