export function calculateNextRun(
  lastRun: Date | string | null | undefined,
  cronSchedule: string,
): Date | null {
  if (!lastRun) return null;

  const time = new Date(lastRun).getTime();

  const scheduleMap: Record<string, number> = {
    '*/15 * * * *': 15 * 60000,
    '*/30 * * * *': 30 * 60000,
    '0 * * * *': 60 * 60000,
    '0 */2 * * *': 2 * 60 * 60000,
    '0 */6 * * *': 6 * 60 * 60000,
    '0 */12 * * *': 12 * 60 * 60000,
    '0 0 * * *': 24 * 60 * 60000,
  };

  const offset = scheduleMap[cronSchedule] || 60 * 60000; // Default to 1 hour if unknown
  return new Date(time + offset);
}
