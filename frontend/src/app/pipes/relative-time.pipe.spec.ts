import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  it('should format times correctly', () => {
    const pipe = new RelativeTimePipe();
    const now = Date.now();
    
    expect(pipe.transform(null)).toBe('');
    
    // Future times (added 5s buffer to prevent Math.floor rounding down instantly)
    expect(pipe.transform(new Date(now + 2 * 24 * 60 * 60 * 1000 + 5000))).toBe('in 2 days');
    expect(pipe.transform(new Date(now + 3 * 60 * 60 * 1000 + 5000))).toBe('in 3 hrs');
    expect(pipe.transform(new Date(now + 5 * 60 * 1000 + 5000))).toBe('in 5 mins');
    expect(pipe.transform(new Date(now + 10 * 1000 + 5000))).toBe('in a few seconds');
    
    // Past times
    expect(pipe.transform(new Date(now - 2 * 24 * 60 * 60 * 1000 - 5000))).toBe('2 days ago');
    expect(pipe.transform(new Date(now - 3 * 60 * 60 * 1000 - 5000))).toBe('3 hrs ago');
    expect(pipe.transform(new Date(now - 5 * 60 * 1000 - 5000))).toBe('5 mins ago');
    expect(pipe.transform(new Date(now - 10 * 1000 - 5000))).toBe('just now');
  });
});
