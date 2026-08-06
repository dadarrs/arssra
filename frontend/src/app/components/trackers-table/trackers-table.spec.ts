import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { TrackersTable } from './trackers-table';

describe('TrackersTable', () => {
  let component: TrackersTable;
  let fixture: ComponentFixture<TrackersTable>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      getTrackers: vi.fn().mockReturnValue(of([{ id: 1, name: 'Tracker A', active: true }])),
      toggleTracker: vi.fn().mockReturnValue(of({})),
      deleteTracker: vi.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [TrackersTable],
      providers: [
        { provide: ApiService, useValue: mockApiService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(TrackersTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and fetch trackers', () => {
    expect(component).toBeTruthy();
    expect(mockApiService.getTrackers).toHaveBeenCalled();
    expect(component.trackersDataSource.data).toHaveLength(1);
    expect(component.hasActiveTrackers).toBe(true);
  });

  it('should call api to toggle tracker', () => {
    component.toggleTracker(1, false);
    expect(mockApiService.toggleTracker).toHaveBeenCalledWith(1, false);
    expect(mockApiService.getTrackers).toHaveBeenCalledTimes(2);
  });
});
