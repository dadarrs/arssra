import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { AddTrackerModal } from '../add-tracker-modal/add-tracker-modal';
import { TrackersTable } from './trackers-table';

describe('TrackersTable', () => {
  let component: TrackersTable;
  let fixture: ComponentFixture<TrackersTable>;
  let mockApiService: any;
  let dialogSpy: any;

  beforeEach(async () => {
    mockApiService = {
      getTrackers: vi.fn().mockReturnValue(of([{ id: 1, name: 'Tracker A', active: true, allowApi: true, apiCooldownUntil: new Date(Date.now() + 10000).toISOString(), lastApiAddedCount: 10, lastApiSearchTerm: 'Breaking Bad' }])),
      toggleTracker: vi.fn().mockReturnValue(of({})),
      deleteTracker: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [TrackersTable, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: mockApiService }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TrackersTable);
    component = fixture.componentInstance;
    
    dialogSpy = vi.spyOn((component as any).dialog, 'open').mockReturnValue({
      afterClosed: () => of(true)
    } as any);

    fixture.detectChanges();
  });

  it('should create and fetch trackers', () => {
    expect(component).toBeTruthy();
    expect(mockApiService.getTrackers).toHaveBeenCalled();
    expect(component.trackersDataSource.data).toHaveLength(1);
    expect(component.hasActiveTrackers).toBe(true);
  });

  it('should compute hasActiveTrackers correctly', () => {
    mockApiService.getTrackers.mockReturnValue(of([{ id: 1, name: 'Tracker A', active: false }]));
    component.fetchTrackers();
    expect(component.hasActiveTrackers).toBe(false);
  });

  it('should call api to toggle tracker', () => {
    component.toggleTracker(1, false);
    expect(mockApiService.toggleTracker).toHaveBeenCalledWith(1, false);
    expect(mockApiService.getTrackers).toHaveBeenCalledTimes(2);
  });

  it('should open tracker dialog and reload on close', () => {
    component.openAddTrackerDialog();
    expect(dialogSpy).toHaveBeenCalledWith(AddTrackerModal, { width: '600px', data: { tracker: null } });
    expect(mockApiService.getTrackers).toHaveBeenCalledTimes(2); // 1 initial + 1 reload
  });

  it('isCooldownActive should correctly evaluate cooldowns', () => {
    const activeTracker = { apiCooldownUntil: new Date(Date.now() + 50000).toISOString() };
    expect(component.isCooldownActive(activeTracker)).toBe(true);

    const expiredTracker = { apiCooldownUntil: new Date(Date.now() - 50000).toISOString() };
    expect(component.isCooldownActive(expiredTracker)).toBe(false);

    const noCooldownTracker = { apiCooldownUntil: null };
    expect(component.isCooldownActive(noCooldownTracker)).toBe(false);
  });
});
