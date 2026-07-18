import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let httpTestingController: HttpTestingController;
  let fixture: any;
  let component: DashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    
    // Stub the dialog to avoid rendering issues in tests
    vi.spyOn(component.dialog, 'open').mockReturnValue({} as any);
    vi.spyOn(component.dialog, 'closeAll');
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
    component.ngOnInit();
    expectInitialLoads();
    expect(component.torrentsDataSource.data).toEqual([]);
    expect(component.trackersDataSource.data).toEqual([]);
  });

  describe('Search and Pagination', () => {
    beforeEach(() => {
      component.ngOnInit();
      expectInitialLoads();
    });

    it('should debounce search input', () => {
      vi.useFakeTimers();
      component.onSearchModel('test search');
      vi.advanceTimersByTime(150);
      component.onSearchModel('test search updated');
      vi.advanceTimersByTime(300); // Only one request should fire after debounce
      
      const req = httpTestingController.expectOne('/api/json/torrents?q=test%20search%20updated');
      req.flush({ items: [{ id: 1 }], totalCount: 1 });
      expect(component.torrentsDataSource.data).toHaveLength(1);
      vi.useRealTimers();
    });

    it('should clear search', () => {
      component.searchQuery = 'something';
      component.clearSearch();
      expect(component.searchQuery).toBe('');
      
      const req = httpTestingController.expectOne('/api/json/torrents');
      req.flush({ items: [], totalCount: 0 });
    });

    it('should load more torrents if not at end', () => {
      component.torrentsDataSource.data = [{ id: 1 }];
      component.totalCount = 10;
      component.hasMoreData = true;
      component.searchQuery = 'query';
      
      component.loadMoreTorrents();
      expect(component.isLoadingMore).toBe(true);
      
      const req = httpTestingController.expectOne('/api/json/torrents?q=query&offset=1');
      req.flush({ items: [{ id: 2 }], totalCount: 10 });
      
      expect(component.torrentsDataSource.data).toHaveLength(2);
      expect(component.isLoadingMore).toBe(false);
      expect(component.hasMoreData).toBe(true);
    });

    it('should stop loading more when all items loaded', () => {
      component.torrentsDataSource.data = [{ id: 1 }];
      component.totalCount = 1;
      component.hasMoreData = true;
      
      component.loadMoreTorrents(); // Will return early
      expect(component.hasMoreData).toBe(false);
      httpTestingController.expectNone('/api/json/torrents?offset=1');
    });
  });

  describe('Tracker Management', () => {
    beforeEach(() => {
      component.ngOnInit();
      expectInitialLoads();
      // Inject some mock definitions
      component.definitions = [{ id: 'tvchaosuk', name: 'TV Chaos UK' }];
    });

    it('should toggle tracker', () => {
      component.toggleTracker(5, false);
      const req = httpTestingController.expectOne('/api/json/trackers/5/toggle');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ active: false });
      req.flush({});
      
      // Followed by a fetchTrackers
      httpTestingController.expectOne('/api/json/trackers').flush([]);
    });

    it('should prompt to delete and then confirm delete', () => {
      component.deleteTracker(10);
      expect(component.trackerToDelete).toBe(10);
      expect(component.dialog.open).toHaveBeenCalled();
      
      component.confirmDelete();
      const req = httpTestingController.expectOne('/api/json/trackers/10');
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      
      httpTestingController.expectOne('/api/json/trackers').flush([]);
      expect(component.dialog.closeAll).toHaveBeenCalled();
      expect(component.trackerToDelete).toBeNull();
    });

    it('should open Add Tracker dialog and clear fields', () => {
      component.editingTrackerId = 5;
      component.newTrackerName = 'Old';
      component.openAddTrackerDialog();
      expect(component.editingTrackerId).toBeNull();
      expect(component.newTrackerName).toBe('');
      expect(component.dialog.open).toHaveBeenCalled();
    });

    it('should populate fields when Edit Tracker is opened', () => {
      component.editTracker({ id: 9, name: 'TV Chaos UK', definitionId: 'tvchaosuk', url: 'http://test', cronSchedule: '0 * * * *' });
      expect(component.editingTrackerId).toBe(9);
      expect(component.newTrackerDefId).toBe('tvchaosuk');
      expect(component.newTrackerName).toBe('TV Chaos UK');
      expect(component.dialog.open).toHaveBeenCalled();
    });

    it('should update name on definition select', () => {
      component.newTrackerDefId = 'tvchaosuk';
      component.newTrackerName = '';
      component.onDefinitionSelect();
      expect(component.newTrackerName).toBe('TV Chaos UK');
    });

    it('should save new tracker', () => {
      component.editingTrackerId = null;
      component.newTrackerDefId = 'tvchaosuk';
      component.newTrackerName = 'TV Chaos UK';
      component.newTrackerUrl = 'http://test';
      component.newTrackerSchedule = '0 * * * *';
      
      component.saveTracker();
      
      const req = httpTestingController.expectOne('/api/json/trackers');
      expect(req.request.method).toBe('POST');
      req.flush({});
      
      httpTestingController.expectOne('/api/json/trackers').flush([]);
      expect(component.dialog.closeAll).toHaveBeenCalled();
    });

    it('should save edited tracker', () => {
      component.editingTrackerId = 7;
      component.newTrackerDefId = 'tvchaosuk';
      component.newTrackerName = 'TV Chaos UK';
      component.newTrackerUrl = 'http://test';
      component.newTrackerSchedule = '0 * * * *';
      
      component.saveTracker();
      
      const req = httpTestingController.expectOne('/api/json/trackers/7');
      expect(req.request.method).toBe('PUT');
      req.flush({});
      
      httpTestingController.expectOne('/api/json/trackers').flush([]);
    });
  });

  describe('Formatters', () => {
    it('formatSize should handle boundaries', () => {
      expect(component.formatSize(0)).toBe('Unknown');
      expect(component.formatSize(500)).toBe('500 B');
      expect(component.formatSize(1024)).toBe('1.00 KB');
      expect(component.formatSize(1024 * 1024)).toBe('1.00 MB');
      expect(component.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(component.formatSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
    });

    it('formatCategory should handle known and unknown IDs', () => {
      expect(component.formatCategory('2000')).toBe('Movies (2000)');
      expect(component.formatCategory('5070')).toBe('Anime (5070)');
      expect(component.formatCategory('9999')).toBe('9999');
      expect(component.formatCategory('')).toBe('Unknown');
    });

    it('formatDate should format safely', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      expect(component.formatDate(date.toISOString())).toContain('2024'); // locale specific, but should not throw
    });
  });

  describe('Edge cases and Uncovered branches', () => {
    beforeEach(() => {
      component.ngOnInit();
      expectInitialLoads();
    });

    it('should ignore scroll if loading more or no more data', () => {
      component.isLoadingMore = true;
      component.onScroll(); // should do nothing
      expect(component.isLoadingMore).toBe(true); // Still true, no state change
      
      component.isLoadingMore = false;
      component.hasMoreData = false;
      component.onScroll(); // should do nothing
    });

    it('should trigger loadMore on scroll if near bottom', () => {
      component.hasMoreData = true;
      component.isLoadingMore = false;
      component.totalCount = 100;
      component.torrentsDataSource.data = [{ id: 1 }];
      
      // Stub DOM measurements
      Object.defineProperty(document.documentElement, 'scrollTop', { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, 'offsetHeight', { value: 1000, configurable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
      
      component.onScroll();
      
      const req = httpTestingController.expectOne('/api/json/torrents?offset=1');
      req.flush({ items: [], totalCount: 100 });
      expect(component.isLoadingMore).toBe(false);
    });

    it('should not save tracker if missing required fields', () => {
      component.newTrackerName = '';
      component.saveTracker();
      httpTestingController.expectNone('/api/json/trackers'); // should return early
      expect(component.dialog.closeAll).not.toHaveBeenCalled(); // Explicit assertion
    });

    it('should debounce search input from native event', () => {
      vi.useFakeTimers();
      component.onSearch({ target: { value: 'event search' } });
      vi.advanceTimersByTime(300);
      
      const req = httpTestingController.expectOne('/api/json/torrents?q=event%20search');
      req.flush({ items: [], totalCount: 0 });
      expect(component.searchQuery).toBe('event search');
      vi.useRealTimers();
    });
  });
});
