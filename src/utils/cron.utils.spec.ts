import { describe, expect, it } from 'vitest';
import { calculateNextRun } from './cron.utils';

describe('cron.utils', () => {
  describe('calculateNextRun', () => {
    it('should return null if lastRun is falsy', () => {
      expect(calculateNextRun(null, '0 * * * *')).toBeNull();
      expect(calculateNextRun(undefined, '0 * * * *')).toBeNull();
    });

    it.each([
      ['*/30 * * * *', '2024-01-01T12:30:00.000Z'],
      ['0 * * * *', '2024-01-01T13:00:00.000Z'],
      ['0 */2 * * *', '2024-01-01T14:00:00.000Z'],
      ['0 0 * * *', '2024-01-02T12:00:00.000Z'],
      ['* * * * *', '2024-01-01T13:00:00.000Z'], // Unknown cron falls back to +1 hour
    ])('should correctly calculate next run for cron "%s"', (cron, expected) => {
      const start = new Date('2024-01-01T12:00:00.000Z');
      const next = calculateNextRun(start, cron);
      expect(next?.toISOString()).toBe(expected);
    });
  });
});
