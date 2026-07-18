import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { server } from './index';

describe('API Routes', () => {
  describe('GET /api', () => {
    it('should return Torznab capabilities XML when t=caps', async () => {
      const response = await request(server.app).get('/api?t=caps');

      // Should be successful
      expect(response.status).toBe(200);

      // Should return XML
      expect(response.headers['content-type']).toContain('text/xml');

      // Should contain the standard categories
      expect(response.text).toContain('<category id="2000" name="Movies">');
      expect(response.text).toContain('<category id="5000" name="TV">');
      expect(response.text).toContain('<category id="3000" name="Audio">');
    });

    it('should default to t=search if t is omitted but q is provided', async () => {
      // Note: This hits the repository which tries to query Prisma.
      // If the database is empty, it should just return an empty XML feed.
      const response = await request(server.app).get('/api?q=test');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/xml');
      expect(response.text).toContain(
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:torznab="http://torznab.com/schemas/2015/feed" xmlns:newznab="http://www.newznab.com/DTD/2005/newznab">',
      );
    });
  });

  describe('GET /api/json/trackers/definitions', () => {
    it('should return the list of supported tracker definitions', async () => {
      const response = await request(server.app).get('/api/json/trackers/definitions');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const data = response.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id', 'tvchaosuk');
      expect(data[0]).toHaveProperty('name', 'TV Chaos UK');
    });
  });
});
