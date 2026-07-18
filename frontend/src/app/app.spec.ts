import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';

describe('App', () => {
  let httpTestingController: HttpTestingController;
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    
    // Stub the dialog to avoid rendering issues in tests
    vi.spyOn(app.dialog, 'open').mockReturnValue({} as any);
    vi.spyOn(app.dialog, 'closeAll');
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  function expectInitialLoads() {
    const reqTorrents = httpTestingController.expectOne('/api/json/torrents');
    reqTorrents.flush({ items: [], totalCount: 0 });

    const reqTrackers = httpTestingController.expectOne('/api/json/trackers');
    reqTrackers.flush([]);

    const reqDefs = httpTestingController.expectOne('/api/json/trackers/definitions');
    reqDefs.flush([{ id: 'def1', name: 'Def 1' }]);
  }

  it('should fetch initial data on init', () => {
    app.ngOnInit();
    expectInitialLoads();
    expect(app.torrentsDataSource.data).toEqual([]);
    expect(app.trackersDataSource.data).toEqual([]);
  });

  describe('Search and Pagination', () => {
    beforeEach(() => {
      app.ngOnInit();
      expectInitialLoads();
    });

    it('should debounce search input', () => {
      vi.useFakeTimers();
      app.onSearchModel('test search');
      vi.advanceTimersByTime(150);
      app.onSearchModel('test search updated');
      vi.advanceTimersByTime(300); // Only one request should fire after debounce
      
      const req = httpTestingController.expectOne('/api/json/torrents?q=test%20search%20updated');
      req.flush({ items: [{ id: 1 }], totalCount: 1 });
      expect(app.torrentsDataSource.data).toHaveLength(1);
      vi.useRealTimers();
    });

    it('should clear search', () => {
      app.searchQuery = 'something';
      app.clearSearch();
      expect(app.searchQuery).toBe('');
      
      const req = httpTestingController.expectOne('/api/json/torrents');
      req.flush({ items: [], totalCount: 0 });
    });

    it('should load more torrents if not at end', () => {
      app.torrentsDataSource.data = [{ id: 1 }];
      app.totalCount = 10;
      app.hasMoreData = true;
      app.searchQuery = 'query';
      
      app.loadMoreTorrents();
      expect(app.isLoadingMore).toBe(true);
      
      const req = httpTestingController.expectOne('/api/json/torrents?q=query&offset=1');
      req.flush({ items: [{ id: 2 }], totalCount: 10 });
      
      expect(app.torrentsDataSource.data).toHaveLength(2);
      expect(app.isLoadingMore).toBe(false);
      expect(app.hasMoreData).toBe(true);
    });

    it('should stop loading more when all items loaded', () => {
      app.torrentsDataSource.data = [{ id: 1 }];
      app.totalCount = 1;
      app.hasMoreData = true;
      
      app.loadMoreTorrents(); // Will return early
      expect(app.hasMoreData).toBe(false);
      httpTestingController.expectNone('/api/json/torrents?offset=1');
    });
  });

  describe('Tracker Management', () => {
    beforeEach(() => {
      app.ngOnInit();
      expectInitialLoads();
      // Inject some mock definitions
      app.definitions = [{ id: 'tvchaosuk', name: 'TV Chaos UK' }];
    });

    it('should toggle tracker', () => {
      app.toggleTracker(5, false);
      const req = httpTestingController.expectOne('/api/json/trackers/5/toggle');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ active: false });
      req.flush({});
      
      // Followed by a fetchTrackers
      httpTestingController.expectOne('/api/json/trackers').flush([]);
    });

    it('should prompt to delete and then confirm delete', () => {
      app.deleteTracker(10);
      expect(app.trackerToDelete).toBe(10);
      expect(app.dialog.open).toHaveBeenCalled();
      
      app.confirmDelete();
      const req = httpTestingController.expectOne('/api/json/trackers/10');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      
      httpTestingController.expectOne('/api/json/trackers').flush([]);
      expect(app.dialog.closeAll).toHaveBeenCalled();
      expect(app.trackerToDelete).toBeNull();
    });

    it('should open Add Tracker dialog and clear fields', () => {
      app.editingTrackerId = 5;
      app.newTrackerName = 'Old';
      app.openAddTrackerDialog();
      expect(app.editingTrackerId).toBeNull();
      expect(app.newTrackerName).toBe('');
      expect(app.dialog.open).toHaveBeenCalled();
    });

    it('should populate fields when Edit Tracker is opened', () => {
      app.editTracker({ id: 9, name: 'TV Chaos UK', definitionId: 'tvchaosuk', url: 'http://test', cronSchedule: '0 * * * *' });
      expect(app.editingTrackerId).toBe(9);
      expect(app.newTrackerDefId).toBe('tvchaosuk');
      expect(app.newTrackerName).toBe('TV Chaos UK');
      expect(app.dialog.open).toHaveBeenCalled();
    });

    it('should update name on definition select', () => {
      app.newTrackerDefId = 'tvchaosuk';
      app.newTrackerName = '';
      app.onDefinitionSelect();
      expect(app.newTrackerName).toBe('TV Chaos UK');
    });

    it('should save new tracker', () => {
      app.editingTrackerId = null;
      app.newTrackerDefId = 'tvchaosuk';
      app.newTrackerName = 'TV Chaos UK';
      app.newTrackerUrl = 'http://test';
      app.newTrackerSchedule = '0 * * * *';
      
      app.saveTracker();
      
      const req = httpTestingController.expectOne('/api/json/trackers');
      expect(req.request.method).toBe('POST');
      req.flush({});
      
      httpTestingController.expectOne('/api/json/trackers').flush([]);
      expect(app.dialog.closeAll).toHaveBeenCalled();
    });

    it('should save edited tracker', () => {
      app.editingTrackerId = 7;
      app.newTrackerDefId = 'tvchaosuk';
      app.newTrackerName = 'TV Chaos UK';
      app.newTrackerUrl = 'http://test';
      app.newTrackerSchedule = '0 * * * *';
      
      app.saveTracker();
      
      const req = httpTestingController.expectOne('/api/json/trackers/7');
      expect(req.request.method).toBe('PUT');
      req.flush({});
      
      httpTestingController.expectOne('/api/json/trackers').flush([]);
    });
  });

  describe('Formatters', () => {
    it('formatSize should handle boundaries', () => {
      expect(app.formatSize(0)).toBe('Unknown');
      expect(app.formatSize(500)).toBe('500 B');
      expect(app.formatSize(1024)).toBe('1.00 KB');
      expect(app.formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(app.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(app.formatSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
    });

    it('formatCategory should handle known and unknown IDs', () => {
      expect(app.formatCategory('2000')).toBe('Movies (2000)');
      expect(app.formatCategory('5070')).toBe('Anime (5070)');
      expect(app.formatCategory('9999')).toBe('9999');
      expect(app.formatCategory('')).toBe('Unknown');
    });

    it('formatDate should format safely', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      expect(app.formatDate(date.toISOString())).toContain('2024'); // locale specific, but should not throw
    });
  });

  describe('Edge cases and Uncovered branches', () => {
    beforeEach(() => {
      app.ngOnInit();
      expectInitialLoads();
    });

    it('should ignore scroll if loading more or no more data', () => {
      app.isLoadingMore = true;
      app.onScroll(); // should do nothing
      expect(app.isLoadingMore).toBe(true); // Still true, no state change
      
      app.isLoadingMore = false;
      app.hasMoreData = false;
      app.onScroll(); // should do nothing
    });

    it('should trigger loadMore on scroll if near bottom', () => {
      app.hasMoreData = true;
      app.isLoadingMore = false;
      app.totalCount = 100;
      app.torrentsDataSource.data = [{ id: 1 }];
      
      // Stub DOM measurements
      Object.defineProperty(document.documentElement, 'scrollTop', { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, 'offsetHeight', { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
      
      app.onScroll();
      
      const req = httpTestingController.expectOne('/api/json/torrents?offset=1');
      req.flush({ items: [], totalCount: 100 });
      expect(app.isLoadingMore).toBe(false);
    });

    it('should not save tracker if missing required fields', () => {
      app.newTrackerName = '';
      app.saveTracker();
      httpTestingController.expectNone('/api/json/trackers'); // should return early
      expect(app.dialog.closeAll).not.toHaveBeenCalled(); // Explicit assertion
    });

    it('should debounce search input from native event', () => {
      vi.useFakeTimers();
      app.onSearch({ target: { value: 'event search' } });
      vi.advanceTimersByTime(300);
      
      const req = httpTestingController.expectOne('/api/json/torrents?q=event%20search');
      req.flush({ items: [], totalCount: 0 });
      expect(app.searchQuery).toBe('event search');
      vi.useRealTimers();
    });
  });
});
