import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { ProwlarrSyncModal } from './prowlarr-sync-modal';

describe('ProwlarrSyncModal', () => {
  let component: ProwlarrSyncModal;
  let fixture: ComponentFixture<ProwlarrSyncModal>;
  let mockApiService: any;
  let mockDialogRef: any;

  beforeEach(async () => {
    mockApiService = {
      syncProwlarr: vi.fn().mockReturnValue(of({ message: 'Success!' }))
    };
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProwlarrSyncModal],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { hasActiveTrackers: true } }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ProwlarrSyncModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and inherit data', () => {
    expect(component).toBeTruthy();
    expect(component.hasActiveTrackers).toBe(true);
  });

  it('should sync successfully', () => {
    component.prowlarrUrl = 'http://test';
    component.prowlarrApiKey = '123';
    component.arssraUrl = 'http://arssra';
    component.syncToProwlarr();

    expect(mockApiService.syncProwlarr).toHaveBeenCalledWith({
      prowlarrUrl: 'http://test',
      prowlarrApiKey: '123',
      arssraUrl: 'http://arssra'
    });
    expect(component.prowlarrSyncStatus).toBe('success');
    expect(component.prowlarrSyncMessage).toBe('Success!');
  });

  it('should handle sync errors', () => {
    mockApiService.syncProwlarr.mockReturnValue(throwError(() => ({ error: { error: 'Failed' } })));
    component.prowlarrUrl = 'http://test';
    component.prowlarrApiKey = '123';
    component.arssraUrl = 'http://arssra';
    component.syncToProwlarr();

    expect(component.prowlarrSyncStatus).toBe('error');
    expect(component.prowlarrSyncMessage).toBe('Failed');
  });
});
