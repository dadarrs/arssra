import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { AddTrackerModal } from './add-tracker-modal';

describe('AddTrackerModal', () => {
  let component: AddTrackerModal;
  let fixture: ComponentFixture<AddTrackerModal>;
  let mockApiService: any;
  let mockDialogRef: any;

  beforeEach(async () => {
    mockApiService = {
      getTrackerDefinitions: vi.fn().mockReturnValue(of([{ id: 'def1', name: 'Def 1' }])),
      getTrackerSchedules: vi.fn().mockReturnValue(of([{ id: 'sch1', name: 'Schedule 1' }])),
      createTracker: vi.fn().mockReturnValue(of({})),
      updateTracker: vi.fn().mockReturnValue(of({}))
    };
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddTrackerModal],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AddTrackerModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load definitions', () => {
    expect(component).toBeTruthy();
    expect(mockApiService.getTrackerDefinitions).toHaveBeenCalled();
    expect(mockApiService.getTrackerSchedules).toHaveBeenCalled();
    expect(component.definitions).toHaveLength(1);
  });

  it('should save a new tracker', () => {
    component.newTrackerDefId = 'def1';
    component.newTrackerName = 'Test Tracker';
    component.newTrackerUrl = 'http://test';
    component.newTrackerSchedule = '*/5 * * * *';
    component.saveTracker();

    expect(mockApiService.createTracker).toHaveBeenCalledWith({
      definitionId: 'def1',
      name: 'Test Tracker',
      url: 'http://test',
      schedule: '*/5 * * * *',
      allowApi: false
    });
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
